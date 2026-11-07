// "Ajouts de la classe": notes and links anyone can add to any node (a matière,
// a document, or another addition), live for everyone on the site.
//
// The server is worker/ (a Cloudflare Worker, see the README). This module keeps
// the session smooth whatever the network does:
//  - what you have already seen is cached, so pages render instantly, even offline;
//  - what you add goes to an outbox in this browser first and is sent (and re-sent)
//    until the server confirms it; every write is idempotent, so retries never duplicate;
//  - the socket reconnects with jittered backoff (no stampede after a cut), answers
//    heartbeats, and falls back to plain HTTP polling where WebSockets are blocked.
import { vault } from './data.js';
import { store, emitter, toast } from './util.js';

const CACHE_KEY = 'collab.cache';
const OUTBOX_KEY = 'collab.outbox';
const CACHE_MAX = 2_500_000; // characters kept in localStorage (≈ 5 MB quota)
const HEARTBEAT = 25_000;
const POLL = 15_000;

const random = (n) => {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map((b) => '0123456789abcdefghijklmnopqrstuvwxyz'[b % 36]).join('');
};

const me = store.get('collab.me', null) ?? { cid: random(16), secret: random(32), by: null };
if (!me.by) {
  // Public tag of my additions (the server derives the same from the secret).
  crypto.subtle?.digest('SHA-256', new TextEncoder().encode(`pub:${me.secret}`)).then((buf) => {
    me.by = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    store.set('collab.me', me);
    collab.events.emit();
  }).catch(() => {});
}
store.set('collab.me', me);

const base = () => String(store.get('collab.url', '') || vault.site?.collab?.url || '').replace(/\/+$/, '');

let ws = null;
let attempts = 0;
let retryTimer = null;
let heartbeat = null;
let lastSeen = 0;
let pollTimer = null;
let page = null;
let saveTimer = null;
let started = false;
let failedOpens = 0;
const inflight = new Set(); // op ids sent and not yet answered
const shadow = new Map(); // id -> server copy while a local change is pending

const cached = store.get(CACHE_KEY, null);
let outbox = store.get(OUTBOX_KEY, []);

export const collab = {
  events: emitter(), // data changed
  status: emitter(), // connection / presence changed
  state: 'off', // off | connecting | online | offline | polling
  online: { total: 0, pages: {} },
  needsCode: false,
  nodes: new Map(),
  v: 0,
  epoch: null,
  get enabled() {
    return Boolean(base());
  },
  get me() {
    return me;
  },
  get pending() {
    return outbox.length;
  },
  get code() {
    return store.get('collab.code', '');
  },
  set code(v) {
    store.set('collab.code', String(v ?? '').trim());
    this.codeRejected = false;
    this.status.emit();
    if (v) flush();
  },
  codeRejected: false,
  get admin() {
    return store.get('collab.admin', '');
  },
  set admin(v) {
    store.set('collab.admin', v);
    this.events.emit();
  },
};

if (cached?.nodes) {
  collab.v = cached.v ?? 0;
  collab.epoch = cached.epoch ?? null;
  for (const n of cached.nodes) collab.nodes.set(n.id, n);
}
for (const op of outbox) applyLocal(op);

// ── Reading ──────────────────────────────────────────────────────────
let index = null;
function reindex() {
  if (index) return index;
  const kids = new Map();
  for (const n of collab.nodes.values()) {
    if (!kids.has(n.parent)) kids.set(n.parent, []);
    kids.get(n.parent).push(n);
  }
  for (const list of kids.values()) list.sort((a, b) => a.created - b.created);
  // A deleted addition stays visible (as a placeholder) only while it has live replies.
  const alive = new Map();
  const visit = (n) => {
    if (alive.has(n.id)) return alive.get(n.id);
    alive.set(n.id, false);
    const any = (kids.get(n.id) ?? []).map(visit).some(Boolean);
    const ok = !n.deleted || any;
    alive.set(n.id, ok);
    return ok;
  };
  collab.nodes.forEach(visit);
  index = { kids, alive };
  return index;
}
collab.events.on(() => {
  index = null;
});

const visible = (n) => reindex().alive.get(n.id);
export const isMine = (n) => Boolean(n && (n.by ? n.by === me.by : n.pending));
export const canDelete = (n) => isMine(n) || Boolean(collab.admin);
export const contribTitle = (n) => {
  if (n.deleted) return 'ajout supprimé';
  if (n.title) return n.title;
  if (n.body) return n.body.replace(/\s+/g, ' ').slice(0, 60) + (n.body.length > 60 ? '…' : '');
  try {
    return new URL(n.url).hostname.replace(/^www\./, '');
  } catch {
    return 'lien';
  }
};

Object.assign(collab, {
  get(id) {
    const n = this.nodes.get(id);
    return n && visible(n) ? n : null;
  },
  children(parent) {
    return (reindex().kids.get(parent) ?? []).filter(visible);
  },
  // Live additions under a node, all depths.
  count(parent) {
    let total = 0;
    for (const c of this.children(parent)) total += (c.deleted ? 0 : 1) + this.count(c.id);
    return total;
  },
  all() {
    return [...this.nodes.values()].filter(visible);
  },
  latest(n = 8) {
    return [...this.nodes.values()].filter((x) => !x.deleted).sort((a, b) => b.created - a.created).slice(0, n);
  },
  // The vault node (a document or the matière) an addition ultimately hangs off.
  root(id) {
    let n = this.nodes.get(id);
    const seen = new Set();
    while (n && this.nodes.has(n.parent) && !seen.has(n.id)) {
      seen.add(n.id);
      n = this.nodes.get(n.parent);
    }
    return n?.parent ?? null;
  },
});

// ── Writing (optimistic, through the outbox) ─────────────────────────
function applyLocal(op) {
  if (op.t === 'put') {
    const prev = collab.nodes.get(op.node.id);
    if (prev && !prev.pending && !shadow.has(prev.id)) shadow.set(prev.id, prev);
    collab.nodes.set(op.node.id, { ...prev, ...op.node, by: prev?.by ?? me.by, created: prev?.created ?? op.at, updated: op.at, v: prev?.v ?? 0, deleted: 0, pending: true });
  } else {
    const prev = collab.nodes.get(op.id);
    if (!prev) return;
    if (!prev.pending && !shadow.has(prev.id)) shadow.set(prev.id, prev);
    collab.nodes.set(op.id, { ...prev, deleted: 1, pending: true });
  }
}

function enqueue(op) {
  op.op = random(12);
  op.at = Date.now();
  outbox.push(op);
  store.set(OUTBOX_KEY, outbox);
  applyLocal(op);
  collab.events.emit();
  collab.status.emit();
  flush();
}

Object.assign(collab, {
  add({ parent, matiere, kind = 'note', title = '', body = '', url = '' }) {
    const id = random(14);
    enqueue({ t: 'put', node: { id, matiere, parent, kind, title: title.trim(), body: body.trim(), url: url.trim(), author: authorName() } });
    return id;
  },
  edit(id, patch) {
    const n = this.nodes.get(id);
    if (!n) return;
    enqueue({ t: 'put', node: { id, matiere: n.matiere, parent: n.parent, kind: patch.kind ?? n.kind, title: (patch.title ?? n.title).trim(), body: (patch.body ?? n.body).trim(), url: (patch.url ?? n.url).trim(), author: authorName() } });
  },
  remove(id) {
    const n = this.nodes.get(id);
    if (!n) return;
    // Never sent yet? Then just drop it from the outbox.
    const ops = outbox.filter((op) => (op.node?.id ?? op.id) === id);
    if (n.pending && !n.v && !shadow.has(id) && ops.length && !ops.some((op) => inflight.has(op.op))) {
      outbox = outbox.filter((op) => (op.node?.id ?? op.id) !== id);
      store.set(OUTBOX_KEY, outbox);
      this.nodes.delete(id);
      this.events.emit();
      this.status.emit();
      return;
    }
    enqueue({ t: 'del', id });
  },
});

const authorName = () => String(store.get('name', '') || 'anonyme').trim().slice(0, 40);

function settle(op, node) {
  outbox = outbox.filter((o) => o.op !== op.op);
  store.set(OUTBOX_KEY, outbox);
  inflight.delete(op.op);
  const id = op.node?.id ?? op.id;
  const stillPending = outbox.some((o) => (o.node?.id ?? o.id) === id);
  if (node) {
    if (!me.by && node.by && op.t === 'put' && !shadow.has(id)) {
      me.by = node.by;
      store.set('collab.me', me);
    }
    if (stillPending) shadow.set(id, node);
    else {
      shadow.delete(id);
      merge([node]);
    }
  } else if (!stillPending) {
    // Refused for good: back to what the server has (or nothing).
    const server = shadow.get(id);
    shadow.delete(id);
    if (server) collab.nodes.set(id, server);
    else collab.nodes.delete(id);
  }
  collab.events.emit();
  collab.status.emit();
}

function refused(op, error) {
  if (/code de la classe/.test(error)) {
    // Keep the work: it leaves as soon as the right code is typed.
    inflight.delete(op.op);
    store.set('collab.code', '');
    collab.needsCode = true;
    if (!collab.codeRejected) toast('Il faut le code de la classe pour envoyer tes ajouts (bouton « en ligne » en haut).');
    collab.codeRejected = true;
    collab.status.emit();
    return;
  }
  toast(`Ajout refusé : ${error}`);
  settle(op, null);
}

function retryLater(op, error) {
  inflight.delete(op.op);
  if (error) console.info(`[collab] ${error} — nouvel essai bientôt`);
  setTimeout(flush, 4000 + Math.random() * 4000);
}

const wireOp = (op) => ({ ...op, secret: me.secret, code: collab.code || undefined, admin: collab.admin || undefined });

async function flush() {
  if (collab.state === 'online' && ws?.readyState === WebSocket.OPEN) {
    for (const op of outbox) {
      if (inflight.has(op.op)) continue;
      inflight.add(op.op);
      ws.send(JSON.stringify(wireOp(op)));
    }
    return;
  }
  if (collab.state !== 'polling' || flush.busy) return;
  flush.busy = true;
  try {
    for (const op of [...outbox]) {
      if (inflight.has(op.op)) continue;
      inflight.add(op.op);
      let res;
      try {
        res = await fetch(`${base()}/api/op`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(wireOp(op)) });
      } catch {
        inflight.delete(op.op);
        break; // still offline
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) settle(op, data.node);
      else if (data.retry || res.status >= 500) {
        retryLater(op, data.error);
        break;
      } else refused(op, data.error ?? `erreur ${res.status}`);
    }
  } finally {
    flush.busy = false;
  }
}

// ── Server → browser ─────────────────────────────────────────────────
function merge(list) {
  let changed = false;
  for (const n of list) {
    collab.v = Math.max(collab.v, n.v);
    if (shadow.has(n.id)) {
      // A local change is still on its way: keep showing it, remember the server copy.
      if ((shadow.get(n.id).v ?? 0) <= n.v) shadow.set(n.id, n);
      continue;
    }
    const old = collab.nodes.get(n.id);
    if (old && !old.pending && old.v >= n.v) continue;
    collab.nodes.set(n.id, n);
    changed = true;
  }
  if (changed) collab.events.emit();
  persist();
}

function checkEpoch(epoch) {
  if (epoch == null || collab.epoch === epoch) return false;
  const reset = collab.epoch != null;
  collab.epoch = epoch;
  if (!reset) return false;
  // The server's database was replaced: forget the old cache (keep unsent work).
  collab.v = 0;
  for (const [id, n] of collab.nodes) if (!n.pending) collab.nodes.delete(id);
  shadow.clear();
  collab.events.emit();
  return true;
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const nodes = [...collab.nodes.values()].filter((n) => !n.pending).map((n) => (shadow.has(n.id) ? shadow.get(n.id) : n));
    const data = JSON.stringify({ v: collab.v, epoch: collab.epoch, nodes });
    try {
      if (data.length < CACHE_MAX) localStorage.setItem(`cozy.${CACHE_KEY}`, data);
      else localStorage.removeItem(`cozy.${CACHE_KEY}`);
    } catch { /* quota or private mode: the cache is only a speed-up */ }
  }, 800);
}

function setState(s) {
  if (collab.state === s) return;
  collab.state = s;
  collab.status.emit();
}

function onMessage(ev) {
  lastSeen = Date.now();
  if (ev.data === 'pong') return;
  let msg;
  try {
    msg = JSON.parse(ev.data);
  } catch {
    return;
  }
  if (msg.t === 'change') merge(msg.nodes);
  else if (msg.t === 'synced') {
    if (checkEpoch(msg.epoch)) {
      ws.send(JSON.stringify({ t: 'hello', cid: me.cid, page, since: 0 }));
      return;
    }
    collab.needsCode = msg.needsCode;
    collab.online = msg.online ?? collab.online;
    attempts = 0;
    failedOpens = 0;
    stopPolling();
    setState('online');
    persist();
    flush();
  } else if (msg.t === 'presence') {
    collab.online = msg.online;
    collab.status.emit();
  } else if (msg.t === 'ack' || msg.t === 'nack') {
    const op = outbox.find((o) => o.op === msg.op);
    if (!op) return;
    if (msg.t === 'ack') settle(op, msg.node);
    else if (msg.retry) retryLater(op, msg.error);
    else refused(op, msg.error);
  }
}

function connect() {
  clearTimeout(retryTimer);
  if (!collab.enabled || ws || !started) return;
  if (collab.state !== 'polling') setState('connecting');
  let opened = false;
  let sock;
  try {
    sock = new WebSocket(`${base().replace(/^http/, 'ws')}/api/ws`);
  } catch {
    scheduleReconnect();
    return;
  }
  ws = sock;
  sock.onopen = () => {
    opened = true;
    lastSeen = Date.now();
    sock.send(JSON.stringify({ t: 'hello', cid: me.cid, page, since: collab.v }));
    clearInterval(heartbeat);
    heartbeat = setInterval(() => {
      if (Date.now() - lastSeen > HEARTBEAT * 2 + 5000) {
        sock.close(); // silent for too long: the connection is dead even if the browser doesn't know yet
        return;
      }
      if (sock.readyState === WebSocket.OPEN) sock.send('ping');
    }, HEARTBEAT);
  };
  sock.onmessage = onMessage;
  sock.onclose = () => {
    if (ws !== sock) return;
    ws = null;
    clearInterval(heartbeat);
    inflight.clear(); // anything unanswered is re-sent (idempotent) after reconnecting
    if (!opened) failedOpens++;
    if (failedOpens >= 3) startPolling();
    else if (collab.state !== 'polling') setState('offline');
    scheduleReconnect();
  };
  sock.onerror = () => {};
}

function scheduleReconnect() {
  clearTimeout(retryTimer);
  if (!started) return;
  // Full jitter: after a server restart, hundreds of browsers come back spread out.
  const max = Math.min(30_000, 1000 * 2 ** attempts);
  attempts = Math.min(attempts + 1, 8);
  retryTimer = setTimeout(connect, 300 + Math.random() * max);
}

// ── HTTP fallback (networks that block WebSockets) ───────────────────
async function poll() {
  try {
    const res = await fetch(`${base()}/api/nodes?since=${collab.v}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (checkEpoch(data.epoch)) {
      poll();
      return;
    }
    collab.needsCode = data.needsCode;
    if (collab.state !== 'online') setState('polling');
    merge(data.nodes);
    flush();
  } catch {
    if (collab.state === 'polling') setState('offline');
  }
}

function startPolling() {
  if (pollTimer) return;
  setState('polling');
  poll();
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') poll();
  }, POLL);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

// ── Lifecycle ────────────────────────────────────────────────────────
Object.assign(collab, {
  start() {
    if (started || !this.enabled) return;
    started = true;
    connect();
    window.addEventListener('online', () => {
      attempts = 0;
      if (!ws) connect();
      else flush();
    });
    window.addEventListener('offline', () => ws?.close());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      // Phones freeze background tabs: check the line as soon as we're back.
      if (!ws) {
        attempts = 0;
        connect();
      } else if (ws.readyState === WebSocket.OPEN) ws.send('ping');
    });
    // Other tabs of this browser: share the outbox and the cache.
    window.addEventListener('storage', (e) => {
      if (e.key !== `cozy.${OUTBOX_KEY}`) return;
      outbox = store.get(OUTBOX_KEY, []);
      const waiting = new Set(outbox.map((op) => op.node?.id ?? op.id));
      for (const [id, n] of this.nodes) {
        if (!n.pending || waiting.has(id)) continue;
        // Sent and confirmed by the other tab.
        if (shadow.has(id)) this.nodes.set(id, shadow.get(id));
        else this.nodes.set(id, { ...n, pending: false });
        shadow.delete(id);
      }
      for (const op of outbox) applyLocal(op);
      this.events.emit();
      this.status.emit();
    });
  },
  // Which matière this tab is looking at (for "N en ligne ici").
  here(matiere) {
    page = matiere ?? null;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'here', cid: me.cid, page }));
  },
  retryNow() {
    attempts = 0;
    if (!ws) connect();
    flush();
  },
});
