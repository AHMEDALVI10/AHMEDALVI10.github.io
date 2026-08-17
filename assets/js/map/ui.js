/* ============================================================
   Sakib Ahmed — Navigable Map
   assets/js/map/ui.js
   ------------------------------------------------------------
   The DOM half. Labels, detail panel, index drawer, legend,
   keyboard control, theme toggle.

   The important design decision here: node labels are real
   <button> elements in the document, positioned each frame over
   their 3D node. That means the map is fully operable with a
   keyboard and legible to a screen reader — you Tab through the
   graph in a sensible order (me → domains → projects → chapters
   → frontiers) and press Enter to travel to a node. A canvas
   alone would be a dead end for both.
   ============================================================ */

import { NODES, BY_ID, NEIGHBOURS, TYPES, sortedNodes } from './graph.js';

const TYPE_LABEL = {
  core: 'Core',
  domain: 'Domain',
  project: 'Project',
  chapter: 'Chapter',
  frontier: 'Frontier',
};

/* Labels for distant project/chapter nodes are hidden to stop the
   screen turning into soup. Hubs always stay legible.            */
const LABEL_CUTOFF = { core: 1e9, domain: 1e9, project: 76, chapter: 86, frontier: 76 };

/* When two labels overlap on screen, the lower number wins and the
   other is dropped for that frame. Without this the centre of the
   graph becomes an unreadable pile of stacked pills.              */
const LABEL_PRIORITY = { core: 0, domain: 1, chapter: 2, project: 3, frontier: 4 };

export function createUI(refs) {
  const world = refs.world;                  // set by boot.js after construction
  const els = {
    labels: document.getElementById('labels'),
    panel: document.getElementById('panel'),
    panelBody: document.getElementById('panelBody'),
    panelClose: document.getElementById('panelClose'),
    index: document.getElementById('index'),
    indexList: document.getElementById('indexList'),
    indexToggle: document.getElementById('indexToggle'),
    search: document.getElementById('search'),
    themeToggle: document.getElementById('themeToggle'),
    help: document.getElementById('help'),
    helpToggle: document.getElementById('helpToggle'),
    hint: document.getElementById('hint'),
    live: document.getElementById('live'),
    homeBtn: document.getElementById('homeBtn'),
    count: document.getElementById('nodeCount'),
  };

  /* ── node labels ──────────────────────────────────────────── */

  const labelFor = new Map();

  sortedNodes().forEach(function (n) {
    const b = document.createElement('button');
    b.className = 'lbl lbl--' + n.type;
    b.type = 'button';
    b.dataset.id = n.id;
    b.setAttribute('aria-label', n.title + ' — ' + TYPE_LABEL[n.type]);

    const dot = document.createElement('span');
    dot.className = 'lbl__dot';
    const txt = document.createElement('span');
    txt.className = 'lbl__txt';
    txt.textContent = n.title;

    b.appendChild(dot);
    b.appendChild(txt);

    b.addEventListener('click', function (e) {
      e.stopPropagation();
      world.select(n.id);
    });
    b.addEventListener('focus', function () {
      /* keyboard focus should reveal the label even if it's culled */
      b.classList.add('is-forced');
    });
    b.addEventListener('blur', function () {
      b.classList.remove('is-forced');
    });

    els.labels.appendChild(b);
    labelFor.set(n.id, b);
  });

  if (els.count) els.count.textContent = String(NODES.length);

  /* Label boxes are static text, so measure once rather than reading
     layout 28 times a frame. Re-measured after webfonts land, since
     Space Grotesk / JetBrains Mono change the widths.               */
  const boxes = new Map();
  function measure() {
    labelFor.forEach(function (b, id) {
      const prev = b.style.opacity;
      b.style.opacity = '0';
      boxes.set(id, { w: b.offsetWidth || 120, h: b.offsetHeight || 24 });
      b.style.opacity = prev;
    });
  }
  measure();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(measure).catch(function () {});
  }
  window.addEventListener('resize', function () { setTimeout(measure, 200); });

  const placed = [];

  /** Called once per rendered frame by world.js. */
  function onFrame(screen) {
    /* --- pass 1: who is even a candidate this frame --- */
    const cands = [];
    screen.forEach(function (rec, id) {
      const b = labelFor.get(id);
      if (!b) return;
      const n = BY_ID.get(id);
      const forced = b.classList.contains('is-forced') || rec.hot;

      if (!rec.visible || (!forced && rec.dist > LABEL_CUTOFF[n.type])) {
        hide(b);
        return;
      }
      cands.push({ id: id, b: b, n: n, rec: rec, forced: forced });
    });

    /* --- pass 2: nearest and most important get the space --- */
    cands.sort(function (a, b) {
      if (a.forced !== b.forced) return a.forced ? -1 : 1;
      const p = LABEL_PRIORITY[a.n.type] - LABEL_PRIORITY[b.n.type];
      if (p !== 0) return p;
      return a.rec.dist - b.rec.dist;
    });

    placed.length = 0;

    cands.forEach(function (c) {
      const near = Math.max(0, Math.min(1, 1 - (c.rec.dist - 26) / 120));
      const s = 0.86 + near * 0.22;
      const box = boxes.get(c.id) || { w: 120, h: 24 };
      const w = box.w * s + 2;
      const h = box.h * s + 2;
      const x = c.rec.x, y = c.rec.y;

      /* forced labels (focused or hovered) always win their space */
      if (!c.forced) {
        for (let i = 0; i < placed.length; i++) {
          const q = placed[i];
          if (Math.abs(x - q.x) < (w + q.w) / 2 && Math.abs(y - q.y) < (h + q.h) / 2) {
            hide(c.b);
            return;
          }
        }
      }
      placed.push({ x: x, y: y, w: w, h: h });

      c.b.style.transform = 'translate3d(' + Math.round(x) + 'px,' + Math.round(y) +
        'px,0) translate(-50%,-50%) scale(' + s.toFixed(3) + ')';
      c.b.style.opacity = String((c.rec.hot ? 1 : 0.64 + near * 0.36) * (c.rec.dim < 1 ? 0.42 : 1));
      c.b.style.pointerEvents = 'auto';
      c.b.style.zIndex = String(500 - Math.round(c.rec.dist));
      c.b.classList.toggle('is-hot', !!c.rec.hot);
    });
  }

  function hide(b) {
    if (b.style.opacity !== '0') {
      b.style.opacity = '0';
      b.style.pointerEvents = 'none';
    }
  }

  /* ── detail panel ─────────────────────────────────────────── */

  function chipList(arr, cls) {
    if (!arr || !arr.length) return '';
    return '<ul class="' + cls + '">' + arr.map(function (c) {
      return '<li>' + esc(c) + '</li>';
    }).join('') + '</ul>';
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderPanel(id) {
    const n = BY_ID.get(id);
    if (!n) return;

    const near = (NEIGHBOURS.get(id) || []).map(function (e) { return BY_ID.get(e.id); })
      .filter(Boolean);

    let html = '';
    html += '<p class="p__type"><span class="p__swatch p__swatch--' + n.type + '"></span>' +
            esc(TYPE_LABEL[n.type]) + (n.when ? ' · ' + esc(n.when) : '') + '</p>';
    if (n.eyebrow) html += '<p class="p__eyebrow">' + esc(n.eyebrow) + '</p>';
    html += '<h2 class="p__title">' + esc(n.title) +
            (n.badge ? ' <span class="badge badge--live">' + esc(n.badge) + '</span>' : '') + '</h2>';
    if (n.blurb) html += '<p class="p__blurb">' + esc(n.blurb) + '</p>';

    if (n.arch && n.arch.length) {
      html += '<div class="p__arch" aria-label="Architecture">' +
        n.arch.map(function (a) { return '<code>' + esc(a) + '</code>'; }).join('<span>→</span>') +
        '</div>';
    }

    if (n.points && n.points.length) {
      html += '<ul class="p__points">' + n.points.map(function (p) {
        return '<li>' + esc(p) + '</li>';
      }).join('') + '</ul>';
    }

    if (n.chips && n.chips.length) {
      html += '<p class="p__lbl">Stack</p>' + chipList(n.chips, 'p__chips');
    }

    if (n.note) html += '<p class="p__note">' + esc(n.note) + '</p>';

    if (near.length) {
      html += '<p class="p__lbl">Connected to</p><div class="p__links">' +
        near.map(function (m) {
          return '<button type="button" class="p__link p__link--' + m.type +
                 '" data-goto="' + esc(m.id) + '">' +
                 '<span class="p__swatch p__swatch--' + m.type + '"></span>' + esc(m.title) + '</button>';
        }).join('') + '</div>';
    }

    if (n.anchor) {
      html += '<a class="p__page" href="' + esc(n.anchor) + '">' +
              'Read this on the full page' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>';
    }

    els.panelBody.innerHTML = html;

    els.panelBody.querySelectorAll('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        world.select(btn.dataset.goto);
      });
    });

    els.panel.classList.add('is-open');
    els.panel.setAttribute('aria-hidden', 'false');
    announce(n.title + '. ' + TYPE_LABEL[n.type] + '. ' + (n.blurb || ''));
    dismissHint();
  }

  function closePanel() {
    els.panel.classList.remove('is-open');
    els.panel.setAttribute('aria-hidden', 'true');
  }

  /** world.js calls this on select/deselect. */
  function onSelect(id) {
    if (id) renderPanel(id);
    else closePanel();

    labelFor.forEach(function (b, key) {
      b.classList.toggle('is-selected', key === id);
      b.setAttribute('aria-pressed', String(key === id));
    });

    els.indexList.querySelectorAll('[data-id]').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.id === id);
    });
  }

  els.panelClose.addEventListener('click', function () { world.deselect(); });

  /* ── hover readout ────────────────────────────────────────── */

  function onHover(id) {
    /* nothing heavy — the 3D layer already scales the node. Labels
       react through the is-hot class in onFrame().                */
    document.body.classList.toggle('is-pointing', !!id);
  }

  /* ── index drawer ─────────────────────────────────────────── */

  const GROUPS = [
    { type: 'core', title: 'Centre' },
    { type: 'domain', title: 'Domains' },
    { type: 'project', title: 'Projects' },
    { type: 'chapter', title: 'Chapters' },
    { type: 'frontier', title: 'Frontiers' },
  ];

  GROUPS.forEach(function (g) {
    const of = NODES.filter(function (n) { return n.type === g.type; });
    if (!of.length) return;

    const h = document.createElement('p');
    h.className = 'ix__head';
    h.innerHTML = '<span class="p__swatch p__swatch--' + g.type + '"></span>' + g.title +
                  ' <i>' + of.length + '</i>';
    els.indexList.appendChild(h);

    of.forEach(function (n) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ix__item';
      b.dataset.id = n.id;
      b.dataset.search = (n.title + ' ' + (n.eyebrow || '') + ' ' + (n.chips || []).join(' ')).toLowerCase();
      b.innerHTML = '<b>' + esc(n.title) + '</b>' +
                    (n.eyebrow ? '<i>' + esc(n.eyebrow) + '</i>' : '');
      b.addEventListener('click', function () {
        world.select(n.id);
        if (window.innerWidth < 860) closeIndex();
      });
      els.indexList.appendChild(b);
    });
  });

  function openIndex() {
    els.index.classList.add('is-open');
    els.indexToggle.setAttribute('aria-expanded', 'true');
  }
  function closeIndex() {
    els.index.classList.remove('is-open');
    els.indexToggle.setAttribute('aria-expanded', 'false');
  }
  els.indexToggle.addEventListener('click', function () {
    els.index.classList.contains('is-open') ? closeIndex() : openIndex();
  });

  /* ── search ───────────────────────────────────────────────── */

  els.search.addEventListener('input', function () {
    const q = els.search.value.trim().toLowerCase();
    let shown = 0;
    els.indexList.querySelectorAll('.ix__item').forEach(function (b) {
      const hit = !q || b.dataset.search.indexOf(q) !== -1;
      b.hidden = !hit;
      if (hit) shown++;
    });
    els.indexList.querySelectorAll('.ix__head').forEach(function (h) {
      /* hide a group heading when everything under it is filtered out */
      let sib = h.nextElementSibling, any = false;
      while (sib && sib.classList.contains('ix__item')) {
        if (!sib.hidden) { any = true; break; }
        sib = sib.nextElementSibling;
      }
      h.hidden = !any;
    });
    announce(shown + ' of ' + NODES.length + ' nodes match');
  });

  els.search.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      const first = els.indexList.querySelector('.ix__item:not([hidden])');
      if (first) { world.select(first.dataset.id); }
    }
  });

  /* ── theme ────────────────────────────────────────────────── */

  const KEY = 'sa-theme';
  const root = document.documentElement;

  function syncMeta(m) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', m === 'dark' ? '#07090f' : '#f6f8fc');
  }

  els.themeToggle.addEventListener('click', function () {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    syncMeta(next);
    try { localStorage.setItem(KEY, next); } catch (_) {}
    world.setTheme(next);
  });

  /* ── help ─────────────────────────────────────────────────── */

  els.helpToggle.addEventListener('click', function () {
    const open = els.help.classList.toggle('is-open');
    els.helpToggle.setAttribute('aria-expanded', String(open));
    els.help.setAttribute('aria-hidden', String(!open));
  });

  els.homeBtn.addEventListener('click', function () {
    world.home();
    announce('Returned to the centre of the map');
  });

  /* ── first-visit hint ─────────────────────────────────────── */

  let hintGone = false;
  function dismissHint() {
    if (hintGone || !els.hint) return;
    hintGone = true;
    els.hint.classList.add('is-gone');
  }
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(function (ev) {
    window.addEventListener(ev, dismissHint, { once: true, passive: true });
  });
  setTimeout(dismissHint, 9000);

  /* ── keyboard ─────────────────────────────────────────────── */

  window.addEventListener('keydown', function (e) {
    const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');

    if (e.key === 'Escape') {
      if (els.help.classList.contains('is-open')) {
        els.help.classList.remove('is-open');
        els.helpToggle.setAttribute('aria-expanded', 'false');
        els.help.setAttribute('aria-hidden', 'true');
      } else if (els.panel.classList.contains('is-open')) {
        world.deselect();
      } else if (els.index.classList.contains('is-open')) {
        closeIndex();
      }
      return;
    }

    if (typing) return;

    switch (e.key) {
      case 'ArrowLeft':  world.orbitBy(-0.12, 0); e.preventDefault(); break;
      case 'ArrowRight': world.orbitBy(0.12, 0); e.preventDefault(); break;
      case 'ArrowUp':    world.orbitBy(0, -0.09); e.preventDefault(); break;
      case 'ArrowDown':  world.orbitBy(0, 0.09); e.preventDefault(); break;
      case '+': case '=': world.zoomBy(0.86); break;
      case '-': case '_': world.zoomBy(1.16); break;
      case 'h': case 'H': world.home(); break;
      case '/':
        openIndex();
        els.search.focus();
        e.preventDefault();
        break;
      default: break;
    }
  });

  /* ── screen-reader announcements ──────────────────────────── */

  let liveT = null;
  function announce(msg) {
    if (!els.live) return;
    clearTimeout(liveT);
    liveT = setTimeout(function () { els.live.textContent = msg; }, 120);
  }

  return {
    onFrame: onFrame,
    onSelect: onSelect,
    onHover: onHover,
    announce: announce,
  };
}
