# The Three — waitlist landing page

A single static page introducing **The Three** — a paid peer community where
founders are matched with two others for focused 1-hour video sessions every
two weeks. Starting in Dubai.

The site is intentionally hand-rolled: no framework, no build step, no bundler.
Open `index.html`, you see the page; edit a CSS file, refresh, you see the
change. That simplicity is the whole point.

---

## Run locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static server works — the path layout
is plain relative URLs.

---

## File layout

```
.
├── index.html                  ← markup only (one section per <section>)
├── README.md
│
├── styles/                     ← cascade order matters; see <head> in index.html
│   ├── tokens.css              ← :root colors + @font-face declarations
│   ├── base.css                ← reset, html/body, .screen, shared keyframes
│   ├── nav.css                 ← fixed top nav + logo
│   ├── waitlist.css            ← email form (used by hero AND closing cta)
│   ├── modal.css               ← post-signup enrichment modal
│   ├── sections/               ← one file per <section>, named after its class
│   │   ├── intro.css           ←   .intro (the overlay that rolls up at t=4.3s)
│   │   ├── hero.css            ←   .screen--1
│   │   ├── how.css             ←   .screen--how
│   │   ├── session.css         ←   .screen--2  (the founder cards)
│   │   ├── who.css             ←   .screen--who
│   │   ├── why.css             ←   .screen--why
│   │   └── cta.css             ←   .screen--cta + site footer
│   └── responsive.css          ← all @media (max-width: 760px) overrides
│
├── scripts/
│   ├── app.js                  ← intro scroll-lock + IntersectionObserver reveals
│   └── modal.js                ← signup modal: open/close, pills, country list, submit
│
├── assets/
│   ├── fonts/                  ← .woff2 — 7 weights/families, all preloaded
│   ├── images/                 ← card-aisha / card-stefan / card-anna .jpg
│   └── video/                  ← the.mp4 — intro background
│
└── backups/                    ← timestamped snapshots before risky changes
```

### Where to make a change

| You want to edit…                          | Open…                              |
|--------------------------------------------|------------------------------------|
| A color or font family                     | `styles/tokens.css`                |
| The reset / shared keyframes               | `styles/base.css`                  |
| The top nav or the "The Three" logo        | `styles/nav.css`                   |
| The email form (anywhere it appears)       | `styles/waitlist.css`              |
| The post-signup modal (look or behavior)   | `styles/modal.css` + `scripts/modal.js` |
| One specific section                       | `styles/sections/<section>.css`    |
| Mobile-specific tweaks                     | `styles/responsive.css`            |
| Intro animation timing or scroll behavior  | `scripts/app.js`                   |
| Copy / markup                              | `index.html`                       |

The class names follow BEM-ish conventions (`.section__element--modifier`).
Each section file owns its own block; shared utilities live in `base.css`.

---

## Animation timing

Two scheduling systems run side by side and must stay coordinated:

**Absolute timeline (CSS `animation-delay`, seconds from page load):**

- `t=0`     intro layer renders, video starts
- `t=1.0`   `THE` slides in from left, `THREE` from right
- `t=2.5`   `match` floats up between them
- `t=4.3`   intro layer starts rolling up
- `t=5.0`   nav + logo fade in
- `t=5.05`  hero kicker
- `t=5.15`  hero headline line 1
- `t=5.3`   intro layer is fully off-screen
- `t=5.4`   `scripts/app.js` releases the scroll lock
- `t=5.45`  remaining headline masks finish
- `t=5.7`   italic "three" rises
- `t=6.05`  hand-drawn circle around "three" draws
- `t=6.5`   scroll listeners attach (so they don't catch intro motion)
- `t=6.9`   tagline
- `t=7.5`   sub copy
- `t=7.7`   hero statement (bottom-right)
- `t=8.5`   underline under "build something"
- `t=10.4`  hero waitlist auto-reveals (if no scroll yet)

**Scroll-driven (`IntersectionObserver` in `scripts/app.js`):**

Each section observed by the script adds `.revealed` to its target element
when 20% of it enters the viewport. The CSS in each section file does the
rest. Observed targets are listed at the top of `app.js`.

If you change the intro length, update `scripts/app.js` (the `5400` and
`6500` and `10400` constants) and every animation delay above `4.3s` in
`sections/hero.css`. Otherwise the headline will appear before the intro
clears or the scroll lock will release at the wrong moment.

---

## Signup modal

After the user submits a valid email on either waitlist form (hero or
closing cta), `scripts/modal.js` opens a 5-field enrichment modal:

1. First name (text)
2. Stage — pills, single-select (3 options)
3. Industry — dropdown (10 options)
4. Country — dropdown (UAE pinned at top, then alphabetical; ~190 options
   populated from a list inside `scripts/modal.js`, not the markup)
5. How did you find us — pills, single-select, **optional** (5 options)

The modal is dismissible at any point — X button, Esc key, backdrop click,
or "Skip for now". The email is captured the moment JOIN is clicked, so
the modal is enrichment only, never a gate. On submit or skip, a brief
"Thank you" state shows for ~1.5s before closing.

**Style rules (intentional):**

- `border-radius: 0` everywhere — panel, inputs, pills, dropdowns, buttons.
  The site has a brutalist, square character; the modal matches.
- One sage-green (`--accent`) accent: only on selected pills and on the
  button hover. Everything else is cream-on-dark.
- Industry and Country use a **custom dropdown** (`.combobox` — an ARIA
  listbox built in `scripts/modal.js`), not `<select>`. Native select
  popups can't be styled in any browser — they render with a light
  background and rounded corners on macOS / iOS — so they're replaced
  with a `<button>` trigger + `<ul role="listbox">` panel. Full keyboard
  support: Enter/Space/Arrow to open, Arrow/Home/End/Tab/Esc, type-ahead.

**Wiring:**

```
[Hero JOIN]  ──┐
               ├─→ scripts/modal.js validates email, opens modal
[CTA JOIN]   ──┘
```

The trigger is the `.waitlist__btn` element inside any `.waitlist__form`
or `.cta-form`. Add the modal to a new place by giving its form one of
those classes — no other wiring needed.

---

## Conventions

- **One hand-drawn green gesture per section.** Underline, circle, arrow,
  or check — never two. The accent color is `--accent: #9caa86`.
- **Sizes are in `vw`/`vh` on desktop**, switched to slightly larger `vw`
  on mobile inside `responsive.css`. No fixed `px` sizes outside borders
  and very small details.
- **No inline `<style>` or `<script>`** in `index.html` — everything goes
  in `styles/` or `scripts/`. Keep the markup readable.
- **Selectors stay scoped** to their section file via `.screen--<name>`.
  Don't reach across sections; if something is truly shared, lift it to
  `base.css` or its own file (like `waitlist.css`).
- **Backups before structural changes.** Save a copy to
  `backups/index-YYYYMMDD-HHMM-<reason>.html` before reshaping anything.

---

## Things deliberately not done

- **No build step.** Vanilla HTML/CSS/JS only. If we ever ship to production
  and need to inline-and-minify, that's a separate concern handled at deploy
  time, not in the source layout.
- **No CSS preprocessor.** Plain CSS with custom properties is enough.
- **No JS framework.** The behavior is ~60 lines of vanilla DOM code; a
  framework would be five times the source for the same result.
- **`@import` is avoided.** Stylesheets are loaded as separate `<link>` tags
  so the browser can parallel-fetch them. `@import` would serialize them.
