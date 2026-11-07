// Protocol tests against a running worker (npm run dev in another terminal).
//   node test/protocol.mjs
import assert from 'node:assert/strict';
import { Client, http, rid, sleep } from './client.mjs';

const ADMIN = process.env.ADMIN_KEY ?? 'dev-admin-key-0123456789';
const M = 'iot';
let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.stack}`);
    process.exitCode = 1;
  }
}

const alice = await new Client({ name: 'alice', page: M }).connect();
const bob = await new Client({ name: 'bob', page: M }).connect();

await test('a note added by one client reaches the others', async () => {
  const id = rid(14);
  const seen = new Promise((resolve) => {
    bob.onChange = (n) => n.id === id && resolve(n);
  });
  const ack = await alice.put({ id, matiere: M, parent: 'iot/tp/tp-1-mqtt-en-ligne-de-commande', kind: 'note', title: 'Astuce', body: 'mosquitto_sub -v' });
  assert.equal(ack.t, 'ack', ack.error);
  assert.equal(ack.node.title, 'Astuce');
  assert.equal(ack.node.author, 'alice');
  assert.equal(ack.node.owner, undefined, 'owner hash must never be sent');
  const got = await seen;
  assert.equal(got.body, 'mosquitto_sub -v');
  assert.equal(got.by, ack.node.by);
});

await test('a retried create (same id, same content) creates nothing new', async () => {
  const id = rid(14);
  const node = { id, matiere: M, parent: `m:${M}`, kind: 'note', title: 'Deux fois' };
  const a = await alice.put(node);
  const b = await alice.put(node);
  assert.equal(a.t, 'ack');
  assert.equal(b.t, 'ack');
  assert.equal(a.node.v, b.node.v);
});

await test('only the author can edit; the edit gets a new version', async () => {
  const id = rid(14);
  const a = await alice.put({ id, matiere: M, parent: `m:${M}`, kind: 'note', title: 'v1' });
  const steal = await bob.put({ id, matiere: M, parent: `m:${M}`, kind: 'note', title: 'piraté' });
  assert.equal(steal.t, 'nack');
  assert.match(steal.error, /auteur/);
  const e = await alice.put({ id, matiere: M, parent: `m:${M}`, kind: 'note', title: 'v2' });
  assert.equal(e.t, 'ack');
  assert.equal(e.node.title, 'v2');
  assert.ok(e.node.v > a.node.v);
});

await test('additions stay inside their matière', async () => {
  const cross = await alice.put({ id: rid(14), matiere: M, parent: 'machine-learning/resumes/x', kind: 'note', title: 'x' });
  assert.equal(cross.t, 'nack');
  const other = await alice.put({ id: rid(14), matiere: 'big-data', parent: 'm:big-data', kind: 'note', title: 'ok' });
  assert.equal(other.t, 'ack');
  const underOther = await alice.put({ id: rid(14), matiere: M, parent: other.node.id, kind: 'note', title: 'x' });
  assert.equal(underOther.t, 'nack');
  assert.match(underOther.error, /même matière/);
});

await test('additions can hang off other additions', async () => {
  const top = await bob.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'note', title: 'Question' });
  const reply = await alice.put({ id: rid(14), matiere: M, parent: top.node.id, kind: 'note', body: 'Réponse' });
  assert.equal(reply.t, 'ack', reply.error);
  assert.equal(reply.node.parent, top.node.id);
});

await test('input is validated', async () => {
  const val = await new Client({ name: 'val' }).connect();
  const js = await val.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'lien', url: 'javascript:alert(1)' });
  assert.equal(js.t, 'nack');
  const noUrl = await val.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'lien', title: 'x' });
  assert.equal(noUrl.t, 'nack');
  const empty = await val.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'note' });
  assert.equal(empty.t, 'nack');
  const long = await val.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'note', body: 'x'.repeat(8001) });
  assert.equal(long.t, 'nack');
  const bare = await val.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'lien', url: 'example.org/cours' });
  assert.equal(bare.node.url, 'https://example.org/cours');
  const ctrl = await val.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'note', title: ' a\u0000b ' });
  assert.equal(ctrl.node.title, 'ab');
  val.close();
});

const carol = await new Client({ name: 'carol', page: M }).connect();

await test('deleting: only the author or the admin; tombstones keep replies reachable', async () => {
  const top = await carol.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'note', title: 'à supprimer' });
  const child = await bob.put({ id: rid(14), matiere: M, parent: top.node.id, kind: 'note', title: 'réponse' });
  const no = await bob.del(top.node.id);
  assert.equal(no.t, 'nack');
  const yes = await carol.del(top.node.id);
  assert.equal(yes.t, 'ack');
  assert.equal(yes.node.deleted, 1);
  assert.equal(yes.node.title, '');
  const again = await carol.del(top.node.id);
  assert.equal(again.t, 'ack', 'a retried delete is fine');
  const late = await alice.put({ id: rid(14), matiere: M, parent: top.node.id, kind: 'note', title: 'trop tard' });
  assert.equal(late.t, 'nack');
  const snap = await http('/api/nodes?since=0');
  assert.ok(snap.body.nodes.some((n) => n.id === top.node.id && n.deleted), 'tombstone with a live reply is in the snapshot');
  assert.ok(snap.body.nodes.some((n) => n.id === child.node.id));
  const adminDel = await alice.del(child.node.id, { admin: ADMIN });
  assert.equal(adminDel.t, 'ack', adminDel.error);
});

await test('a new browser gets every deleted ancestor of a live reply', async () => {
  const dan = new Client({ name: 'dan' });
  await dan.connect();
  const a = await dan.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'note', title: 'A' });
  const b = await dan.put({ id: rid(14), matiere: M, parent: a.node.id, kind: 'note', title: 'B' });
  const c = await dan.put({ id: rid(14), matiere: M, parent: b.node.id, kind: 'note', title: 'C' });
  await dan.del(b.node.id);
  await dan.del(a.node.id);
  const snap = await http('/api/nodes?since=0');
  const ids = new Set(snap.body.nodes.map((n) => n.id));
  assert.ok(ids.has(c.node.id) && ids.has(b.node.id) && ids.has(a.node.id), 'A and B (deleted) must come with C so C can be placed');
  const fresh = new Client({ name: 'fresh' });
  await fresh.connect();
  assert.ok(fresh.nodes.has(a.node.id), 'same over the socket');
  fresh.close();
  await dan.del(c.node.id);
  const after = await http('/api/nodes?since=0');
  assert.ok(!after.body.nodes.some((n) => n.id === a.node.id), 'once nothing under it is live, a tombstone is no longer sent');
  dan.close();
});

await test('a reconnecting client only gets what changed since its version', async () => {
  const since = alice.since;
  const id = rid(14);
  await bob.put({ id, matiere: M, parent: `m:${M}`, kind: 'note', title: 'pendant ton absence' });
  const back = new Client({ name: 'alice2', since });
  await back.connect();
  assert.equal(back.nodes.size, 1);
  assert.ok(back.nodes.has(id));
  back.close();
});

await test('HTTP fallback: read and write without a socket', async () => {
  const before = await http('/api/nodes?since=0');
  assert.equal(before.status, 200);
  const id = rid(14);
  const res = await http('/api/op', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: 'put', secret: alice.secret, node: { id, matiere: M, parent: `m:${M}`, kind: 'note', title: 'via http' } }) });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.node.id, id);
  const delta = await http(`/api/nodes?since=${before.body.v}`);
  assert.ok(delta.body.nodes.some((n) => n.id === id));
  const bad = await http('/api/op', { method: 'POST', body: '{nope' });
  assert.equal(bad.status, 400);
});

await test('presence counts unique browsers per matière', async () => {
  const tab2 = await new Client({ cid: alice.cid, page: 'big-data' }).connect();
  await sleep(1600);
  const p = alice.presence;
  assert.ok(p.total >= 3, JSON.stringify(p));
  assert.ok((p.pages[M] ?? 0) >= 3, JSON.stringify(p));
  tab2.close();
  carol.close();
  await sleep(1600);
  assert.ok(alice.presence.total < p.total, `${JSON.stringify(alice.presence)} vs ${JSON.stringify(p)}`);
});

await test('heartbeat ping is answered', async () => {
  const pong = new Promise((resolve) => {
    const prev = bob.ws.onmessage;
    bob.ws.onmessage = (ev) => {
      if (ev.data === 'pong') {
        bob.ws.onmessage = prev;
        resolve();
      } else prev(ev);
    };
  });
  bob.ping();
  await pong;
});

await test('a flooding client is slowed down (429, retry allowed)', async () => {
  const spam = await new Client({ name: 'spam' }).connect();
  const results = await Promise.all(Array.from({ length: 16 }, () => spam.put({ id: rid(14), matiere: M, parent: `m:${M}`, kind: 'note', title: 'spam' })));
  const refused = results.filter((r) => r.t === 'nack');
  assert.ok(refused.length >= 3, `${refused.length} refused`);
  assert.ok(refused.every((r) => r.retry === true));
  spam.close();
});

await test('foreign websites are refused; CORS for the allowed site', async () => {
  const evil = await http('/api/nodes', { headers: { Origin: 'https://evil.example' } });
  assert.equal(evil.status, 403);
  const ok = await http('/api/nodes', { headers: { Origin: 'https://rayen12348.github.io' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), 'https://rayen12348.github.io');
  const local = await http('/api/nodes', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(local.status, 200);
});

await test('export needs the admin key', async () => {
  assert.equal((await http('/api/export')).status, 403);
  const ok = await http(`/api/export?admin=${ADMIN}`);
  assert.equal(ok.status, 200);
  assert.ok(ok.body.nodes.length > 5);
});

await test('a create and an edit sent back to back are applied in order', async () => {
  const fast = await new Client({ name: 'fast' }).connect();
  for (let i = 0; i < 4; i++) {
    const id = rid(14);
    const [a, b] = await Promise.all([
      fast.put({ id, matiere: M, parent: `m:${M}`, kind: 'note', title: 'premier' }),
      fast.put({ id, matiere: M, parent: `m:${M}`, kind: 'note', title: 'deuxième' }),
    ]);
    assert.equal(a.t, 'ack');
    assert.equal(b.t, 'ack');
    const snap = await http(`/api/nodes?since=${a.node.v - 1}`);
    assert.equal(snap.body.nodes.find((n) => n.id === id).title, 'deuxième');
  }
  fast.close();
});

await test('responses carry the database epoch', async () => {
  const r = await http('/api/nodes?since=999999999');
  assert.equal(typeof r.body.epoch, 'number');
  assert.deepEqual(r.body.nodes, []);
});

alice.close();
bob.close();
console.log(`\n${passed} tests passed${process.exitCode ? ' — SOME FAILED' : ''}`);
