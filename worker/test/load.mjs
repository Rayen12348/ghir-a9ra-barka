// Load test: many browsers at once, writing and reading live, then all of them
// dropping and reconnecting together (what happens after a deploy or a Wi-Fi cut).
//   node test/load.mjs [clients=250] [writers=150] [seconds=60]
import { Client, http, rid, sleep } from './client.mjs';

const [CLIENTS = 250, WRITERS = 150, SECONDS = 60] = process.argv.slice(2).map(Number);
const MATIERES = ['iot', 'machine-learning', 'big-data', 'analyse-de-donnees-avec-r', 'applications-reparties', 'securite-informatique', 'entreprenariat'];
const pct = (arr, p) => {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
};
const stats = (arr) => `p50 ${pct(arr, 50)} ms · p95 ${pct(arr, 95)} ms · p99 ${pct(arr, 99)} ms · max ${Math.round(Math.max(...arr))} ms`;

const start = await http('/api/nodes?since=0');
const v0 = start.body.v;
console.log(`server at version ${v0}, ${start.body.nodes.length} nodes · ${CLIENTS} clients, ${WRITERS} writers, ${SECONDS}s`);

// ── 1. everyone connects within ~5 s ─────────────────────────────────
const connectMs = [];
const clients = await Promise.all(Array.from({ length: CLIENTS }, async (_, i) => {
  await sleep(Math.random() * 5000);
  const c = new Client({ name: `élève ${i}`, page: MATIERES[i % MATIERES.length], since: v0 });
  const t = performance.now();
  await c.connect();
  connectMs.push(performance.now() - t);
  return c;
}));
console.log(`connected ${clients.length}: ${stats(connectMs)}`);

// Fan-out latency: when a node arrives at a client, compare with its send time.
const sentAt = new Map();
const fanout = [];
for (const c of clients) {
  const seen = new Set();
  c.onChange = (n) => {
    if (seen.has(n.id)) return; // later edits of the same node
    seen.add(n.id);
    const t = sentAt.get(n.id);
    if (t && Math.random() < 0.05) fanout.push(performance.now() - t);
  };
}

// ── 2. writers add and edit for SECONDS ──────────────────────────────
const ackMs = [];
const nacks = [];
let writes = 0;
const deadline = performance.now() + SECONDS * 1000;
const mine = new Map(); // id -> client
await Promise.all(clients.slice(0, WRITERS).map(async (c, i) => {
  await sleep(Math.random() * 4000);
  const m = c.page;
  while (performance.now() < deadline) {
    const own = [...mine].filter(([, o]) => o === c).map(([id]) => id);
    const edit = own.length && Math.random() < 0.2;
    const id = edit ? own[Math.floor(Math.random() * own.length)] : rid(14);
    const parent = !edit && mine.size && Math.random() < 0.4 ? [...mine.keys()][Math.floor(Math.random() * mine.size)] : `m:${m}`;
    const parentOk = parent.startsWith('m:') || clients.find((x) => x === mine.get(parent))?.page === m;
    const node = { id, matiere: m, parent: parentOk ? parent : `m:${m}`, kind: Math.random() < 0.2 ? 'lien' : 'note', title: `ajout ${i}`, body: 'x'.repeat(50 + Math.floor(Math.random() * 600)), url: 'https://example.org/cours' };
    const t = performance.now();
    if (!edit) sentAt.set(id, t);
    const res = await c.put(node);
    ackMs.push(performance.now() - t);
    writes++;
    if (res.t === 'ack' && !edit) mine.set(id, c);
    if (res.t === 'nack') nacks.push(res.error);
    await sleep(4000 + Math.random() * 8000);
  }
}));
const dur = SECONDS;
console.log(`writes ${writes} (${(writes / dur).toFixed(1)}/s) · ack ${stats(ackMs)}`);
console.log(`fan-out to other browsers (sample): ${stats(fanout)}`);
console.log(`refused: ${nacks.length}${nacks.length ? ` (${[...new Set(nacks)].join(' | ')})` : ''}`);

// ── 3. everyone agrees with the server ───────────────────────────────
await sleep(1500);
const truth = new Map((await http(`/api/nodes?since=${v0}`)).body.nodes.map((n) => [n.id, n.v]));
let diverged = 0;
for (const c of clients) {
  for (const [id, v] of truth) if (c.nodes.get(id)?.v !== v) { diverged++; break; }
}
const closed = clients.filter((c) => c.closed).length;
console.log(`consistency: ${truth.size} nodes changed during the test · ${diverged} client(s) out of sync · ${closed} socket(s) dropped`);

// ── 4. reconnect storm: all drop, all come back within 3 s ──────────
for (const c of clients) c.close();
await sleep(500);
const versionBefore = Math.max(...truth.values());
const extra = await new Client({ name: 'pendant la coupure' }).connect();
const gap = await extra.put({ id: rid(14), matiere: 'iot', parent: 'm:iot', kind: 'note', title: 'écrit pendant la coupure' });
extra.close();
const reconnectMs = [];
const back = await Promise.all(clients.map(async (c) => {
  await sleep(Math.random() * 3000);
  const n = new Client({ cid: c.cid, secret: c.secret, page: c.page, since: versionBefore });
  const t = performance.now();
  await n.connect();
  reconnectMs.push(performance.now() - t);
  return n;
}));
const caughtUp = back.filter((c) => c.nodes.has(gap.node.id)).length;
console.log(`reconnect storm: ${back.length} back · ${stats(reconnectMs)} · ${caughtUp}/${back.length} got the note written during the cut`);
await sleep(1500);
console.log(`presence after storm: ${back[0].presence?.total} online`);
for (const c of back) c.close();

const ok = diverged === 0 && closed === 0 && caughtUp === back.length && nacks.length === 0;
console.log(ok ? '\nLOAD TEST OK' : '\nLOAD TEST FAILED');
process.exit(ok ? 0 : 1);
