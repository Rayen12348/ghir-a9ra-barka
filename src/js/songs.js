// "Chansons": search YouTube and play any song right here, for everyone in the
// class, without leaving the site. Playback is YouTube's official embedded
// player, inside the mini player in the corner, so it keeps playing from page
// to page. By default the video is hidden (music only), as Rayen chose on
// 2026-11-08 knowing YouTube's rules ask for a visible player of at least
// 200 × 200 px: "music": { "video": true } in site.config.json shows it again.
// When a browser refuses to start a hidden player (iPhone), the video appears
// with "touche la vidéo" until the song plays.
// After a song, similar songs follow (YouTube's own radio for that song).
//   - search: the class server (worker/, YouTube Data API, shared daily quota);
//   - a pasted YouTube / YouTube Music link (song or playlist) plays directly,
//     with no search and no quota.
import { vault } from './data.js';
import { store, emitter, toast, esc } from './util.js';
import { icon } from './icons.js';

const server = () => String(store.get('collab.url', '') || vault.site?.collab?.url || '').replace(/\/+$/, '');
const fmt = (s) => {
  s = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const artists = (t) => (t?.artists ?? []).map((a) => a.name).join(', ');
export const cover = (t) => esc(t?.thumb || (t?.id ? `https://i.ytimg.com/vi/${t.id}/mqdefault.jpg` : ''));
const track = (id) => ({ id, title: '', artists: [], thumb: '', duration: 0 });

// A YouTube or YouTube Music link → { v: video id | null, list: playlist id | null }.
export function youtubeLink(text) {
  let u;
  try {
    u = new URL(String(text).trim());
  } catch {
    return null;
  }
  if (!/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i.test(u.hostname)) return null;
  const ok = (v) => /^[\w-]{11}$/.test(v ?? '');
  let v = u.searchParams.get('v');
  if (!ok(v) && /youtu\.be$/i.test(u.hostname)) v = u.pathname.slice(1, 12);
  if (!ok(v)) v = /^\/(?:shorts|embed|live|v)\/([\w-]{11})/.exec(u.pathname)?.[1];
  const list = u.searchParams.get('list');
  const ref = { v: ok(v) ? v : null, list: /^[\w-]{10,}$/.test(list ?? '') ? list : null };
  return ref.v || ref.list ? ref : null;
}

// Title and artist of a video, from YouTube's public oEmbed (no key, no quota).
const described = new Map();
function describe(t) {
  if (!t || t.title || described.has(t.id)) return;
  described.set(t.id, fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${t.id}`)}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d) => {
      t.title = d.title;
      t.artists = [{ name: String(d.author_name ?? '').replace(/ - Topic$/, '') }];
    })
    .catch(() => {
      t.title ||= 'Vidéo YouTube';
    })
    .finally(() => songs.emit()));
}

async function api(path) {
  if (!server()) throw Object.assign(new Error('La recherche passe par le serveur de la classe, absent ici. Colle plutôt un lien YouTube.'), { code: 'no-key' });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(server() + path, { signal: ctrl.signal });
    const data = await res.json().catch(() => null);
    // 404: a class server older than song search, same as having no key.
    if (res.status === 404) throw Object.assign(new Error('La recherche n’est pas encore activée sur ce site. Colle plutôt un lien YouTube ou YouTube Music : il se joue ici.'), { code: 'no-key' });
    if (!res.ok) throw Object.assign(new Error(data?.error ?? `erreur ${res.status}`), { code: data?.code, resetAt: data?.resetAt });
    return data;
  } catch (e) {
    if (e.name === 'TypeError' || e.name === 'AbortError') throw Object.assign(new Error('Le serveur de la classe ne répond pas.'), { code: 'offline' });
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── The YouTube player (created once, inside the mini player) ───────────
let apiReady = null;
function loadApi() {
  apiReady ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT);
    const before = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      before?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      apiReady = null;
      s.remove();
      reject(new Error('YouTube ne répond pas'));
    };
    document.head.append(s);
  });
  return apiReady;
}

let host = null; // the video box in the mini player
let player = null;
let playerReady = null;
let state = -1; // YouTube: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
let cueing = false; // reading a playlist: ignore the player's own events
let cued = null;
let failures = 0;
let seq = 0; // the latest play request (older ones give up)
let ticker = null;

function getPlayer() {
  playerReady ??= loadApi().then((YT) => new Promise((resolve) => {
    const el = document.createElement('div');
    host.replaceChildren(el);
    player = new YT.Player(el, {
      width: '100%',
      height: '100%',
      playerVars: { playsinline: 1, rel: 0, origin: location.origin },
      events: {
        onReady: () => {
          player.setVolume(Math.round(songs.volume * 100));
          resolve(player);
        },
        onStateChange: (e) => onState(e.data),
        onError: (e) => onError(e.data),
      },
    });
  }));
  playerReady.catch(() => {
    playerReady = null;
  });
  return playerReady;
}

function onState(s) {
  if (cueing) {
    if (s === 5) cued?.();
    return;
  }
  state = s;
  if (s === 1) {
    songs.loading = false;
    songs.needsTap = false;
    failures = 0;
    const t = songs.current;
    if (t && !t.duration) t.duration = Math.round(player.getDuration() || 0);
  } else if (s === 3) songs.loading = true;
  else if (s === 0) songs.next();
  songs.emit();
}

function onError(code) {
  if (cueing) return cued?.();
  const t = songs.current;
  songs.loading = false;
  failures++;
  const why = code === 101 || code === 150 || code === 153 ? 'son auteur ne permet pas de la lire hors de YouTube' : 'YouTube ne la donne pas';
  toast(`« ${t?.title || 'Cette chanson'} » ne peut pas être lue ici : ${why}`, { icon: icon('headphones') });
  songs.emit();
  if (failures < 4) setTimeout(() => songs.next(), 900);
}

// The video ids of a playlist (or of YouTube's radio for a song, "RD" + id),
// read by cueing it in the player: no key, no quota.
async function playlistIds(list) {
  const p = await getPlayer();
  cueing = true;
  // Cueing stops the current video: show "chargement…" until the next song plays.
  state = -1;
  songs.loading = true;
  songs.emit();
  try {
    const done = new Promise((resolve) => {
      cued = resolve;
      setTimeout(resolve, 9000);
    });
    p.cuePlaylist({ list, listType: 'playlist', index: 0 });
    await done;
    let ids = p.getPlaylist() ?? [];
    for (let i = 0; !ids.length && i < 10; i++) {
      await sleep(200);
      ids = p.getPlaylist() ?? [];
    }
    return ids.filter((id) => /^[\w-]{11}$/.test(id));
  } catch {
    return [];
  } finally {
    cueing = false;
    cued = null;
  }
}

function startTicker() {
  ticker ??= setInterval(() => {
    if (songs.active) songs.tick.emit();
  }, 500);
}

async function load(mine = ++seq) {
  const t = songs.current;
  if (!t) return;
  songs.active = true; // shows the mini player (and the video) first
  songs.loading = true;
  songs.emit();
  describe(t);
  try {
    const p = await getPlayer();
    if (mine !== seq) return;
    p.loadVideoById(t.id);
    startTicker();
    // Still not started a few seconds later: this browser wants a tap on the video itself.
    setTimeout(() => {
      if (mine === seq && songs.active && state !== 1 && state !== 3) {
        songs.needsTap = true;
        songs.emit();
      }
    }, 4500);
  } catch (e) {
    songs.loading = false;
    toast(e.message, { icon: icon('headphones') });
    songs.emit();
  }
  songs.emit();
}

export const songs = {
  events: emitter(), // state changes (results, track, play/pause)
  tick: emitter(), // playback position (twice a second)
  enabled: () => vault.site?.music !== false,
  showVideo: () => vault.site?.music?.video === true,
  needsTap: false, // the browser blocked the hidden player: show the video to be tapped
  query: store.get('songs.query', ''),
  results: [],
  status: 'idle', // idle | searching | error
  code: '', // why the last search failed: no-key | quota | rate | offline | youtube
  error: '',
  resetAt: 0,
  left: null, // searches the class has left today
  queue: [],
  index: -1,
  active: false, // a song is loaded (the mini player shows it)
  loading: false,
  volume: store.get('songs.volume', 0.8),

  get current() {
    return this.queue[this.index] ?? null;
  },
  get playing() {
    return state === 1;
  },
  get time() {
    return (this.active && player?.getCurrentTime?.()) || 0;
  },
  get duration() {
    return (this.active && player?.getDuration?.()) || this.current?.duration || 0;
  },
  emit() {
    this.events.emit();
  },

  async search(q) {
    q = q.trim();
    const link = youtubeLink(q);
    if (link) return this.openLink(link);
    this.query = q;
    store.set('songs.query', q);
    const mine = ++this.searchSeq;
    if (!q) {
      this.results = [];
      this.status = 'idle';
      return this.emit();
    }
    this.status = 'searching';
    this.emit();
    try {
      const r = await api(`/api/music/search?q=${encodeURIComponent(q)}`);
      if (mine !== this.searchSeq) return;
      this.results = r.items ?? [];
      this.left = r.left ?? null;
      this.status = 'idle';
    } catch (e) {
      if (mine !== this.searchSeq) return;
      Object.assign(this, { status: 'error', code: e.code ?? '', error: e.message, resetAt: e.resetAt ?? 0 });
    }
    this.emit();
  },
  searchSeq: 0,

  // Play a song, then YouTube's radio for it (similar songs).
  async play(t) {
    const mine = ++seq;
    this.queue = [t];
    this.index = 0;
    this.radioFrom = t.id;
    await load(mine);
  },

  // A pasted link: a song (then its radio), or a playlist (from that song on).
  async openLink({ v, list }) {
    const mine = ++seq;
    // Show what comes next instead of an older search.
    this.query = '';
    this.results = [];
    this.status = 'idle';
    store.set('songs.query', '');
    this.active = true;
    this.loading = true;
    this.queue = v ? [track(v)] : [];
    this.index = v ? 0 : -1;
    this.emit();
    if (list) {
      const ids = await playlistIds(list);
      if (mine !== seq) return;
      if (ids.length) {
        this.queue = ids.map(track);
        this.index = Math.max(0, ids.indexOf(v));
        this.radioFrom = null;
        return load(mine);
      }
      if (!v) {
        this.active = false;
        this.loading = false;
        toast('Cette playlist est introuvable ou privée.', { icon: icon('headphones') });
        return this.emit();
      }
    }
    this.radioFrom = v;
    return load(mine);
  },

  async playQuery(q) {
    await this.search(q);
    if (this.results[0]) this.play(this.results[0]);
    else if (this.status === 'error') toast(this.error, { icon: icon('headphones') });
    else if (!youtubeLink(q)) toast(`Rien trouvé pour « ${q} »`, { icon: icon('headphones') });
  },

  jump(i) {
    if (i < 0 || i >= this.queue.length) return;
    this.index = i;
    load();
  },

  async next() {
    if (this.index < this.queue.length - 1) return this.jump(this.index + 1);
    await this.more();
    if (this.index < this.queue.length - 1) this.jump(this.index + 1);
    else {
      state = 0;
      this.emit();
    }
  },

  prev() {
    if (this.time > 3 || this.index <= 0) player?.seekTo?.(0, true);
    else this.jump(this.index - 1);
  },

  // At the end of the queue: YouTube's radio for the last song.
  async more() {
    const seed = this.current?.id ?? this.radioFrom;
    if (!seed || this.fetchingMore) return;
    this.fetchingMore = true;
    try {
      const ids = await playlistIds(`RD${seed}`);
      const have = new Set(this.queue.map((t) => t.id));
      this.queue.push(...ids.filter((id) => !have.has(id) && have.add(id)).map(track));
      this.emit();
    } finally {
      this.fetchingMore = false;
    }
  },

  toggle() {
    if (!this.current || !player) return;
    if (state === 1) player.pauseVideo();
    else {
      this.active = true;
      player.playVideo();
    }
    this.emit();
  },

  pause() {
    player?.pauseVideo?.();
  },

  seek(fraction) {
    const d = this.duration;
    if (d) player?.seekTo?.(fraction * d, true);
  },

  setVolume(v) {
    this.volume = v;
    store.set('songs.volume', v);
    if (player?.setVolume) {
      player.unMute();
      player.setVolume(Math.round(v * 100));
    }
  },

  close() {
    ++seq;
    player?.stopVideo?.();
    state = -1;
    this.needsTap = false;
    this.active = false;
    this.loading = false;
    this.emit();
  },
};

// ── panel: search box, now playing, results / up next ──────────────────

const eq = '<span class="eq"><i></i><i></i><i></i><i></i></span>';

function row(t, i, kind) {
  const on = songs.current?.id === t.id && songs.active;
  if (!t.title) describe(t);
  return `<button class="song-row ${on ? 'on' : ''}" data-${kind}="${i}">
    <span class="song-art"><img src="${cover(t)}" alt="" loading="lazy" referrerpolicy="no-referrer">${on ? `<span class="song-eq ${songs.playing ? '' : 'paused'}">${eq}</span>` : ''}</span>
    <span class="song-text"><b>${esc(t.title || '…')}</b><small>${esc(artists(t))}</small></span>
    <span class="song-dur">${t.duration ? fmt(t.duration) : ''}</span>
  </button>`;
}

const at = (ms) => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function mountSongs(el, { autofocus = false } = {}) {
  el.classList.add('songs');
  if (!songs.enabled()) {
    el.innerHTML = '<p class="muted small">Les chansons sont désactivées sur ce site.</p>';
    return () => {};
  }
  loadApi().catch(() => {}); // so the first song starts quickly
  el.innerHTML = `
    <form class="song-search" autocomplete="off">${icon('search')}<input type="search" placeholder="une chanson, un artiste… ou un lien YouTube" value="${esc(songs.query)}" spellcheck="false" aria-label="Chercher une chanson ou coller un lien YouTube"></form>
    <div class="song-now"></div>
    <div class="song-list"></div>`;
  const input = el.querySelector('input');
  const now = el.querySelector('.song-now');
  const list = el.querySelector('.song-list');

  // Searching costs the class's shared daily quota: only on Entrée, never while typing.
  el.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    songs.search(input.value);
  });
  // An emptied box shows what plays next again (costs nothing).
  input.addEventListener('input', () => {
    if (!input.value.trim() && songs.query) songs.search('');
  });
  input.addEventListener('paste', (e) => {
    const link = youtubeLink(e.clipboardData?.getData('text') ?? '');
    if (!link) return;
    e.preventDefault();
    input.value = '';
    songs.openLink(link);
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.result != null) songs.play(songs.results[Number(b.dataset.result)]);
    else if (b.dataset.queue != null) songs.jump(Number(b.dataset.queue));
    else if (b.dataset.act === 'retry') songs.search(input.value);
    else if (b.dataset.act) songs[b.dataset.act]();
  });
  el.addEventListener('input', (e) => {
    if (e.target.dataset.seek != null) songs.seek(Number(e.target.value) / 1000);
    if (e.target.dataset.vol != null) songs.setVolume(Number(e.target.value));
  });

  const renderNow = () => {
    const t = songs.active ? songs.current : null;
    now.hidden = !t;
    if (!t) return;
    now.innerHTML = `
      <div class="song-head">
        <img class="song-cover" src="${cover(t)}" alt="" referrerpolicy="no-referrer">
        <div class="song-text"><b>${esc(t.title || '…')}</b><small>${songs.loading ? 'chargement…' : esc(artists(t))}</small></div>
      </div>
      <div class="song-ctrl">
        <button class="icon-btn" data-act="prev" title="Précédente">${icon('prev')}</button>
        <button class="icon-btn accent" data-act="toggle" title="Lecture / pause">${icon(songs.playing ? 'pause' : 'play')}</button>
        <button class="icon-btn" data-act="next" title="Suivante">${icon('skip')}</button>
        <span class="song-time"></span>
      </div>
      <input type="range" min="0" max="1000" value="0" data-seek aria-label="Position">
      <label class="vol-row">${icon('volume')}<input type="range" min="0" max="1" step="0.01" value="${songs.volume}" data-vol aria-label="Volume"></label>`;
    renderTime();
  };
  const renderTime = () => {
    const seek = now.querySelector('[data-seek]');
    if (!seek || document.activeElement === seek) return;
    const d = songs.duration;
    seek.value = d ? Math.round((songs.time / d) * 1000) : 0;
    now.querySelector('.song-time').textContent = `${fmt(songs.time)} / ${fmt(d)}`;
  };
  const tip = '<p class="muted small">Astuce : colle un lien YouTube ou YouTube Music (chanson ou playlist), il se joue ici sans recherche.</p>';
  const renderList = () => {
    if (songs.status === 'searching') {
      list.innerHTML = '<p class="muted small song-msg">recherche…</p>';
    } else if (songs.status === 'error' && songs.code === 'no-key') {
      list.innerHTML = `<div class="song-msg"><p class="small">${esc(songs.error)}</p><p class="muted small">Par exemple <code>music.youtube.com/watch?v=…</code>, <code>youtu.be/…</code> ou une playlist <code>…?list=…</code>.</p></div>`;
    } else if (songs.status === 'error' && songs.code === 'quota') {
      list.innerHTML = `<div class="song-msg"><p class="small">${esc(songs.error)} Elles reviennent à ${at(songs.resetAt)}.</p><p class="muted small">En attendant, les liens YouTube collés ici marchent toujours, et la radio continue après chaque chanson.</p></div>`;
    } else if (songs.status === 'error') {
      list.innerHTML = `<div class="song-msg"><p class="small">${esc(songs.error)}</p><button class="btn sm" data-act="retry">${icon('reset')} réessayer</button></div>`;
    } else if (songs.query && songs.results.length) {
      list.innerHTML = songs.results.map((t, i) => row(t, i, 'result')).join('')
        + (songs.left != null && songs.left < 30 ? `<p class="muted small song-msg">encore ${songs.left} recherche${songs.left > 1 ? 's' : ''} aujourd’hui pour la classe</p>` : '');
    } else if (songs.query) {
      list.innerHTML = '<p class="muted small song-msg">rien trouvé</p>';
    } else if (songs.active && songs.queue.length > songs.index + 1) {
      list.innerHTML = `<div class="song-label">à suivre</div>${songs.queue.map((t, i) => (i > songs.index && i <= songs.index + 8 ? row(t, i, 'queue') : '')).join('')}`;
    } else if (songs.active) {
      list.innerHTML = '<p class="muted small song-msg">Ensuite : des chansons similaires.</p>';
    } else {
      list.innerHTML = `<p class="muted small song-msg">Cherche n’importe quelle chanson puis appuie sur Entrée : elle se joue ici, et des chansons similaires suivent.</p>${tip}`;
    }
  };
  const render = () => {
    renderNow();
    renderList();
  };
  render();
  if (autofocus) requestAnimationFrame(() => input.focus());
  const offA = songs.events.on(render);
  const offB = songs.tick.on(renderTime);
  return () => {
    offA();
    offB();
  };
}

// ── Mini player in the corner: the video, and the song keeps playing from page to page ──
export function mountDock(el) {
  el.className = 'dock window';
  el.hidden = true;
  el.innerHTML = `
    <div class="dock-video"></div>
    <p class="dock-tap">Touche la vidéo pour lancer la musique.</p>
    <div class="dock-body">
      <img class="dock-art" alt="" referrerpolicy="no-referrer">
      <div class="dock-info" data-act="open" title="Ouvrir les chansons"><div class="dock-title"></div><div class="dock-sub"></div></div>
      <button class="icon-btn" data-act="prev" title="Précédente">${icon('prev')}</button>
      <button class="icon-btn accent" data-act="toggle"></button>
      <button class="icon-btn" data-act="next" title="Suivante">${icon('skip')}</button>
      <button class="icon-btn" data-act="close" title="Arrêter">${icon('x')}</button>
    </div>
    <div class="dock-progress"><i></i></div>`;
  host = el.querySelector('.dock-video');
  const art = el.querySelector('.dock-art');
  el.classList.toggle('show-video', songs.showVideo());
  const bar = el.querySelector('.dock-progress i');
  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act || !songs.current) return;
    if (act === 'open') document.querySelector('#bar .songs-btn:not(.open)')?.click();
    else songs[act]?.();
  });
  const update = () => {
    const song = songs.active ? songs.current : null;
    el.hidden = !songs.active;
    if (!songs.active) return;
    el.classList.toggle('playing', songs.playing);
    el.classList.toggle('needs-tap', songs.needsTap);
    if (song && art.dataset.id !== song.id) {
      art.dataset.id = song.id;
      art.src = cover(song).replaceAll('&amp;', '&');
    }
    el.querySelector('.dock-title').textContent = song?.title || 'chargement…';
    el.querySelector('.dock-sub').textContent = songs.loading ? 'chargement…' : artists(song);
    el.querySelector('[data-act="toggle"]').innerHTML = icon(songs.playing ? 'pause' : 'play');
  };
  update();
  songs.events.on(update);
  songs.tick.on(() => {
    bar.style.width = songs.duration ? `${(songs.time / songs.duration) * 100}%` : '0';
  });
}
