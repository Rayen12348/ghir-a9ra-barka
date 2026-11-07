// Page of one addition: where it hangs, what it says, its replies, and a form to add under it.
import { matieres, cssColor } from '../data.js';
import { collab, contribTitle, isMine, canDelete } from '../collab.js';
import { mountThread, renderText, ago, nodeLabel, nodeHref, composer } from '../contribs.js';
import { icon } from '../icons.js';
import { esc } from '../util.js';
import { notFound } from './notfound.js';

export function renderContrib(view, { params: [id] }) {
  if (!collab.enabled) return notFound(view, 'Les ajouts de la classe ne sont pas activés sur ce site.');
  let offThread = null;
  let editor = null; // the edit form, while open

  const paint = () => {
    const n = collab.nodes.get(id);
    if (!n) {
      offThread?.();
      offThread = null;
      notFound(view, collab.state === 'online' || collab.v ? 'Cet ajout est introuvable : il a peut-être été supprimé.' : 'Cet ajout n’est pas encore arrivé… (connexion en cours)');
      return;
    }
    const m = matieres.get(n.matiere);
    // Path from the matière down to this addition.
    const chain = [];
    for (let p = n.parent, guard = 0; p && guard < 30; guard++) {
      chain.unshift(p);
      const up = collab.nodes.get(p);
      p = up ? up.parent : null;
    }
    const crumbs = [m ? `<a href="#/m/${m.id}">${esc(m.name)}</a>` : '', ...chain.filter((c) => c !== `m:${n.matiere}`).map((c) => `<a href="${nodeHref(c)}">${esc(nodeLabel(c))}</a>`)].filter(Boolean);
    const host = view.querySelector('.contrib-page');
    if (!host || host.dataset.id !== id) {
      offThread?.();
      view.innerHTML = `<div class="page contrib-page" data-id="${id}" style="--c:${m ? cssColor(m.color) : 'var(--accent)'}">
        <nav class="crumbs"></nav>
        <article class="card contrib-main"></article>
        <section class="thread-host"></section>
      </div>`;
      offThread = mountThread(view.querySelector('.thread-host'), { parent: id, matiere: n.matiere, label: contribTitle(n) });
    }
    view.querySelector('.crumbs').innerHTML = crumbs.join(icon('chevron'));
    if (editor) return;
    view.querySelector('.contrib-main').innerHTML = n.deleted
      ? `<h1 class="note-title">Ajout supprimé</h1><p class="muted">Son auteur l’a retiré. Les réponses restent visibles ci-dessous.</p>`
      : `<div class="note-meta"><span class="badge" style="--c:var(--pink)">${n.kind === 'lien' ? 'lien' : 'note'} de la classe</span>
          <span>${icon('type')} ${esc(n.author || 'anonyme')}</span><span>${icon('clock')} ${ago(n.created)}</span>
          ${n.pending ? `<span class="ct-wait">${icon('clock')} en attente d’envoi</span>` : ''}</div>
        <h1 class="note-title">${esc(contribTitle(n))}</h1>
        ${n.body ? `<div class="prose ct-body">${renderText(n.body, n.matiere)}</div>` : ''}
        ${n.url ? `<a class="ct-link big" href="${esc(n.url)}" target="_blank" rel="noopener nofollow ugc">${icon('external')}<span><b>ouvrir le lien</b><small>${esc(n.url)}</small></span></a>` : ''}
        <p class="muted small contrib-where">${icon('reply')} ajouté à <a href="${nodeHref(n.parent)}">${esc(nodeLabel(n.parent))}</a></p>
        <footer class="ct-actions">
          ${isMine(n) ? `<button data-edit>${icon('pencil')} modifier</button>` : ''}
          ${canDelete(n) ? `<button data-del>${icon('trash')} supprimer</button>` : ''}
        </footer>`;
  };

  const onClick = (e) => {
    const b = e.target.closest('.contrib-main button');
    const n = collab.nodes.get(id);
    if (!b || !n || b.closest('form')) return;
    if (b.hasAttribute('data-edit')) {
      const main = view.querySelector('.contrib-main');
      editor = composer({ node: n, parent: n.parent, matiere: n.matiere, onDone: () => {
        editor = null;
        paint();
      } });
      main.innerHTML = '';
      main.append(editor);
    } else if (b.hasAttribute('data-del')) {
      if (!b.dataset.armed) {
        b.dataset.armed = '1';
        b.classList.add('armed');
        b.innerHTML = `${icon('trash')} sûr ? clique encore`;
        return;
      }
      collab.remove(id);
    }
  };
  view.addEventListener('click', onClick);

  paint();
  const off = collab.events.on(() => {
    if (view.isConnected) paint();
  });
  return () => {
    off();
    offThread?.();
    editor?.cleanup?.();
    view.removeEventListener('click', onClick);
  };
}
