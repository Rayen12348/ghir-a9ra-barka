// Minimal Node client speaking the same protocol as src/js/collab.js, for tests.
import { randomBytes } from 'node:crypto';

export const BASE = process.env.COLLAB_URL ?? 'http://localhost:8790';
export const rid = (n = 12) => randomBytes(n).toString('base64url').replace(/[^a-z0-9]/gi, '').slice(0, n).padEnd(n, 'x');

export class Client {
  constructor({ name = 'test', page = null, since = 0, cid = rid(16), secret = rid(32) } = {}) {
    Object.assign(this, { name, page, since, cid, secret });
    this.nodes = new Map();
    this.pending = new Map();
    this.onChange = null;
    this.presence = null;
    this.changes = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/api/ws`);
      this.ws = ws;
      const timer = setTimeout(() => reject(new Error('connect timeout')), 15000);
      ws.onerror = (e) => {
        clearTimeout(timer);
        reject(new Error(`ws error ${e.message ?? ''}`));
      };
      ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', cid: this.cid, page: this.page, since: this.since }));
      ws.onmessage = (ev) => {
        if (ev.data === 'pong') return;
        const msg = JSON.parse(ev.data);
        if (msg.t === 'change') {
          for (const n of msg.nodes) {
            const old = this.nodes.get(n.id);
            if (!old || old.v < n.v) this.nodes.set(n.id, n);
            this.since = Math.max(this.since, n.v);
            this.changes++;
            this.onChange?.(n);
          }
        } else if (msg.t === 'synced') {
          this.since = Math.max(this.since, msg.v);
          this.presence = msg.online;
          this.needsCode = msg.needsCode;
          clearTimeout(timer);
          resolve(this);
        } else if (msg.t === 'presence') {
          this.presence = msg.online;
        } else if (msg.t === 'ack' || msg.t === 'nack') {
          const p = this.pending.get(msg.op);
          if (!p) return;
          this.pending.delete(msg.op);
          p(msg);
        }
      };
      ws.onclose = () => {
        this.closed = true;
      };
    });
  }

  send(msg) {
    const op = rid(10);
    return new Promise((resolve) => {
      this.pending.set(op, resolve);
      this.ws.send(JSON.stringify({ ...msg, op, secret: msg.secret ?? this.secret }));
    });
  }

  put(node, extra = {}) {
    return this.send({ t: 'put', node: { author: this.name, ...node }, ...extra });
  }

  del(id, extra = {}) {
    return this.send({ t: 'del', id, ...extra });
  }

  here(page) {
    this.page = page;
    this.ws.send(JSON.stringify({ t: 'here', cid: this.cid, page }));
  }

  ping() {
    this.ws.send('ping');
  }

  close() {
    try {
      this.ws.close(1000);
    } catch { /* already */ }
  }
}

export async function http(path, init) {
  const res = await fetch(BASE + path, init);
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
