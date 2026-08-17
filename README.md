# Sakib Ahmed — Personal Website

Personal site for **Sakib Ahmed**, IoT & AI Systems Engineer.

It ships as **two views of the same content**:

| | | |
|---|---|---|
| **`/`** | `index.html` | A navigable 3D **map** — seven engineering domains, thirteen systems, four chapters and three open questions, drawn as one connected graph you fly through. Three.js / WebGL. |
| **`/page.html`** | `page.html` | The same material as an ordinary **scrolling page** — semantic, crawlable, and it prints as a clean CV. |

Both link to each other from the header, and both read the same `sa-theme`
localStorage key, so the light/dark choice follows you between them.

No build step, no `npm install`, no CDN at runtime. Three.js is vendored into the
repo. Push the folder, flip Pages on, and it's live.

---

## Structure

```
AHMEDALVI10.github.io/
├── index.html                  # the MAP (landing view)
├── page.html                   # the scrolling page (was index.html)
├── 404.html
├── robots.txt · sitemap.xml · .nojekyll · .gitignore
└── assets/
    ├── css/
    │   ├── style.css           # tokens, themes, and every style the page uses
    │   └── map.css             # the map's own chrome only (loaded after style.css)
    ├── js/
    │   ├── main.js             # page.html behaviour (unchanged, no dependencies)
    │   ├── vendor/
    │   │   └── three.module.min.js    # Three.js r169, pinned & committed (687 KB)
    │   └── map/
    │       ├── graph.js        # ← THE CONTENT. Nodes, edges, copy, layout.
    │       ├── world.js        # Three.js scene, camera rig, hit-testing
    │       ├── ui.js           # labels, detail panel, index, keyboard
    │       └── boot.js         # entry point, theme init, WebGL fallback
    └── img/                    # portrait, square crop, og-image, favicon
```

`information/` holds the raw source material (CVs, profile notes, original photo).
**It is deliberately gitignored** — the PDFs contain your phone number, and everything
in a Pages repo is publicly downloadable.

---

## Editing the map

**Everything you'd want to change lives in [`assets/js/map/graph.js`](assets/js/map/graph.js).**
It is the single source of truth: node titles, descriptions, bullet points, stacks,
notes and which things connect to which. `world.js` just draws it.

### Node types

| Type | Colour | What it means |
|---|---|---|
| `core` | white | You. One node, at the centre. |
| `domain` | cyan | An engineering discipline. Seven hubs. |
| `project` | violet | Something actually built. |
| `chapter` | mint | A period of time — job or degree. |
| `frontier` | amber | An open question you're moving toward, not a finished thing. |

### Adding a project

Append to `NODES`:

```js
{
  id: 'my-thing',                       // unique; also the deep-link (/#my-thing)
  type: 'project',
  title: 'The Thing',
  eyebrow: 'Computer Vision · Production',
  badge: 'Live',                        // optional pill
  blurb: 'One paragraph.',
  arch: ['Camera', 'Detect', 'OCR'],    // optional pipeline chain
  points: ['A specific, quantified result.'],
  chips: ['Python', 'YOLO'],
  note: 'Private repository',
  anchor: 'page.html#work',             // where to read it on the page
}
```

Then wire it into `EDGES` — a node with no edges floats unconnected:

```js
['my-thing', 'vision', 'built'],       // project → domain
['magnetism', 'my-thing', 'when'],     // chapter → project
['my-thing', 'anpr', 'lineage'],       // shared lineage with another project
```

Edge kinds (`spine`, `weave`, `built`, `lineage`, `when`, `time`, `reach`) only
control colour and brightness — see `EDGE_KINDS`.

### Switching the map background

Four backgrounds are built and live in `map.css` § 1b. Change one attribute on
`<body>` in `index.html`:

```html
<body class="map" data-bg="sonar">
```

| Value | Look |
|---|---|
| `sonar` | Concentric range rings from the centre + a slow radar sweep **(current)** |
| `aurora` | Smooth diagonal violet → teal → mint wash, drifting |
| `blueprint` | Fine 34px grid with a bolder 170px major grid, CAD-like |
| `deep` | No structure — broad colour fields and an edge falloff only |

All four reuse the same `.bg-layer` markup and hide the parts they don't need, and
all four are covered by the `prefers-reduced-motion` block (the sweep and the
aurora drift both stop).

> If you write a new variant that restyles `.bg-grid`, **reset `background-size`**.
> `style.css` sets it to `64px 64px` for the page's grid, which silently tiles any
> larger pattern into 64px cells and makes it vanish.

### Positions are grown, not authored

There are no hand-placed coordinates. `layout()` seeds nodes into per-type shells
and runs ~220 iterations of spring + repulsion relaxation from a **fixed random
seed**, so the arrangement looks organic but is byte-identical on every device and
every reload. Add a node and the graph re-settles around it.

To spread things out or pull them in, edit `SHELL` (radius and vertical band per
type) and `MIN_GAP`.

### Editing the page

`page.html` is unchanged from the original single-page site — same sections, same
`main.js`. See the section table further down.

> **Content lives in two places now.** `graph.js` and `page.html` each hold their own
> copy of the project text. If you change a project description, change it in both,
> or the two views will disagree.

---

## Controls

| | |
|---|---|
| Drag | Orbit |
| Scroll / pinch | Zoom |
| Click / tap | Travel to a node |
| `Tab` | Step through every node in reading order |
| `↑ ↓ ← →` | Orbit by keyboard |
| `+` `−` | Zoom by keyboard |
| `/` | Open and focus the index search |
| `H` | Back to centre |
| `Esc` | Close whatever is open |

Deep links work: `https://ahmedalvi10.github.io/#medical` opens straight into that
node, and selecting a node updates the URL (via `replaceState`, so it doesn't
pile up history entries).

---

## Accessibility & degradation

This was the main reason the scrolling page was kept rather than replaced.

- **Node labels are real `<button>`s** in the DOM, positioned over their 3D node
  each frame. So the map is fully keyboard-operable and legible to a screen
  reader — `Tab` walks the graph, `Enter` travels. A bare `<canvas>` would be a
  dead end for both.
- **Selection is announced** through an `aria-live` region.
- **A text outline** of the whole map sits in `index.html` as visually-hidden but
  real content, so crawlers and no-JS visitors get the substance. `<noscript>`
  reveals it and hides the 3D chrome.
- **No WebGL** → a clear message and a link to `page.html`, rather than a black
  rectangle. Detected before Three.js is even imported.
- **`prefers-reduced-motion`** is honoured throughout: pulses off, no breathing,
  no auto-spin, no camera easing (focus jumps instantly). The map stays fully
  usable — nothing is disabled, only the motion.
- **Print** on the map sends you to the page; `page.html` keeps its CV stylesheet.

---

## Deploying to GitHub Pages

Written for a **user site** at `https://ahmedalvi10.github.io`.

1. Repository named exactly **`AHMEDALVI10.github.io`**, public.
2. `git push origin main`
3. Settings → **Pages** → Source: **Deploy from a branch**, Branch `main`, folder `/ (root)`.

### Using a project repo instead

If the repo is named something else, the site lives at
`https://ahmedalvi10.github.io/<repo>/`. In that case:

- change the absolute paths in `404.html` (`/assets/...` → `assets/...`, `/page.html` → `page.html`)
- update the URLs in `sitemap.xml`, `robots.txt` and the `og:*` / `canonical` tags in both HTML files

### Custom domain

Add a `CNAME` file at the root containing just the domain, point a DNS `CNAME`
record at `ahmedalvi10.github.io`, then set it under Settings → Pages and enable
**Enforce HTTPS**.

---

## Local preview

The map uses ES modules, so it needs to be served — `file://` will fail on CORS.

```bash
python -m http.server 8000
# → http://localhost:8000
```

---

## Editing `page.html`

| What | Where |
|---|---|
| Headline, tagline, status badge | `<section class="hero">` |
| Rotating typewriter phrases | `assets/js/main.js` → `rotator()` → `phrases` |
| Bio paragraphs | `<section id="about">` |
| Stat numbers | `<div class="stats">` → `data-to` attributes |
| Expertise cards | `<section id="expertise">` |
| Projects | `<section id="work">` → `<article class="proj">` |
| Skills | `<section id="skills">` |
| Experience & education | `<section id="journey">` |
| Colours, spacing, radii | `assets/css/style.css` → `:root` tokens |

Accent colours, top of `style.css`:

```css
--c1: #00e5ff;   /* cyan   — primary */
--c2: #6d5dfc;   /* violet — secondary */
--c3: #00f5a0;   /* mint   — live/active */
--c4: #ffb020;   /* amber  — frontier (map only) */
```

The map reads these as literal hex in `graph.js` → `THEME`, because WebGL needs
numbers rather than CSS custom properties. **Change an accent and you must change
it in both places.**

---

## TODO — things only you can fill in

- [ ] **Start date at magnetismtech.** Search `TODO(Sakib)` in `page.html`; the timeline
      entry shows only *Present*. Also `when: 'Present'` on the `magnetism` node in `graph.js`.
- [ ] **Confirm the job title.** Currently *IoT Engineer — R&D*.
- [ ] **Check the contact email.** Both views use `ahmedalvi5418@gmail.com`
      (in `graph.js`, `page.html` and the JSON-LD). Your git identity is a different
      address — make sure the public one is the one you want.
- [ ] **LinkedIn.** Not included — no URL on file.
- [ ] **CV download.** Deliberately omitted: your CV PDF has your phone number on it
      and a Pages repo is fully public. Export a phone-free version to `assets/docs/` if you want it.
- [ ] **Verify the numbers.** The page claims 39 repositories and 276 contributions
      (Aug 2026). Update `data-to` in `page.html` as they change.

---

## Browser support

The map needs **WebGL** and **ES modules** — Chrome/Edge 111+, Firefox 113+,
Safari 16.4+ in practice (the floor is `color-mix()`, used for translucent
surfaces). Anything older gets the no-WebGL card and the page view, both of which
work fine.

Three.js is pinned at **r169**. To update it, replace
`assets/js/vendor/three.module.min.js` and re-check `world.js` — it uses only core
classes (no addons), so upgrades are usually uneventful.

---

© Sakib Ahmed
