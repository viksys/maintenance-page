# vikasanasystems.tech

The public website of **VIKASANA Systems Private Limited**, Mangaluru, Karnataka,
India.

A static, client-rendered React application. 108 routes, no server component, no
database, no authentication, no third-party scripts. Deployed to Vercel as static
files behind a strict Content-Security-Policy.

---

## Quick start

```bash
cd frontend
npm ci
npm start            # http://localhost:3000
```

Requires Node 18.18 or newer.

## The commands that matter

```bash
npm run verify       # everything below, in order. Run this before you push.

npm run lint         # zero warnings, enforced (--max-warnings=0)
npm run links        # every internal link resolves; every asset exists; sitemap complete
npm run copy         # DRISHTIKON page copy rules
npm run render       # every page renders without throwing
npm run build:seo    # sitemap → build → per-route static <head> for all 108 routes
npm run check:artifact  # facts about the built output: no inline script, no source maps,
                        # no duplicate titles, no inherited hero preload
npm run smoke        # loads the real production bundle per route in jsdom
npm run contrast     # measures every heading against its resolved background
```

`npm run verify` is what CI runs on every pull request
(`.github/workflows/verify.yml`). If it passes locally it will pass there.

---

## Layout

```
frontend/
  public/            static assets, index.html, robots.txt, sitemap.xml,
                     .well-known/security.txt
  src/
    App.js           the route table — the authority on what URLs exist
    index.css        the entire design system: palette, type, layout primitives
    components/      shared UI
    pages/           one file per route
    data/            all site content, as plain modules
    lib/             bands (page rhythm), search, smooth scroll, form transport
  scripts/           the verification suite above
docs/
  TYPOGRAPHY.md      binding. Read before touching any font.
  DEPENDENCIES.md    what ships, and the advisory triage
  GIT_WORKFLOW.md
  adr/               architecture decision records
vercel.json          build, headers, redirects, rewrites — the single source
CLAUDE.md            company doctrine and the implementation law it binds
```

---

## Things that will cost you an afternoon if you do not know them

**The route table is in `src/App.js` and nothing else may fork from it.**
`sitemap.xml`, the per-route static heads, the route smoke test and the link
checker all derive from it. Add a route and every one of them follows. Hand-list
a route anywhere and you have created a way for them to disagree.

**Build-time environment lives in `vercel.json` under `build.env`, not in
`.env`.** `frontend/.env` is a local mirror and is *not* in version control —
`*.env` is gitignored. Two of those variables are load-bearing:
`INLINE_RUNTIME_CHUNK=false` (without it the webpack runtime is inlined into
`index.html` and blocked by our own `script-src 'self'`, and the site serves a
blank page) and `GENERATE_SOURCEMAP=false`. `npm run check:artifact` is the proof
that both took effect; it runs against the artefact, not the configuration that
was supposed to produce it.

**Two typefaces, and that is the whole type system.** Inter sets every word;
JetBrains Mono sets labels at 11–12.5px and the hero word cycle. A typeface may
be named in exactly three places — `--font-sans`, `--font-display`, `--font-mono`
in `index.css`. A family named there but missing from `public/index.html` fails
silently to the next name in the stack and looks deliberate. Read
`docs/TYPOGRAPHY.md` first; it also lists three heading treatments that were
shipped and rejected.

**Colour is two tokens, not one, and the distinction is contrast.** `--amber`
(#FF6A00) is the brand accent: fills, rules, icons, and text on dark bands.
`--amber-text` (#B24700, 4.87:1 on light) is the same hue dark enough to be read
on a light band. `lib/bands.js` picks the right one automatically for anything
driven by a band; the `on-dark` class restores full strength for a dark subtree.
Never write a hex literal for text — every value that is allowed has a token.

**`lib/bands.js` decides page rhythm.** A band is a background *and* the six
foreground values that must move with it. Ask for a position, not a colour.

**The forms open the visitor's mail client.** There is no submission endpoint.
`lib/applicationSubmit.js` contains a complete HTTP adapter that activates on one
build-time variable, `REACT_APP_CAREERS_ENDPOINT`, with no component changes. A
`mailto:` URL cannot carry an attachment, so on the current path a résumé is
never transmitted, and the UI says so plainly. This is the largest open item on
the site.

---

## Deploying

Vercel builds from `main`. `vercel.json` is the only deployment configuration —
build command, output directory, headers, redirects and the SPA rewrite. There is
no `_headers` file; there was one, for Netlify and Cloudflare Pages, and keeping
two copies of a Content-Security-Policy in step by hand is a worse risk than the
portability it bought.

Before promoting a build, confirm on the preview URL — not locally — that
`index.html` contains no inline `<script>`, that no `.map` file is reachable under
`/static/js/`, that the page mounts with an empty console, and that every header
in `vercel.json` is present on the response.

---

## Licence

Proprietary. © VIKASANA Systems Private Limited. All rights reserved.
