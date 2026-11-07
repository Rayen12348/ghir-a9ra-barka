# ghir-a9ra-barka

A study site for the class: every matière with its cours, TD, TP, corrections and résumés. It works like Obsidian (graph view, canvas boards, wikilinks) and has a study room with a pomodoro timer and ambient sounds. Anyone in the class can add notes and links to any page, live for everyone (see [Ajouts de la classe](#ajouts-de-la-classe-live)). The look borrows from riced Linux desktops (rofi/waybar style, Catppuccin and friends).

**The `content/` folder is an Obsidian vault.** You write notes and drop PDFs in Obsidian, then rebuild, and the site shows them.

## Quick start

```sh
npm install
npm run dev            # → http://localhost:5173, rebuilds + reloads when you save
npm run dev -- --host  # same, also reachable from phones on your Wi-Fi
npm run build          # static site in dist/
```

## Adding content

Open `content/` as a vault in Obsidian (*Open folder as vault*).

```
content/
├── Accueil.md                  ← message on the home page (optional)
├── _templates/                 ← Obsidian templates (ignored by the site)
├── _assets/                    ← images/attachments only used through embeds
└── Analyse/                    ← one folder = one matière
    ├── Analyse.md              ← matière card: icon, color, prof, description
    ├── Analyse.canvas          ← optional custom board (becomes a tab)
    ├── Cours/Chapitre 1 - Suites.md
    ├── TD/TD 1 - Suites.md
    ├── TP/TP 1.pdf             ← PDFs, images, .zip, .py… are documents too
    ├── Corrections/Correction TD 1.md
    ├── Résumés/Fiche.md
    └── Examens/Examen 2025.pdf
```

The **type** comes from the sub-folder name (accents and plurals don't matter):

| Type | Folder names recognised |
|---|---|
| Cours | `Cours`, `Chapitres`, `Leçons` |
| TD | `TD`, `Exercices`, `Séries` |
| TP | `TP`, `Labs`, `Travaux pratiques` |
| Correction | `Corrections`, `Corrigés`, `Solutions` |
| Résumé | `Résumés`, `Fiches`, `Synthèses`, `Révisions` |
| Examen | `Examens`, `DS`, `Devoirs`, `Contrôles`, `Partiels` |

If there's no type folder, the first word of the filename is used ("TP1 - Tri.pdf" → TP). You can also set `type:` in the note's properties.

**Corrections pair up automatically.** "Correction TD 1" links to "TD 1 - Suites", the TD page gets a *voir la correction* button, and the matière map puts the two side by side. If the names don't match, add `pour: "[[TD 1 - Suites]]"` to the correction.

### Properties

| Note property | Effect |
|---|---|
| `titre` | display title (default: filename, or the note's first `# heading`) |
| `type` | force the type |
| `date` | shown on the note, used for "nouveautés" |
| `tags`, `aliases` | as in Obsidian |
| `ordre` | sort order inside its type |
| `pour` | the énoncé a correction belongs to |

| Matière note (`Analyse/Analyse.md`) | Effect |
|---|---|
| `icone` | short code shown as the matière badge, e.g. `ML` |
| `couleur` | `mauve`, `blue`, `peach`, `green`, `pink`, `teal`, `yellow`, `red`, `sky`, `lavender`, `flamingo`, `sapphire` or a hex color |
| `prof`, `description` | shown on the matière page |
| `ordre` | position in the bar (also sets the `Alt 1…9` shortcut) |

### Supported Obsidian syntax

`[[wikilinks]]`, `[[note#section|alias]]`, embeds (`![[image.png|300]]`, `![[cours.pdf]]`, `![[other note]]`, `![[note#section]]`), callouts (`> [!tip]`, foldable `> [!note]-`, plus French ones: `definition`, `theoreme`, `propriete`, `remarque`, `methode`, `exemple`), math `$…$` / `$$…$$`, highlighted code, mermaid diagrams, `==highlights==`, `#tags`, task lists (students can tick them), `%%comments%%`.

**Each matière stands alone.** The graph never links two matières: a `[[link]]` to a note of another matière is shown as plain text, without an edge or a backlink, and `npm run build` lists every such link so you can reword it.

Each matière gets an auto-generated **carte** (canvas) laid out by type. Any `.canvas` file you make in Obsidian inside a matière folder becomes an extra tab, with the same format and colors.

## Customising — `site.config.json`

- `title`, `classe`, `description`: the texts on the home page
- `theme` / `accent`: defaults for first-time visitors (`mocha`, `macchiato`, `latte`, `rose-pine`, `dawn`, `tokyo-night`, `gruvbox`, `nord`, `everforest`)
- `wallpaper`: a path inside `content/` (e.g. `_assets/wall.jpg`) or a URL
- `pomodoro`: default durations in minutes
- `musicApp`: turns on the **chansons** panel (headphones icon in the top bar, `c`; `m` plays / pauses). Remove the key to hide it.
  ```json
  "musicApp": { "name": "Metrolist", "url": "http://localhost:4747", "android": "com.metrolist.music", "fallback": "https://music.youtube.com/" }
  ```
  Search any song and it plays right here, on the site, while you keep studying: it carries on from page to page (mini player in the corner), and similar songs follow. The study room has the same panel; in the launcher (`ctrl k`), type a song and pick « Jouer … ».
  - Search and audio come from [Metrolist Web](https://github.com/MetrolistGroup/Metrolist) (`url`), a small app in `~/Projects/metrolist` that must run on the same computer (a website alone can't reach YouTube Music). `~/Projects/metrolist/scripts/install-desktop.sh --service` starts it at every login. Chrome may ask once whether the site may access apps on your device: allow it.
  - On a phone there is no Metrolist Web, so the panel says so and offers to open the Metrolist app on Android (`android` is its package name) or `fallback` on iPhone.
- `collab`: `{ "url": "https://…workers.dev" }`, the address of the additions server (next section). Without it, the site has no additions.

The ambient sounds of the study room (rain, fire, waves, wind, brown noise) are generated in the browser, so there are no audio files to host.

## Ajouts de la classe (live)

Anyone on the site can add a **note** or a **link** to any node: a matière, a cours, a TP, a PDF, or another addition (replies nest). It reaches everyone in a fraction of a second, and shows up:

- in the *ajouts de la classe* thread at the bottom of every matière, note and document page;
- in the graph, as small nodes hanging off the node they were added to (right-click any node to add to it);
- on the matière carte, as a counter on each card (right-click a card to add to it);
- in the home page activity feed and in the launcher search.

The pill in the top bar shows how many people are online (click it for who is on which matière, your name, and the moderation key); each matière header shows how many are on it. An addition can only be edited or deleted from the browser that wrote it, or by whoever has the moderation key. Text is never treated as HTML; `**bold**`, `` `code` ``, lists and `[[title of a note]]` (same matière only) work.

**It stays smooth for a whole class.** Tested locally with 250 browsers at once, 150 of them adding all the time (20 additions a second): every addition confirmed and delivered to the others in under 50 ms (p95), none refused, lost or duplicated. When all 250 were cut off and came back within 3 seconds, each reconnected in under 40 ms and got what was written during the cut. On the student's side:

- what you have already seen is kept in your browser, so pages show at once, even offline;
- what you add is saved in your browser first and sent until the server confirms it: a bad connection, a closed laptop or a reload never loses it, and retries never duplicate it;
- the connection comes back by itself, spread out so 150 phones don't all knock at the same second; on networks that block live connections it switches to checking every 15 s;
- after the first visit, a service worker keeps the whole site (every note and its data) on the device, so it opens even without Wi-Fi. PDFs are kept once opened.

### Turning it on (once, free)

The server is in `worker/`: a Cloudflare Worker with one Durable Object (a SQLite database plus live connections that cost nothing while idle). The free Cloudflare plan is enough.

```sh
cd worker
npm install
npx wrangler login     # opens the browser to sign in to Cloudflare (free account)
npx wrangler deploy    # prints the address, e.g. https://ghir-a9ra-barka-collab.<you>.workers.dev
```

Put that address in `site.config.json` (`"collab": { "url": "https://ghir-a9ra-barka-collab.<you>.workers.dev" }`) and push.

Optional secrets, set from `worker/`:

| Command | Effect |
|---|---|
| `npx wrangler secret put ADMIN_KEY` | moderation key: type it in the online pill → *modération* to delete any addition; also needed for backups |
| `npx wrangler secret put CLASS_CODE` | a code students type once before they can add anything (reading stays open to all) |

`ALLOWED_ORIGINS` in `worker/wrangler.jsonc` lists the sites allowed to use the server (the GitHub Pages address and localhost). Change it if the site moves.

- **Backup:** `curl "https://ghir-a9ra-barka-collab.<you>.workers.dev/api/export?admin=<ADMIN_KEY>" > ajouts.json`
- **Limits** (keep it tidy and the server safe): 8,000 characters per addition, 400 additions under one node, 20,000 in total, and one addition every 4 seconds per browser on average (bursts of 12 are fine).
- **Local test:** `npm run dev` in `worker/` (port 8790), then in the site's browser console `localStorage['cozy.collab.url'] = '"http://localhost:8790"'` and reload. `npm test` in `worker/` runs the protocol tests and the 250-browser load test against it.

## Putting it online for the class (GitHub Pages)

1. Create a GitHub repo and push this folder to its `main` branch.
2. In the repo, go to **Settings → Pages → Source** and choose **GitHub Actions**.
3. Every push now rebuilds and publishes the site at `https://<you>.github.io/<repo>/` (see `.github/workflows/deploy.yml`). Share that link with the class.

Netlify, Vercel and Cloudflare Pages work as well: build command `npm run build`, output folder `dist`.

> The site is **public to anyone with the link**, and so are the additions (set a `CLASS_CODE` to limit who can write). For a private site, Cloudflare Pages + Cloudflare Access (free for small groups) can restrict it to your classmates' emails.

## What's saved where

The additions (and only them) live on the server in `worker/`. Everything else, each student's progress (notes marked *vu*, ticked tasks), pomodoro stats, to-dos, theme and canvas card positions, stays **in their own browser** (localStorage). There's no account: a random key in the browser is what lets you edit your own additions, so clearing the browser's data means you can no longer edit the old ones.

## Shortcuts

| Key | Action |
|---|---|
| `Ctrl K` or `/` | launcher (search notes, matières, actions; `Tab` switches mode) |
| `Alt 1…9` | jump to a matière |
| `Ctrl B` | toggle the sidebar |
| `g` / `e` / `h` | graph / study room / home |
| `p` | start or pause the pomodoro |
| `c` / `m` | chansons panel / play or pause the song |
| `Ctrl Enter` | send an addition (`Esc` cancels) |

## Project layout

```
scripts/build.mjs   vault → dist/ (markdown, links, canvases, search index)
scripts/dev.mjs     local server with live reload
src/                the site itself (vanilla JS modules, no framework)
  js/views/         home, matière, note, addition, graph, canvas, study room
  js/graph.js       force-directed graph · js/jcanvas.js  JSON Canvas renderer
  js/collab.js      additions: cache, outbox, live connection · js/contribs.js  their UI
  js/songs.js       chansons panel + mini player (through Metrolist Web) · js/audio.js  ambient sound synth
  sw.js             offline copy of the site (the build fills in the file list)
  css/style.css     everything visual
worker/             the additions server (Cloudflare Worker + Durable Object) and its tests
```
