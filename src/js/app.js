import { loadVault, vault, items, matieres, canvases } from './data.js';
import { initTheme } from './themes.js';
import { pomodoro } from './pomodoro.js';
import { mountBar, setWorkspace, applyReading, closePopover, openSongs } from './bar.js';
import { songs, mountDock } from './songs.js';
import { mountSidebar, setActive } from './sidebar.js';
import { initLauncher, openLauncher, toggleLauncher, launcherOpen } from './launcher.js';
import { renderHome } from './views/home.js';
import { renderMatiere } from './views/matiere.js';
import { renderNote } from './views/note.js';
import { renderGraph } from './views/graph.js';
import { renderCanvasPage } from './views/canvas.js';
import { renderStudy } from './views/study.js';
import { renderContrib } from './views/contrib.js';
import { collab, contribTitle } from './collab.js';
import { closeQuickAdd } from './contribs.js';
import { notFound } from './views/notfound.js';
import { $, esc, go, store, isMobile } from './util.js';

const view = $('#view');
const sidebar = $('#sidebar');

const ROUTES = [
  [/^\/$/, renderHome, () => null],
  [/^\/m\/([^/]+)$/, renderMatiere, ([id]) => matieres.get(id)?.name],
  [/^\/n\/(.+)$/, renderNote, ([id]) => items.get(id)?.title],
  [/^\/c\/(.+)$/, renderCanvasPage, ([id]) => canvases.get(`c/${id}`)?.title],
  [/^\/graph$/, renderGraph, () => 'Graphe'],
  [/^\/etude$/, renderStudy, () => "Salle d'étude"],
  [/^\/a\/([^/]+)$/, renderContrib, ([id]) => (collab.nodes.get(id) ? contribTitle(collab.nodes.get(id)) : 'Ajout')],
];

let cleanup = null;
let currentPath = null;
let token = 0;

// The update this code belongs to (the build adds ?v=<version> to every script).
const BUILD = new URL(import.meta.url).searchParams.get('v');

// Throws away the offline copy and reloads under a one-off address (?r=…): a plain
// reload may reuse the page itself from the browser's cache, an address it has never
// seen can't. boot() tidies the address afterwards.
async function hardReload() {
  try {
    for (const key of await caches.keys()) if (key.startsWith('cozy-')) await caches.delete(key);
    for (const reg of await navigator.serviceWorker?.getRegistrations?.() ?? []) await reg.unregister();
  } catch { /* nothing to clear */ }
  location.replace(`${location.pathname}?r=${Date.now().toString(36)}${location.hash}`);
}

function crashPage(title, detail) {
  view.innerHTML = `<div class="page center"><pre class="ascii big-ascii">(；′⌒\`)</pre><h1>${esc(title)}</h1>
    ${detail ? `<p class="muted">${esc(detail)}</p>` : ''}<p><button class="btn primary" data-hard-reload>recharger proprement</button></p></div>`;
  view.querySelector('[data-hard-reload]').addEventListener('click', hardReload);
}

// Code and data from two different updates (the browser kept an old copy of one of
// them): start fresh by itself, once. If that didn't help (offline), say so.
function startOver() {
  const key = 'cozy.startOver';
  let tried = false;
  try {
    tried = sessionStorage.getItem(key) === vault.build;
    sessionStorage.setItem(key, vault.build);
  } catch { /* private mode */ }
  if (!tried) return hardReload();
  crashPage('Le site vient d’être mis à jour', 'Une partie de l’ancienne version est restée sur cet appareil. Recharge quand tu as du réseau.');
}

async function route() {
  const [path, qs = ''] = (location.hash.replace(/^#/, '') || '/').split('?');
  const query = new URLSearchParams(qs);
  closePopover();
  closeQuickAdd();
  if (isMobile()) document.body.classList.remove('side-open');

  // Same note, different heading: just scroll.
  if (path === currentPath && view.scrollToHeading) {
    view.scrollToHeading(query.get('h'));
    return;
  }
  if (path === currentPath && !path.startsWith('/m/')) return;

  cleanup?.();
  cleanup = null;
  currentPath = path;
  const mine = ++token;
  delete view.scrollToHeading;
  view.className = 'view';
  view.scrollTop = 0;

  const match = ROUTES.map(([re, render, title]) => [re.exec(path), render, title]).find(([m]) => m);
  const params = match ? match[0].slice(1).map(decodeURIComponent) : [];
  const title = match?.[2](params);
  pomodoro.setTitle(title ? `${title} — ${vault.site.title}` : vault.site.title);

  const matiere = path.startsWith('/m/') ? params[0] : path.startsWith('/n/') ? items.get(params[0])?.matiere : path.startsWith('/c/') ? canvases.get(`c/${params[0]}`)?.matiere : path.startsWith('/a/') ? collab.nodes.get(params[0])?.matiere : null;
  pomodoro.context = () => matiere ?? null;
  collab.here(matiere);
  setWorkspace(matiere);
  setActive(path);

  view.classList.add('enter');
  let result;
  try {
    result = match ? await match[1](view, { params, query, alive: () => mine === token }) : notFound(view);
  } catch (e) {
    console.error(e);
    if (mine === token) crashPage('Cette page n’a pas pu s’afficher', e.message);
    return;
  }
  if (mine !== token) {
    if (typeof result === 'function') result();
    return;
  }
  cleanup = typeof result === 'function' ? result : null;
  setTimeout(() => view.classList.remove('enter'), 400);
}

function toggleSidebar() {
  if (isMobile()) {
    document.body.classList.toggle('side-open');
    return;
  }
  const collapsed = sidebar.classList.toggle('collapsed');
  store.set('sidebar.collapsed', collapsed);
}

function rename() {
  const name = prompt('Comment tu t’appelles ?', store.get('name', ''));
  if (name == null) return;
  store.set('name', name.trim().slice(0, 30));
  if (currentPath === '/') {
    currentPath = null;
    route();
  }
}

function shortcuts(e) {
  const key = e.key.toLowerCase();
  const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
  if ((e.ctrlKey || e.metaKey) && key === 'k') {
    e.preventDefault();
    toggleLauncher();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && key === 'b') {
    e.preventDefault();
    toggleSidebar();
    return;
  }
  // e.code so that AZERTY keyboards work too.
  const digit = /^Digit([1-9])$/.exec(e.code);
  if (e.altKey && digit) {
    const m = vault.matieres[Number(digit[1]) - 1];
    if (m) {
      e.preventDefault();
      go(`#/m/${m.id}`);
    }
    return;
  }
  if (e.key === 'Escape') {
    closePopover();
    closeQuickAdd();
    document.body.classList.remove('side-open');
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || launcherOpen()) return;
  const actions = {
    '/': () => openLauncher(),
    g: () => go('#/graph'),
    e: () => go('#/etude'),
    h: () => go('#/'),
    p: () => pomodoro.toggle(),
    m: () => (songs.current ? songs.toggle() : openSongs()),
    c: () => openSongs(),
  };
  if (actions[e.key]) {
    e.preventDefault();
    actions[e.key]();
  }
}

async function boot() {
  try {
    await loadVault();
  } catch (e) {
    window.__booted = true;
    view.innerHTML = `<div class="page center"><pre class="ascii big-ascii">(；′⌒\`)</pre><h1>Le site n'a pas pu charger ses données</h1>
      <p class="muted">${esc(e.message)}</p><p class="muted">Lance <code>npm run dev</code> puis ouvre l'adresse affichée (le site ne marche pas en ouvrant le fichier directement).</p></div>`;
    return;
  }
  if (location.search) history.replaceState(null, '', location.pathname + location.hash);
  if (BUILD && vault.build && BUILD !== vault.build) {
    window.__booted = true;
    startOver();
    return;
  }
  initTheme(vault.site);
  applyReading();
  pomodoro.init(vault.site.pomodoro);
  if (vault.site.wallpaper) {
    const wp = $('.wallpaper');
    wp.classList.add('image');
    wp.style.backgroundImage = `url("${vault.site.wallpaper}")`;
  }
  if (store.get('sidebar.collapsed', false) && !isMobile()) sidebar.classList.add('collapsed');

  mountBar($('#bar'), { onMenu: toggleSidebar, onSearch: () => openLauncher() });
  mountSidebar(sidebar);
  mountDock($('#dock'));
  initLauncher($('#launcher'), { toggleSidebar, rename, openSongs });

  $('.scrim').addEventListener('click', () => document.body.classList.remove('side-open'));
  document.addEventListener('keydown', shortcuts);
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-launch]')) openLauncher();
  });
  window.addEventListener('hashchange', route);
  route();
  collab.start();
  registerServiceWorker();
  window.__booted = true;
}

// Offline copy of the site (see src/sw.js). Not in `npm run dev`, which reloads on every save.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || vault.site.dev) return;
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}), { once: true });
  if (document.readyState === 'complete') navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
