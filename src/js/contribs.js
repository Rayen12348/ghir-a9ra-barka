// UI for "ajouts de la classe": the thread under any node, the add/edit form,
// the quick-add popover (graph, carte) and the "en ligne" indicator.
import { vault, items, matieres } from './data.js';
import { collab, isMine, canDelete, contribTitle } from './collab.js';
import { icon } from './icons.js';
import { esc, fold, store, toast, relTime, clamp } from './util.js';

const MAX_DEPTH = 3;

// ── Safe text formatting (no HTML from users ever reaches the page) ──
const URL_RE = /\bhttps?:\/\/(?:(?!&quot;|&#39;|&lt;|&gt;)[^\s])+/g;
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

function findNote(title, matiere) {
  const t = fold(title.trim());
  return vault.items.find((it) => it.matiere === matiere && (fold(it.title) === t || fold(it.name ?? '') === t)) ?? null;
}

function inline(text, matiere) {
  return text.split(/(`[^`\n]+`)/).map((part, i) => {
    if (i % 2) return `<code>${esc(part.slice(1, -1))}</code>`;
    let s = esc(part);
    // [[Titre]] links to a document of the same matière (never another one).
    s = s.replace(/\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, (all, target, alias) => {
      const it = findNote(unesc(target), matiere);
      return it ? `<a class="wikilink" href="#/n/${it.id}">${alias ?? target}</a>` : alias ?? target;
    });
    s = s.replace(URL_RE, (raw) => {
      const trail = /[.,;:!?)\]]+$/.exec(raw)?.[0] ?? '';
      const u = raw.slice(0, raw.length - trail.length);
      const short = unesc(u).replace(/^https?:\/\/(www\.)?/, '');
      return `<a class="external" href="${u}" target="_blank" rel="noopener nofollow ugc">${esc(short.length > 48 ? `${short.slice(0, 47)}…` : short)}</a>${trail}`;
    });
    return s
      .replace(/\*\*(?=\S)([^*\n]*?\S)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^*\w])\*(?=\S)([^*\n]*?\S)\*(?![\w*])/g, '$1<i>$2</i>')
      .replace(/==(?=\S)([^=\n]*?\S)==/g, '<mark>$1</mark>');
  }).join('');
}

export function renderText(src, matiere) {
  const lines = String(src ?? '').split('\n');
  let html = '';
  let para = [];
  let list = null;
  let quote = [];
  let code = null;
  const flushPara = () => {
    if (para.length) html += `<p>${para.map((l) => inline(l, matiere)).join('<br>')}</p>`;
    para = [];
  };
  const flushList = () => {
    if (list) html += `<${list.tag}>${list.items.map((l) => `<li>${inline(l, matiere)}</li>`).join('')}</${list.tag}>`;
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) html += `<blockquote>${quote.map((l) => inline(l, matiere)).join('<br>')}</blockquote>`;
    quote = [];
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };
  for (const line of lines) {
    if (code) {
      if (/^\s*```\s*$/.test(line)) {
        html += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
        code = null;
      } else code.push(line);
      continue;
    }
    let m;
    if (/^\s*```/.test(line)) {
      flushAll();
      code = [];
    } else if (!line.trim()) flushAll();
    else if ((m = /^(#{1,4})\s+(.+)$/.exec(line))) {
      flushAll();
      html += `<h4>${inline(m[2], matiere)}</h4>`;
    } else if ((m = /^\s*(?:[-*•]|(\d+)[.)])\s+(.+)$/.exec(line))) {
      flushPara();
      flushQuote();
      const tag = m[1] ? 'ol' : 'ul';
      if (list?.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(m[2]);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flushPara();
      flushList();
      quote.push(m[1]);
    } else {
      flushList();
      flushQuote();
      para.push(line);
    }
  }
  if (code) html += `<pre><code>${esc(code.join('\n'))}</code></pre>`;
  flushAll();
  return html;
}

// ── Small helpers ────────────────────────────────────────────────────
export function ago(ms) {
  const s = (Date.now() - ms) / 1000;
  if (s < 50) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return relTime(new Date(ms).toISOString());
}

const hue = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const avatar = (n) => `<span class="ct-avatar" style="--h:${hue(n.by ?? n.author)}">${esc((n.author || '?').charAt(0).toUpperCase())}</span>`;

// Title of any node: a matière, a document, or an addition.
export function nodeLabel(id) {
  if (id?.startsWith('m:')) return matieres.get(id.slice(2))?.name ?? 'matière';
  const it = items.get(id);
  if (it) return it.title;
  const c = collab.nodes.get(id);
  return c ? contribTitle(c) : 'nœud';
}
export const nodeHref = (id) => (id?.startsWith('m:') ? `#/m/${id.slice(2)}` : items.has(id) ? `#/n/${id}` : `#/a/${id}`);

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Composer (add or edit) ───────────────────────────────────────────
export function composer({ parent, matiere, node = null, onDone, autofocus = true, compact = false }) {
  const form = document.createElement('form');
  form.className = `composer${compact ? ' compact' : ''}`;
  let kind = node?.kind ?? 'note';
  const name = store.get('name', '');
  form.innerHTML = `
    <div class="composer-top">
      <div class="chips seg" role="radiogroup" aria-label="Type d’ajout">
        <button type="button" class="chip" data-kind="note">${icon('message')} note</button>
        <button type="button" class="chip" data-kind="lien">${icon('link')} lien</button>
      </div>
      ${node ? '<span class="muted small">modification</span>' : ''}
    </div>
    <input class="field" name="url" type="text" inputmode="url" spellcheck="false" placeholder="https://… (vidéo, article, drive…)" maxlength="600" value="${esc(node?.url ?? '')}">
    <input class="field" name="title" placeholder="titre (facultatif)" maxlength="140" value="${esc(node?.title ?? '')}">
    <textarea class="field" name="body" rows="${compact ? 3 : 4}" maxlength="8000" placeholder="ton ajout : astuce, question, correction, résumé…  (**gras**, \`code\`, - liste, [[titre d’un cours]])">${esc(node?.body ?? '')}</textarea>
    <div class="composer-foot">
      <label class="composer-name" title="Ton prénom, affiché avec tes ajouts">${icon('type')}<input name="author" placeholder="ton prénom" maxlength="40" value="${esc(name)}" autocomplete="given-name"></label>
      <input class="field sm" name="code" placeholder="code de la classe" autocomplete="off" hidden>
      <span class="grow"></span>
      <span class="muted small hide-sm">ctrl ↵</span>
      <button type="button" class="btn sm ghost" data-cancel>annuler</button>
      <button class="btn sm primary" type="submit">${node ? 'enregistrer' : 'ajouter'}</button>
    </div>
    <p class="composer-err" hidden></p>`;
  const $ = (n) => form.querySelector(`[name="${n}"]`);
  const err = form.querySelector('.composer-err');
  const notePlaceholder = $('body').placeholder;
  const setKind = (k) => {
    kind = k;
    form.querySelectorAll('[data-kind]').forEach((b) => b.classList.toggle('on', b.dataset.kind === k));
    $('url').hidden = k !== 'lien';
    $('body').placeholder = k === 'lien' ? 'pourquoi ce lien ? (facultatif)' : notePlaceholder;
  };
  setKind(kind);
  const syncCode = () => {
    $('code').hidden = !(collab.needsCode && !collab.code);
  };
  syncCode();
  const offStatus = collab.status.on(syncCode);

  form.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b?.dataset.kind) {
      setKind(b.dataset.kind);
      (kind === 'lien' ? $('url') : $('body')).focus();
    }
    if (b?.hasAttribute('data-cancel')) close(false);
  });
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      form.requestSubmit();
    }
    if (e.key === 'Escape') {
      e.stopPropagation();
      close(false);
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = $('title').value.trim();
    const body = $('body').value.trim();
    let url = $('url').value.trim();
    const problem = kind === 'lien' && !url ? 'Colle le lien.' : kind === 'note' && !title && !body ? 'Écris au moins un titre ou un texte.' : null;
    if (kind === 'lien' && url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!problem && kind === 'lien') {
      try {
        new URL(url);
      } catch {
        err.textContent = 'Ce lien ne ressemble pas à une adresse web.';
        err.hidden = false;
        return;
      }
    }
    if (problem) {
      err.textContent = problem;
      err.hidden = false;
      return;
    }
    const author = $('author').value.trim().slice(0, 40);
    if (author !== store.get('name', '')) store.set('name', author);
    if (!$('code').hidden && $('code').value.trim()) collab.code = $('code').value.trim();
    if (node) collab.edit(node.id, { kind, title, body, url: kind === 'lien' ? url : '' });
    else collab.add({ parent, matiere, kind, title, body, url: kind === 'lien' ? url : '' });
    if (collab.state !== 'online') toast(collab.state === 'polling' ? 'Ajouté (connexion lente : envoi en cours)' : 'Gardé ici : il partira dès que la connexion revient', { icon: icon('cloudoff') });
    close(true);
  });
  function close(saved) {
    offStatus();
    onDone?.(saved);
  }
  if (autofocus) requestAnimationFrame(() => (kind === 'lien' && !node ? $('url') : $('body')).focus());
  form.cleanup = offStatus;
  return form;
}

// ── One addition (with its replies) ──────────────────────────────────
function card(n, depth, state) {
  const kids = collab.children(n.id);
  const edited = n.updated - n.created > 60_000;
  const editing = state.edit === n.id;
  const body = n.deleted
    ? '<p class="muted">Cet ajout a été supprimé.</p>'
    : editing ? '<div class="ct-editor"></div>' : `${n.title ? `<h4 class="ct-title"><a href="#/a/${n.id}">${esc(n.title)}</a></h4>` : ''}
      ${n.body ? `<div class="ct-body">${renderText(n.body, n.matiere)}</div>` : ''}
      ${n.url ? `<a class="ct-link" href="${esc(n.url)}" target="_blank" rel="noopener nofollow ugc">${icon('external')}<span><b>${esc(hostOf(n.url))}</b><small>${esc(n.url)}</small></span></a>` : ''}`;
  const kidsHtml = depth < MAX_DEPTH
    ? kids.map((k) => card(k, depth + 1, state)).join('')
    : kids.length ? `<a class="ct-more" href="#/a/${n.id}">${icon('reply')} voir ${kids.length} réponse${kids.length > 1 ? 's' : ''}</a>` : '';
  return `<article class="ct ${n.pending ? 'pending' : ''} ${n.deleted ? 'deleted' : ''}" data-id="${n.id}">
    <header class="ct-head">${avatar(n)}<b>${esc(n.author || 'anonyme')}</b><span class="muted" title="${new Date(n.created).toLocaleString('fr-FR')}">${ago(n.created)}${edited ? ' · modifié' : ''}</span>
      ${n.pending ? `<span class="ct-wait" title="Pas encore reçu par le serveur">${icon('clock')} en attente</span>` : ''}</header>
    ${body}
    ${n.deleted || editing ? '' : `<footer class="ct-actions">
      <button data-reply="${n.id}">${icon('reply')} répondre</button>
      ${isMine(n) ? `<button data-edit="${n.id}">${icon('pencil')} modifier</button>` : ''}
      ${canDelete(n) ? `<button data-del="${n.id}">${icon('trash')} supprimer</button>` : ''}
      <a href="#/a/${n.id}">${icon('right')} ouvrir</a>
    </footer>`}
    <div class="ct-kids" data-kids="${n.id}">${kidsHtml}</div>
  </article>`;
}

// ── Thread under a node ──────────────────────────────────────────────
// parent: 'm:<matière>', a document id, or an addition id.
export function mountThread(host, { parent, matiere, heading = true, label = null }) {
  if (!collab.enabled) {
    host.hidden = true;
    return () => {};
  }
  host.classList.add('thread');
  host.id = 'ajouts';
  const state = { reply: null, edit: null, newOpen: false, forms: new Map() };
  host.innerHTML = `
    ${heading ? `<div class="thread-head"><h2 class="section-h"><span class="prompt">❯</span> ajouts de la classe <span class="count"></span></h2><span class="thread-here muted small"></span></div>` : ''}
    <p class="thread-intro muted small">${label ? `Ajoute une note ou un lien à « ${esc(label)} » : ` : ''}tout le monde le voit tout de suite.</p>
    <div class="thread-new"><button class="btn sm" data-new>${icon('plus')} ajouter une note ou un lien</button></div>
    <div class="thread-list"></div>
    <p class="thread-status muted small" hidden></p>`;
  const list = host.querySelector('.thread-list');
  const newHost = host.querySelector('.thread-new');
  const status = host.querySelector('.thread-status');

  const formFor = (key, make) => {
    if (!state.forms.has(key)) state.forms.set(key, make());
    return state.forms.get(key);
  };
  const dropForm = (key) => {
    state.forms.get(key)?.cleanup?.();
    state.forms.delete(key);
  };

  const render = () => {
    const kids = collab.children(parent);
    const count = collab.count(parent);
    const c = host.querySelector('.count');
    if (c) c.textContent = count || '';
    const active = document.activeElement;
    const keep = active && host.contains(active) && active.closest('form') ? { el: active, start: active.selectionStart, end: active.selectionEnd } : null;
    list.innerHTML = kids.map((k) => card(k, 1, state)).join('') || '<p class="thread-empty muted small">Rien pour l’instant. Sois le premier à ajouter quelque chose.</p>';
    // Re-attach open forms (they live outside the re-rendered HTML, so nothing typed is lost).
    if (state.reply) {
      const id = state.reply;
      const slot = list.querySelector(`[data-kids="${CSS.escape(id)}"]`);
      const done = () => {
        dropForm(`r:${id}`);
        if (state.reply === id) state.reply = null;
        render();
      };
      if (slot) slot.prepend(formFor(`r:${id}`, () => composer({ parent: id, matiere, compact: true, onDone: done })));
    }
    if (state.edit) {
      const id = state.edit;
      const slot = list.querySelector(`[data-id="${CSS.escape(id)}"] .ct-editor`);
      const n = collab.nodes.get(id);
      const done = () => {
        dropForm(`e:${id}`);
        if (state.edit === id) state.edit = null;
        render();
      };
      if (slot && n) slot.append(formFor(`e:${id}`, () => composer({ node: n, parent: n.parent, matiere, onDone: done })));
      else state.edit = null;
    }
    if (keep && document.contains(keep.el) && document.activeElement !== keep.el) {
      keep.el.focus();
      try {
        keep.el.setSelectionRange(keep.start, keep.end);
      } catch { /* not a text field */ }
    }
  };

  const paintStatus = () => {
    const here = collab.online.pages?.[matiere] ?? 0;
    const h = host.querySelector('.thread-here');
    if (h) h.innerHTML = collab.state === 'online' && here > 1 ? `${icon('users')} ${here} personnes sur cette matière` : '';
    const msg = collab.state === 'offline' ? `${icon('cloudoff')} Hors ligne : tu vois les derniers ajouts reçus, et les tiens partiront dès que la connexion revient.`
      : collab.state === 'connecting' && !collab.v ? 'Connexion…' : '';
    status.hidden = !msg;
    status.innerHTML = msg;
  };

  host.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.closest('form')) return;
    if (b.hasAttribute('data-new')) {
      b.hidden = true;
      newHost.append(formFor('new', () => composer({ parent, matiere, onDone: () => {
        dropForm('new');
        newHost.querySelector('form')?.remove();
        newHost.querySelector('[data-new]').hidden = false;
      } })));
    } else if (b.dataset.reply) {
      if (state.reply && state.reply !== b.dataset.reply) dropForm(`r:${state.reply}`);
      state.reply = b.dataset.reply;
      render();
    } else if (b.dataset.edit) {
      state.edit = b.dataset.edit;
      render();
    } else if (b.dataset.del) {
      // Two clicks: no accidental deletes, and no blocking dialog.
      if (b.dataset.armed) {
        collab.remove(b.dataset.del);
        return;
      }
      b.dataset.armed = '1';
      b.classList.add('armed');
      b.innerHTML = `${icon('trash')} sûr ? clique encore`;
      setTimeout(() => {
        if (!b.isConnected) return;
        delete b.dataset.armed;
        b.classList.remove('armed');
        b.innerHTML = `${icon('trash')} supprimer`;
      }, 3500);
    }
  });

  // Re-render at most every 250 ms, however busy the class is.
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      if (host.isConnected) render();
    }, 250);
  };
  render();
  paintStatus();
  const offData = collab.events.on(schedule);
  const offStatus = collab.status.on(paintStatus);
  const clock = setInterval(schedule, 60_000); // "il y a 3 min" stays true
  return () => {
    offData();
    offStatus();
    clearInterval(clock);
    for (const key of [...state.forms.keys()]) dropForm(key);
  };
}

// ── Quick add (right-click on the graph, button on the carte) ────────
let quick = null;
export function closeQuickAdd() {
  if (!quick) return;
  quick.form.cleanup?.();
  quick.el.remove();
  document.removeEventListener('pointerdown', quick.outside, true);
  quick = null;
}

export function quickAdd({ parent, matiere, x, y }) {
  if (!collab.enabled) {
    toast('Les ajouts de la classe ne sont pas activés sur ce site.');
    return;
  }
  closeQuickAdd();
  const el = document.createElement('div');
  el.className = 'pop quick-add';
  el.innerHTML = `<div class="pop-title">${icon('plus')} ajouter à <span class="quick-target">${esc(nodeLabel(parent))}</span></div>`;
  const form = composer({ parent, matiere, compact: true, onDone: (saved) => {
    if (saved) toast('Ajouté ✓', { icon: icon('message') });
    closeQuickAdd();
  } });
  el.append(form);
  document.body.append(el);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  el.style.left = `${clamp(x - w / 2, 8, window.innerWidth - w - 8)}px`;
  el.style.top = `${clamp(y + 12, 8, window.innerHeight - h - 8)}px`;
  const outside = (e) => {
    if (!el.contains(e.target)) closeQuickAdd();
  };
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  quick = { el, form, outside };
}

// ── "En ligne" indicator in the bar + its popover ────────────────────
export function mountPresence(el) {
  const paint = () => {
    const s = collab.state;
    const n = collab.online.total;
    const pending = collab.pending;
    el.dataset.state = s;
    el.title = s === 'online' ? `${n} personne${n > 1 ? 's' : ''} en ligne` : s === 'polling' ? 'Connecté (mode lent : le réseau bloque le temps réel)' : s === 'connecting' ? 'Connexion…' : 'Hors ligne : tes ajouts attendent ici';
    el.innerHTML = `<span class="live-dot"></span><span class="live-n">${s === 'online' ? n : s === 'polling' ? icon('users') : s === 'connecting' ? '…' : 'hors ligne'}</span>${pending ? `<span class="live-pending" title="${pending} ajout(s) pas encore envoyé(s)">${pending}</span>` : ''}`;
  };
  paint();
  return collab.status.on(paint);
}

export function presencePanel(el, keep) {
  const render = () => {
    const s = collab.state;
    const pages = Object.entries(collab.online.pages ?? {}).map(([id, n]) => [matieres.get(id), n]).filter(([m]) => m).sort((a, b) => b[1] - a[1]);
    const label = { online: 'connecté en temps réel', polling: 'connecté (mode lent)', connecting: 'connexion…', offline: 'hors ligne', off: 'désactivé' }[s];
    el.innerHTML = `
      <div class="pop-title">${icon('users')} la classe <span class="pop-sub">${label}</span></div>
      ${s === 'online' ? `<p class="live-big"><b>${collab.online.total}</b> en ligne en ce moment</p>` : ''}
      ${s === 'offline' ? '<p class="muted small">Pas de connexion au serveur des ajouts. Tout le reste du site marche, et ce que tu ajoutes est gardé ici puis envoyé tout seul.</p>' : ''}
      ${s === 'polling' ? '<p class="muted small">Ce réseau bloque le temps réel : les ajouts passent quand même, avec quelques secondes de retard.</p>' : ''}
      ${pages.length ? `<div class="live-pages">${pages.slice(0, 8).map(([m, n]) => `<a class="live-page" href="#/m/${m.id}" style="--c:var(--${m.color})"><span>${esc(m.name)}</span><b>${n}</b></a>`).join('')}</div>` : ''}
      ${collab.pending ? `<div class="live-wait">${icon('clock')} ${collab.pending} ajout${collab.pending > 1 ? 's' : ''} en attente d’envoi <button class="btn sm" data-retry>réessayer</button></div>` : ''}
      <label class="live-field">${icon('type')}<input class="field" data-name placeholder="ton prénom" maxlength="40" value="${esc(store.get('name', ''))}"></label>
      ${collab.needsCode ? `<label class="live-field">${icon('shield')}<input class="field" data-code placeholder="code de la classe" value="${esc(collab.code)}" autocomplete="off"></label>${collab.codeRejected ? '<p class="composer-err">Ce code n’est pas le bon.</p>' : ''}` : ''}
      <details class="live-admin"><summary class="muted small">modération</summary>
        <label class="live-field">${icon('shield')}<input class="field" type="password" data-admin placeholder="clé de modération" value="${esc(collab.admin)}" autocomplete="off"></label>
        <p class="muted small">Avec la clé, tu peux supprimer n’importe quel ajout.</p>
      </details>`;
  };
  render();
  el.addEventListener('change', (e) => {
    if (e.target.dataset.name != null) store.set('name', e.target.value.trim().slice(0, 40));
    if (e.target.dataset.code != null) collab.code = e.target.value;
    if (e.target.dataset.admin != null) collab.admin = e.target.value.trim();
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-retry]')) collab.retryNow();
  });
  keep(collab.status.on(() => {
    if (!el.contains(document.activeElement) || document.activeElement.tagName !== 'INPUT') render();
  }));
}
