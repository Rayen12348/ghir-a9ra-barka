// ghir-a9ra-barka collab: the small realtime server behind "ajouts de la classe".
//
// Anyone on the site can add a note or a link to any node (a matière, a cours,
// a TP, or another addition). Everything lives in one Durable Object with its
// own SQLite database, so writes are strongly consistent; WebSockets use the
// hibernation API so hundreds of idle connections cost nothing.
//
//   GET  /api/health              → { ok, v, nodes, online }
//   GET  /api/nodes?since=<v>     → { v, nodes, needsCode }   (changes after version v)
//   POST /api/op                  → { node } | { error }       (same ops as the socket)
//   GET  /api/ws                  → WebSocket (below)
//   GET  /api/export?admin=<key>  → every row, for backups
//   GET  /api/music/search?q=     → { items, left, resetAt } | { error, code }   (songs, see MUSIC)
//
// WebSocket messages (JSON, plus the text heartbeat 'ping' → 'pong'):
//   → { t: 'hello', cid, page, since }   then ← { t: 'change', nodes } … ← { t: 'synced', v, epoch, needsCode, online }
//   → { t: 'here', cid, page }           which matière this browser is looking at
//   → { t: 'put', op, node, secret, code?, admin? }   ← { t: 'ack', op, node } | { t: 'nack', op, error, retry }
//   → { t: 'del', op, id, secret, code?, admin? }     (same answers)
//   ← { t: 'change', nodes }  ← { t: 'presence', online }   pushed to everyone
import { DurableObject } from 'cloudflare:workers';

const LIMITS = {
  id: 40, matiere: 60, parent: 200, title: 140, body: 8000, url: 600, author: 40,
  perParent: 400, total: 20000, message: 24000, chunk: 400000,
};
// Token buckets: per browser (cid) and per IP. A whole class on campus Wi-Fi
// often shares one public IP, so the IP bucket is only a backstop.
const RATE = { client: { size: 12, perSec: 1 / 4 }, ip: { size: 900, perSec: 30 } };

// Song search for the "chansons" panel: the official YouTube Data API v3 (secret
// YOUTUBE_API_KEY). Its free quota is 10 000 units a day, shared by the whole
// class, and one search costs 101 (search.list 100 + videos.list 1). So results
// are kept a day, searches are capped per day, and each IP has a small bucket.
// The quota resets at midnight Pacific time.
const MUSIC = { daily: 95, results: 12, keepMs: 24 * 3600e3, rate: { size: 20, perSec: 1 / 120 } };
const ptParts = (t) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
}).formatToParts(t).map((p) => [p.type, p.value]));
const ptDay = (t = Date.now()) => {
  const p = ptParts(t);
  return Number(`${p.year}${p.month}${p.day}`);
};
const nextQuotaReset = (t = Date.now()) => {
  const p = ptParts(t);
  return t - (t % 1000) - (Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second)) * 1000 + 86400e3;
};
const unescapeHtml = (s) => String(s ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[e.toLowerCase()];
  if (named) return named;
  return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
});
const isoSeconds = (d) => {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d ?? '');
  return m ? ((Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)) * 60 + Number(m[3] ?? 0)) * 60 + Number(m[4] ?? 0) : 0;
};

const enc = new TextEncoder();
async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});

function originAllowed(origin, env) {
  const list = String(env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim()).filter(Boolean);
  if (!origin || list.includes('*')) return true;
  return list.includes(origin) || (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) && list.includes('http://localhost'));
}

function corsHeaders(origin, env) {
  if (!origin || !originAllowed(origin, env)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin');
    const cors = corsHeaders(origin, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!url.pathname.startsWith('/api/')) return new Response('ghir-a9ra-barka collab ✿ ok\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cors } });
    if (!originAllowed(origin, env)) return json({ error: 'Ce site n’est pas autorisé.' }, 403);

    const room = env.CLASS.get(env.CLASS.idFromName(env.ROOM || 'classe'));
    const res = await room.fetch(req);
    if (res.webSocket) return res;
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  },
};

class OpError extends Error {
  constructor(message, status = 400, retry = false) {
    super(message);
    Object.assign(this, { status, retry });
  }
}

const COLS = 'id, matiere, parent, kind, title, body, url, author, by, created, updated, v, deleted';
const publicNode = (r) => ({
  id: r.id, matiere: r.matiere, parent: r.parent, kind: r.kind, title: r.title, body: r.body, url: r.url,
  author: r.author, by: r.by, created: r.created, updated: r.updated, v: r.v, deleted: r.deleted ? 1 : 0,
});

const str = (v, max, name) => {
  if (v == null) return '';
  if (typeof v !== 'string') throw new OpError(`${name} invalide`);
  const s = v.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (s.length > max) throw new OpError(`${name} trop long (${max} caractères max)`);
  return s;
};

function cleanUrl(raw) {
  const s = str(raw, LIMITS.url, 'lien');
  if (!s) return '';
  let u;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
  } catch {
    throw new OpError('lien invalide');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new OpError('seuls les liens http(s) sont acceptés');
  return u.href;
}

export class ClassRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY, matiere TEXT NOT NULL, parent TEXT NOT NULL, kind TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '', by TEXT NOT NULL, owner TEXT NOT NULL,
      created INTEGER NOT NULL, updated INTEGER NOT NULL, v INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS nodes_v ON nodes (v)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS nodes_parent ON nodes (parent)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, n INTEGER NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS music_cache (q TEXT PRIMARY KEY, body TEXT NOT NULL, at INTEGER NOT NULL)');
    this.v = this.sql.exec("SELECT n FROM meta WHERE k = 'v'").toArray()[0]?.n ?? 0;
    // A random number that changes only if the database is ever wiped: browsers
    // holding a cache from an older database then start over instead of mixing both.
    this.epoch = this.sql.exec("SELECT n FROM meta WHERE k = 'epoch'").toArray()[0]?.n;
    if (this.epoch == null) {
      this.epoch = Math.floor(Math.random() * 2 ** 48);
      this.sql.exec("INSERT INTO meta (k, n) VALUES ('epoch', ?)", this.epoch);
    }
    // Writes run one after the other (hashing is async, and a create followed by
    // an edit of the same node must never be applied in the wrong order).
    this.lock = Promise.resolve();
    // Kept in memory: COUNT(*) on every write would read every row (billed per row read).
    this.live = this.sql.exec('SELECT COUNT(*) AS n FROM nodes WHERE deleted = 0').toArray()[0].n;
    this.buckets = new Map();
    // Heartbeats are answered without waking the object up.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  get needsCode() {
    return Boolean(this.env.CLASS_CODE);
  }

  // ── HTTP ───────────────────────────────────────────────────────────
  async fetch(req) {
    const url = new URL(req.url);
    const ip = req.headers.get('CF-Connecting-IP') ?? 'local';
    try {
      switch (url.pathname) {
        case '/api/ws':
          return this.accept(req, ip);
        case '/api/health':
          return json({ ok: true, v: this.v, nodes: this.count(), online: this.online().total });
        case '/api/nodes': {
          const since = Math.max(0, Number(url.searchParams.get('since')) || 0);
          return json({ v: this.v, epoch: this.epoch, nodes: this.changesSince(since), needsCode: this.needsCode });
        }
        case '/api/op': {
          if (req.method !== 'POST') return json({ error: 'POST attendu' }, 405);
          const text = await req.text();
          if (text.length > LIMITS.message) throw new OpError('message trop gros', 413);
          let msg;
          try {
            msg = JSON.parse(text);
          } catch {
            throw new OpError('JSON invalide');
          }
          return json({ node: await this.apply(msg, ip) });
        }
        case '/api/music/search':
          return await this.musicSearch(url.searchParams.get('q'), ip);
        case '/api/export': {
          if (!this.isAdmin(url.searchParams.get('admin'))) return json({ error: 'clé admin requise' }, 403);
          return json({ v: this.v, exportedAt: new Date().toISOString(), nodes: this.sql.exec(`SELECT ${COLS} FROM nodes ORDER BY v`).toArray().map(publicNode) });
        }
        default:
          return json({ error: 'introuvable' }, 404);
      }
    } catch (e) {
      if (e instanceof OpError) return json({ error: e.message, retry: e.retry }, e.status);
      console.error(e);
      return json({ error: 'erreur du serveur', retry: true }, 500);
    }
  }

  // ── Song search (YouTube Data API) ─────────────────────────────────
  meta(k) {
    return this.sql.exec('SELECT n FROM meta WHERE k = ?', k).toArray()[0]?.n ?? 0;
  }

  setMeta(k, n) {
    this.sql.exec('INSERT INTO meta (k, n) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET n = excluded.n', k, n);
  }

  // Searches already made today by the class (reset at midnight Pacific time).
  musicUsed() {
    if (this.meta('music_day') !== ptDay()) {
      this.setMeta('music_day', ptDay());
      this.setMeta('music_used', 0);
    }
    return this.meta('music_used');
  }

  async musicSearch(raw, ip) {
    const q = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!q) return json({ items: [] });
    const key = q.toLowerCase();
    const now = Date.now();
    const kept = this.sql.exec('SELECT body, at FROM music_cache WHERE q = ?', key).toArray()[0];
    const resetAt = nextQuotaReset(now);
    if (kept && now - kept.at < MUSIC.keepMs) return json({ ...JSON.parse(kept.body), left: Math.max(0, MUSIC.daily - this.musicUsed()), resetAt, cached: true });

    if (!this.env.YOUTUBE_API_KEY) return json({ error: 'La recherche n’est pas encore activée sur ce site. Colle plutôt un lien YouTube ou YouTube Music : il se joue ici.', code: 'no-key' }, 503);
    if (this.musicUsed() >= MUSIC.daily) return json({ error: 'Les recherches du jour sont épuisées pour toute la classe.', code: 'quota', resetAt }, 429);
    if (!this.take(`music:${ip}`, MUSIC.rate)) return json({ error: 'Trop de recherches d’un coup : attends un peu.', code: 'rate' }, 429);

    const base = String(this.env.YT_API_BASE || 'https://www.googleapis.com/youtube/v3').replace(/\/+$/, '');
    const keyParam = `key=${encodeURIComponent(this.env.YOUTUBE_API_KEY)}`;
    const region = this.env.MUSIC_REGION || 'TN';
    const call = async (path) => {
      const res = await fetch(`${base}/${path}&${keyParam}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      const reason = data?.error?.errors?.[0]?.reason ?? '';
      if (/quota|dailyLimit/i.test(reason)) {
        this.setMeta('music_used', MUSIC.daily);
        throw Object.assign(new Error('quota'), { quota: true });
      }
      console.error('YouTube Data API', res.status, reason, data?.error?.message);
      throw new Error(reason || `YouTube ${res.status}`);
    };
    try {
      this.setMeta('music_used', this.musicUsed() + 1);
      const found = await call(`search?part=snippet&type=video&videoEmbeddable=true&videoSyndicated=true&videoCategoryId=10&regionCode=${region}&maxResults=${MUSIC.results}&q=${encodeURIComponent(q)}`);
      const snippets = (found.items ?? []).filter((it) => it.id?.videoId);
      const ids = snippets.map((it) => it.id.videoId);
      const details = ids.length ? await call(`videos?part=contentDetails&id=${ids.join(',')}`) : { items: [] };
      const durations = new Map((details.items ?? []).map((v) => [v.id, isoSeconds(v.contentDetails?.duration)]));
      const items = snippets.map((it) => ({
        id: it.id.videoId,
        title: unescapeHtml(it.snippet.title),
        artists: [{ name: unescapeHtml(it.snippet.channelTitle).replace(/ - Topic$/, '') }],
        thumb: it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url ?? '',
        duration: durations.get(it.id.videoId) ?? 0,
      }));
      this.sql.exec('INSERT INTO music_cache (q, body, at) VALUES (?, ?, ?) ON CONFLICT (q) DO UPDATE SET body = excluded.body, at = excluded.at', key, JSON.stringify({ items }), now);
      this.sql.exec('DELETE FROM music_cache WHERE at < ?', now - 3 * MUSIC.keepMs);
      return json({ items, left: Math.max(0, MUSIC.daily - this.musicUsed()), resetAt });
    } catch (e) {
      if (e.quota) return json({ error: 'Les recherches du jour sont épuisées pour toute la classe.', code: 'quota', resetAt }, 429);
      return json({ error: 'YouTube ne répond pas pour l’instant, réessaie.', code: 'youtube' }, 502);
    }
  }

  accept(req, ip) {
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocket attendu' }, 426);
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ ip, cid: null, page: null });
    return new Response(null, { status: 101, webSocket: client });
  }

  // ── WebSocket (hibernation API) ────────────────────────────────────
  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > LIMITS.message) {
      ws.close(1009, 'message trop gros');
      return;
    }
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const att = ws.deserializeAttachment() ?? {};
    if (msg.t === 'hello' || msg.t === 'here') {
      const cid = typeof msg.cid === 'string' ? msg.cid.slice(0, 40) : att.cid;
      const page = typeof msg.page === 'string' ? msg.page.slice(0, LIMITS.matiere) : null;
      ws.serializeAttachment({ ...att, cid, page });
      this.schedulePresence();
      if (msg.t === 'hello') this.sendSync(ws, Math.max(0, Number(msg.since) || 0));
      return;
    }
    if (msg.t === 'put' || msg.t === 'del') {
      try {
        const node = await this.apply(msg, att.ip, att.cid);
        ws.send(JSON.stringify({ t: 'ack', op: msg.op, node }));
      } catch (e) {
        const known = e instanceof OpError;
        if (!known) console.error(e);
        ws.send(JSON.stringify({ t: 'nack', op: msg.op, error: known ? e.message : 'erreur du serveur', retry: known ? e.retry : true }));
      }
    }
  }

  async webSocketClose(ws, code) {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, 'bye');
    } catch { /* already closed */ }
    this.schedulePresence();
  }

  async webSocketError() {
    this.schedulePresence();
  }

  sendSync(ws, since) {
    const nodes = this.changesSince(since);
    let batch = [];
    let size = 0;
    const flush = () => {
      if (batch.length) ws.send(JSON.stringify({ t: 'change', nodes: batch }));
      batch = [];
      size = 0;
    };
    for (const n of nodes) {
      const s = n.title.length + n.body.length + n.url.length + 200;
      if (size + s > LIMITS.chunk) flush();
      batch.push(n);
      size += s;
    }
    flush();
    ws.send(JSON.stringify({ t: 'synced', v: this.v, epoch: this.epoch, needsCode: this.needsCode, online: this.online() }));
  }

  // ── Presence: unique browsers online, per matière ──────────────────
  online() {
    const all = new Set();
    const pages = {};
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment();
      if (!att?.cid) continue;
      all.add(att.cid);
      if (att.page) (pages[att.page] ??= new Set()).add(att.cid);
    }
    return { total: all.size, pages: Object.fromEntries(Object.entries(pages).map(([k, s]) => [k, s.size])) };
  }

  schedulePresence() {
    // Batched: one broadcast per second at most, however many people come and go.
    if (this.presencePending) return;
    this.presencePending = true;
    this.ctx.storage.getAlarm().then((at) => {
      if (at == null) return this.ctx.storage.setAlarm(Date.now() + 1000);
    }).catch(() => {});
  }

  async alarm() {
    this.presencePending = false;
    this.broadcast({ t: 'presence', online: this.online() });
  }

  broadcast(msg, except = null) {
    const data = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(data);
      } catch { /* closing */ }
    }
  }

  // ── Data ───────────────────────────────────────────────────────────
  count() {
    return this.live;
  }

  changesSince(since) {
    // From scratch: every live addition, plus each deleted one that still has
    // something live under it at any depth (so the reply can be placed).
    const rows = since > 0
      ? this.sql.exec(`SELECT ${COLS} FROM nodes WHERE v > ? ORDER BY v`, since)
      : this.sql.exec(`WITH RECURSIVE keep(id) AS (
          SELECT id FROM nodes WHERE deleted = 0
          UNION SELECT n.parent FROM nodes n JOIN keep k ON n.id = k.id
        ) SELECT ${COLS} FROM nodes WHERE id IN keep ORDER BY v`);
    return rows.toArray().map(publicNode);
  }

  get(id) {
    return this.sql.exec(`SELECT ${COLS}, owner FROM nodes WHERE id = ?`, id).toArray()[0] ?? null;
  }

  isAdmin(key) {
    return Boolean(this.env.ADMIN_KEY) && typeof key === 'string' && key === this.env.ADMIN_KEY;
  }

  take(key, rule) {
    const now = Date.now() / 1000;
    const b = this.buckets.get(key) ?? { tokens: rule.size, at: now };
    b.tokens = Math.min(rule.size, b.tokens + (now - b.at) * rule.perSec);
    b.at = now;
    this.buckets.set(key, b);
    if (this.buckets.size > 5000) this.buckets.clear();
    if (b.tokens < 1) return false;
    b.tokens -= 1;
    return true;
  }

  bump() {
    this.v += 1;
    this.sql.exec("INSERT INTO meta (k, n) VALUES ('v', ?) ON CONFLICT (k) DO UPDATE SET n = excluded.n", this.v);
    return this.v;
  }

  apply(msg, ip, cid) {
    const run = this.lock.then(() => this.applyNow(msg, ip, cid));
    this.lock = run.catch(() => {});
    return run;
  }

  async applyNow(msg, ip = 'local', cid = null) {
    if (!msg || typeof msg !== 'object') throw new OpError('message invalide');
    if (this.needsCode && msg.code !== this.env.CLASS_CODE) throw new OpError('code de la classe incorrect', 403);
    const secret = typeof msg.secret === 'string' ? msg.secret : '';
    if (secret.length < 16 || secret.length > 128) throw new OpError('identité manquante', 401);
    const admin = this.isAdmin(msg.admin);
    const owner = await sha256(`owner:${secret}`);
    const by = (await sha256(`pub:${secret}`)).slice(0, 16);

    if (!admin && (!this.take(`c:${cid ?? by}`, RATE.client) || !this.take(`ip:${ip}`, RATE.ip))) {
      throw new OpError('doucement ! trop d’ajouts d’un coup — réessaie dans quelques secondes', 429, true);
    }

    if (msg.t === 'del') {
      const id = str(msg.id, LIMITS.id, 'id');
      const row = this.get(id);
      if (!row) throw new OpError('introuvable', 404);
      if (row.owner !== owner && !admin) throw new OpError('seul son auteur peut le supprimer', 403);
      if (row.deleted) return publicNode(row); // retried delete
      this.sql.exec("UPDATE nodes SET deleted = 1, title = '', body = '', url = '', updated = ?, v = ? WHERE id = ?", Date.now(), this.bump(), id);
      this.live -= 1;
      const node = publicNode(this.get(id));
      this.broadcast({ t: 'change', nodes: [node] });
      return node;
    }
    if (msg.t !== 'put') throw new OpError('opération inconnue');

    const n = msg.node ?? {};
    const id = str(n.id, LIMITS.id, 'id');
    if (!/^[a-z0-9_-]{8,40}$/i.test(id)) throw new OpError('id invalide');
    const kind = n.kind === 'lien' ? 'lien' : 'note';
    const title = str(n.title, LIMITS.title, 'titre');
    const body = str(n.body, LIMITS.body, 'texte');
    const url = cleanUrl(n.url);
    const author = str(n.author, LIMITS.author, 'nom') || 'anonyme';
    if (kind === 'lien' && !url) throw new OpError('il manque le lien');
    if (kind === 'note' && !title && !body) throw new OpError('écris au moins un titre ou un texte');

    const row = this.get(id);
    const now = Date.now();
    if (row) {
      if (row.owner !== owner && !admin) throw new OpError('seul son auteur peut le modifier', 403);
      if (row.deleted) throw new OpError('cet ajout a été supprimé', 410);
      // A retried create, or an edit that changes nothing: answer without a new version.
      if (row.kind === kind && row.title === title && row.body === body && row.url === url && row.author === author) return publicNode(row);
      this.sql.exec('UPDATE nodes SET kind = ?, title = ?, body = ?, url = ?, author = ?, updated = ?, v = ? WHERE id = ?', kind, title, body, url, author, now, this.bump(), id);
    } else {
      const matiere = str(n.matiere, LIMITS.matiere, 'matière');
      const parent = str(n.parent, LIMITS.parent, 'parent');
      if (!/^[a-z0-9-]+$/.test(matiere)) throw new OpError('matière invalide');
      // Each matière is its own world: an addition hangs off the matière itself,
      // one of its documents, or another addition of the same matière.
      if (parent !== `m:${matiere}` && !parent.startsWith(`${matiere}/`)) {
        const p = this.get(parent);
        if (!p || p.matiere !== matiere) throw new OpError('on ne peut ajouter que dans la même matière');
        if (p.deleted) throw new OpError('cet ajout a été supprimé', 410);
      }
      if (this.count() >= LIMITS.total) throw new OpError('le site est plein — demande au responsable de faire du tri', 507);
      const siblings = this.sql.exec('SELECT COUNT(*) AS n FROM nodes WHERE parent = ? AND deleted = 0', parent).toArray()[0].n;
      if (siblings >= LIMITS.perParent) throw new OpError('ce nœud a déjà beaucoup d’ajouts — ajoute plutôt sous l’un d’eux', 507);
      this.sql.exec(
        'INSERT INTO nodes (id, matiere, parent, kind, title, body, url, author, by, owner, created, updated, v, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)',
        id, matiere, parent, kind, title, body, url, author, by, owner, now, now, this.bump(),
      );
      this.live += 1;
    }
    const node = publicNode(this.get(id));
    this.broadcast({ t: 'change', nodes: [node] });
    return node;
  }
}
