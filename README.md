# Sakib Ahmed — Personal Website

Personal portfolio site for **Sakib Ahmed**, IoT & AI Systems Engineer.

Hand-built with plain **HTML, CSS and vanilla JavaScript** — no framework, no build step,
no `npm install`. Push the folder to GitHub, flip Pages on, and it's live.

---

## Structure

```
Personal_Web/
├── index.html              # the entire site (single page, six sections)
├── 404.html                # custom not-found page
├── robots.txt
├── sitemap.xml
├── .nojekyll               # tells GitHub Pages to serve files as-is
├── .gitignore              # keeps information/ out of the public repo
└── assets/
    ├── css/style.css       # all styles + light/dark themes
    ├── js/main.js          # all behaviour (~340 lines, no dependencies)
    └── img/
        ├── sakib-ahmed.jpg         # hero portrait  (640×1138, 80 KB)
        ├── sakib-ahmed-square.jpg  # square crop    (520×520, 41 KB)
        ├── og-image.jpg            # social preview (1200×630, 72 KB)
        └── favicon.svg             # gradient "S" monogram
```

`information/` holds the raw source material (CVs, profile notes, original photo).
**It is deliberately gitignored** — the PDFs contain your phone number, and everything
in a Pages repo is publicly downloadable.

---

## Deploying to GitHub Pages

The site is written for a **user site** at `https://ahmedalvi10.github.io`.

1. Create a public repository named exactly **`AHMEDALVI10.github.io`**.
2. From `G:\Personal_Web`:

   ```bash
   git init
   git add .
   git commit -m "feat: personal website"
   git branch -M main
   git remote add origin https://github.com/AHMEDALVI10/AHMEDALVI10.github.io.git
   git push -u origin main
   ```

3. Repo → **Settings → Pages** → Source: **Deploy from a branch**, Branch: `main`, folder `/ (root)`.
4. Live at `https://ahmedalvi10.github.io` within a minute or two.

### Using a project repo instead

If you'd rather name the repo something like `portfolio`, the site lives at
`https://ahmedalvi10.github.io/portfolio/`. In that case:

- change the absolute paths in `404.html` (`/assets/...` → `assets/...`)
- update the URLs in `sitemap.xml`, `robots.txt` and the `<meta property="og:*">` tags

### Custom domain

Add a file named `CNAME` at the root containing just your domain (e.g. `sakibahmed.dev`),
point a DNS `CNAME` record at `ahmedalvi10.github.io`, then set the domain under
Settings → Pages and enable **Enforce HTTPS**.

---

## Local preview

Open `index.html` directly, or serve it (nicer, avoids any file:// quirks):

```bash
python -m http.server 8000
# → http://localhost:8000
```

---

## Editing guide

Everything is in `index.html`, in reading order. The bits you'll actually touch:

| What | Where |
|---|---|
| Headline, tagline, status badge | `<section class="hero">` |
| Rotating typewriter phrases | `assets/js/main.js` → `rotator()` → `phrases` array |
| Bio paragraphs | `<section id="about">` |
| Stat numbers | `<div class="stats">` → `data-to` attributes |
| Expertise cards | `<section id="expertise">` |
| Projects | `<section id="work">` → `<article class="proj">` blocks |
| Skills | `<section id="skills">` |
| Experience & education | `<section id="journey">` |
| Colours, spacing, radii | `assets/css/style.css` → `:root` tokens at the top |

### Adding a project

Copy any `<article class="proj">` block. Two attributes matter:

- `data-cat="vision iot backend"` — space-separated filter categories.
  Valid values: `vision`, `iot`, `backend`, `ai`, `hardware`.
- `class="proj proj--wide"` — makes the card span two columns (used for flagship work).

### Changing the accent colours

Top of `style.css`:

```css
--c1: #00e5ff;   /* cyan   — primary   */
--c2: #6d5dfc;   /* violet — secondary */
--c3: #00f5a0;   /* mint   — live/active indicators */
```

Light-theme equivalents sit just below under `:root[data-theme="light"]`.

---

## TODO — things only you can fill in

- [ ] **Start date at magnetismtech.** The timeline entry currently shows only *Present*.
      Search `TODO(Sakib)` in `index.html` and change the `<span class="badge badge--live">Present</span>`
      to something like `<b>2024 — Present</b>`.
- [ ] **Confirm the job title.** Currently *IoT Engineer — R&D*, based on how you've described
      the role. Swap it for your official title if it differs.
- [ ] **LinkedIn.** Not included — no URL on file. To add it, copy the GitHub `<a class="btn btn--ghost">`
      in the contact section and change the `href`.
- [ ] **CV download.** Deliberately omitted: your CV PDF has your phone number on it, and a Pages
      repo is fully public. If you want it, export a phone-free version to `assets/docs/` and link it.
- [ ] **Verify the numbers.** The stats block claims 39 repositories and 276 contributions
      (from your GitHub screenshots, Aug 2026). Update `data-to` as they change.

---

## Built-in behaviour

- Light/dark theme, persisted to `localStorage`, defaults to your OS preference
- Scroll progress bar, sticky shrinking nav, scroll-spy section highlighting
- `IntersectionObserver` reveal animations with staggered delays
- Typewriter role rotator and animated stat counters
- Client-side project filtering
- Interactive node-network canvas in the hero (pauses offscreen and on hidden tabs)
- Pointer-follow spotlight on the expertise cards
- Full `prefers-reduced-motion` support — every animation is disabled, nothing breaks
- Print stylesheet, so the page prints as a clean CV-ish document
- Semantic HTML, skip link, ARIA on the menu and filters, JSON-LD `Person` schema

---

## Browser support

Chrome/Edge 111+, Firefox 113+, Safari 16.4+ — the floor is `color-mix()`, used for
translucent surfaces. Older browsers still render the site; a few backgrounds fall back
to transparent.

---

© Sakib Ahmed
