/*
  Computed-contrast check.

  Loads the production bundle for a spread of routes and measures text against
  the background the browser actually resolves behind it — not as the source
  suggests it should be.

  It exists because of a specific failure. lib/bands.js made band 0 dark, but
  .h-display carried `color: var(--ink)` from when every band was white, so page
  headings rendered near-black on near-black and vanished. The build was clean,
  the route smoke test passed, and nothing caught it: neither looks at computed
  style. This does.

  ---------------------------------------------------------------------------
  IT WAS BLIND, AND IT WAS REPORTING GREEN
  ---------------------------------------------------------------------------
  Until 3 September 2026 this script executed `script[src]` tags by hand, with
  `dom.window.eval(fs.readFileSync(...))`. That runs the main bundle, but it
  runs it detached from the document — webpack derives its publicPath from
  `document.currentScript`, which an eval'd script does not set, so every
  dynamically imported chunk was requested from the wrong URL and none of them
  arrived. Every route in this project except Home is behind React.lazy.

  The consequence was not a crash. It was a pass. The routes rendered the
  Suspense fallback, which contains no text, so there was nothing to measure
  and nothing to fail: the last full run reported "headings checked on a solid
  background: 3" across twenty-three routes and exited 0. A check that inspects
  almost nothing and reports success is worse than no check, because the next
  person reads the green and stops looking.

  Two changes fix it and keep it fixed:

    1. Loading now works the way scripts/smoke.mjs already proved out — jsdom's
       own ResourceLoader serves build/, scripts are not eval'd by hand, and
       the script waits for the DOM to go quiet rather than sleeping a fixed
       interval.
    2. A FLOOR. If the run measures fewer elements than a real render must
       produce, it fails and says so. Vacuity is now a failure mode with a
       name, rather than a silent pass.

  ---------------------------------------------------------------------------
  WHAT IS SKIPPED, AND WHY
  ---------------------------------------------------------------------------
  Text over a photographic plate. Its legibility comes from a scrim composited
  over an image, which getComputedStyle cannot resolve to a colour pair, so a
  number computed here would be fiction. Those need a pixel sample from a real
  browser; this script does not claim them and does not pretend to.

  Usage:  npm run build && npm run contrast
  Exits non-zero if too little was measured to mean anything, and on any
  failure whose two colours are both fully opaque — that ratio is arithmetic.
  Findings involving a translucent colour or a scrim are printed as candidates
  and do not fail. See the note above the report at the foot of this file.
*/

import { JSDOM, ResourceLoader } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'build');
if (!fs.existsSync(path.join(BUILD, 'index.html'))) {
  console.error('No build/index.html. Run `npm run build` first.');
  process.exit(1);
}

const html = fs.readFileSync(path.join(BUILD, 'index.html'), 'utf8');

class LocalFiles extends ResourceLoader {
  fetch(url) {
    const f = path.join(BUILD, new URL(url).pathname);
    const ok = fs.existsSync(f) && fs.statSync(f).isFile();
    return Promise.resolve(ok ? fs.readFileSync(f) : Buffer.from(''));
  }
}

const lum = (r, g, b) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const cr = (a, b) => {
  const [l1, l2] = [lum(...a), lum(...b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
/*
  Colour resolution, because jsdom does neither half of it.

  Two gaps had to be closed before this script could measure anything:

  1. `var()` IS NOT COMPUTED. This design system expresses almost every colour
     as `color: var(--text-secondary)`, and jsdom's getComputedStyle hands back
     the literal string `var(--text-secondary)`. So the token vocabulary that
     makes the palette maintainable also made it invisible to this check.
     TOKENS below is parsed out of the built stylesheet's :root block and used
     to substitute, recursively, including var()'s fallback argument.

  2. `color` IS NOT INHERITED. jsdom returns an empty string for any element
     that no rule targets directly, so a <p> inside a section that sets the
     colour on its parent reports no colour at all. In a browser it inherits.
     findFg below walks ancestors, which is what inheritance is.

  Together these two were rejecting 41 of 102 candidate elements on the
  homepage, and every single element on the dark-banded routes and the
  not-found page — which is how the run ended up measuring two things and
  calling it a pass.

  3. SCOPED TOKEN OVERRIDES WERE NOT MODELLED, and that was the single largest
     source of doubt in this file. `.on-dark` redefines --amber-text,
     --amber-display, --text-secondary and --text-tertiary for a whole dark
     subtree, and jsdom does not resolve custom properties through the cascade
     at all — so a label inside `.on-dark` was measured with its LIGHT-band
     value against an ink ground and reported as a failure it is not. That was
     tolerable while every finding was advisory. It is not tolerable now that
     an opaque pair fails the build: /hardware's section label resolves to
     --text-on-dark-2 (8.13:1 on ink) in a browser and was being reported at
     3.44:1 here.

     SCOPES below is parsed out of the same stylesheet and overlaid when the
     element declaring the colour sits inside such a subtree. Custom properties
     resolve on the element that USES them, which is why the scope is taken
     from the node the declaration was read off rather than from the text node,
     and why the NEAREST scope wins rather than the outermost.
*/
const TOKENS = new Map();

/*
  Every scope that redeclares a token, not just .on-dark.

  SCOPES was a single .on-dark map until a second scope appeared:
  `.img-slot:not(.img-slot-dark)` re-asserts the light-band tokens because the
  slot paints its own --stone-50 ground and must not inherit the dark-band
  values from an ancestor .on-dark. With only .on-dark modelled, this script
  read the ancestor and reported 1.69:1 on a pair that renders at 4.55:1 — a
  false failure, on a gate that now fails the build.

  So the parse is general: any rule whose selector is a plain class chain and
  whose body declares custom properties becomes a scope. Nesting is resolved by
  NEAREST ancestor at measurement time, which is how the cascade actually works
  for custom properties — the closest element that sets one wins, regardless of
  selector specificity further up the tree.

  Deliberately narrow: selectors containing a descendant combinator, or sitting
  inside an @media/@supports block, are NOT collected. Modelling those needs a
  real cascade implementation, and a scope this script silently gets wrong is
  worse than one it does not know about — an unmodelled scope shows up as a
  visible failure to investigate, not as a quiet pass.
*/
const SCOPES = [];

function loadTokens(css) {
  TOKENS.clear();
  SCOPES.length = 0;
  const root = css.match(/:root\s*\{([\s\S]*?)\}/g) || [];
  for (const block of root) {
    for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
      TOKENS.set(m[1], m[2].trim());
    }
  }

  /* Strip at-rule bodies first, so a scope defined only inside a media query
     is not collected as if it applied unconditionally. */
  const flat = css.replace(/@(?:media|supports)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');

  for (const m of flat.matchAll(/(^|[},])\s*((?:\.[-\w]+(?::not\([^)]*\))?)+)\s*\{([^{}]*)\}/g)) {
    const selector = m[2];
    const body = m[3];
    if (!body.includes('--')) continue;
    const vars = new Map();
    for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) vars.set(d[1], d[2].trim());
    if (vars.size) SCOPES.push({ selector, vars });
  }
}

/* An override's own value (`--text-secondary: var(--text-on-dark-2)`) is
   resolved against :root, so the scope is carried down the recursion but is
   only ever consulted for names it actually redefines. */
function resolveVars(value, depth = 0, scope = null) {
  if (!value || depth > 8) return value;
  if (!value.includes('var(')) return value;
  const next = value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g,
    (whole, name, fallback) => {
      if (scope && scope.has(name)) return scope.get(name);
      if (TOKENS.has(name)) return TOKENS.get(name);
      return fallback !== undefined ? fallback.trim() : whole;
    });
  return next === value ? value : resolveVars(next, depth + 1, scope);
}

/*
  The token scope an element resolves var() in: the NEAREST ancestor (or self)
  that redeclares tokens. Walking up from the node and testing each scope in
  turn is what makes a closer scope beat a further one — .img-slot beating an
  ancestor .on-dark is the case this exists for.
*/
function scopeOf(n) {
  if (!n || !n.matches || !SCOPES.length) return null;
  for (let el = n; el && el.matches; el = el.parentElement) {
    for (const { selector, vars } of SCOPES) {
      let hit = false;
      try { hit = el.matches(selector); } catch { hit = false; }
      if (hit) return vars;
    }
  }
  return null;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/*
  Returns { rgb: [r,g,b], alpha } or null.

  The alpha used to be discarded. It is carried now because it is the
  difference between a ratio that is arithmetic and a ratio that is a guess: a
  translucent colour is composited against whatever is behind it, so the pair
  this script measured is not the pair the eye receives, and a verdict on it
  cannot be allowed to fail a build. Opaque values stay exactly as trustworthy
  as they always were.
*/
const parse = (raw, scope = null) => {
  const s = resolveVars(String(raw || '').trim(), 0, scope);
  if (!s) return null;

  const hex = s.match(HEX);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return {
      rgb: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)],
      alpha: 1,
    };
  }

  const m = s.match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
  if (!m) return null;
  /* A fully transparent colour is not a colour. Treat it as absent so the
     ancestor walk keeps going rather than measuring against rgba(0,0,0,0). */
  if (m[4] !== undefined && Number(m[4]) === 0) return null;
  return { rgb: [+m[1], +m[2], +m[3]], alpha: m[4] === undefined ? 1 : Number(m[4]) };
};

/*
  The routes, derived from src/App.js rather than hand-listed.

  The list that used to sit here had gone stale in the most misleading way
  available. /contact, /blog, /integration, /talk-to-sales, /use-cases and
  /blog/autonomous-defence are not routes and have not been for some time, so
  every one of them rendered the not-found page — and the six findings on that
  one page were printed seven times over. That reads as a site-wide defect
  rather than as one page with a problem, and a report nobody can count is a
  report nobody acts on.

  App.js is the authority on what URLs exist; sitemap.xml, the static heads,
  the smoke test and the link checker all read it, and this now does too. The
  registry in src/data/seo.js is not read directly: STATIC_ROUTES there is
  Object.keys(ROUTES), which is not a literal that can be scraped out of the
  text, and the package is CommonJS so an ESM import of it is not available
  either. Every route the registry names is declared in App.js, so App.js is
  the complete list by construction.

  The `<Route … />` expression is the multi-line-tolerant form that
  generate-seo.js and check-links.js already use. The single-line form in
  smoke.mjs silently misses a declaration wrapped across lines, which is how
  that file came to need a second pass for its redirects.

  Redirects are excluded — a 301 has no page to measure — and so are the :slug
  and * patterns. One unknown URL is then added deliberately, so the not-found
  page is still measured, once.
*/
const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.js'), 'utf8');

const ROUTES = [];
for (const match of appSrc.matchAll(/<Route\b[\s\S]*?\/>/g)) {
  const decl = match[0];
  if (decl.includes('<Navigate')) continue;
  const found = decl.match(/path="([^"]+)"/);
  if (!found) continue;
  const route = found[1];
  if (route.includes(':') || route.includes('*')) continue;
  ROUTES.push(route);
}
if (!ROUTES.length) {
  console.error('src/App.js: no routes parsed — the route table shape changed.');
  process.exit(1);
}
ROUTES.push('/a/deliberately/invalid/path');

/*
  The floor.

  Every route here carries a heading, an intro and a footer, so the run cannot
  legitimately yield a handful of measurements. This number is deliberately far
  below what a healthy run produces (several hundred) — it is here to catch a
  loader that has stopped working, not to police content. Raise it if it ever
  starts passing while something is obviously wrong.
*/
const MIN_MEASURED = 250;

function waitForSettled(win, { timeout = 8000, interval = 40, stableFor = 2 } = {}) {
  const signature = () => {
    const doc = win.document;
    const root = doc.getElementById('root');
    return [
      root?.textContent.trim().length || 0,
      doc.querySelectorAll('main').length,
      doc.title,
      win.location.pathname,
    ].join('|');
  };
  return new Promise((resolve) => {
    const started = Date.now();
    let last = null;
    let stable = 0;
    const tick = () => {
      const now = signature();
      stable = now === last ? stable + 1 : 0;
      last = now;
      const root = win.document.getElementById('root');
      const painted = root && root.querySelector('main') && root.textContent.trim().length > 60;
      if (painted && stable >= stableFor) return resolve(true);
      if (Date.now() - started > timeout) return resolve(Boolean(painted));
      setTimeout(tick, interval);
    };
    tick();
  });
}

let measured = 0;
let unresolved = 0;
let bad = 0;
const emptyRoutes = [];
/* Findings are collected rather than printed as they are found, so the two
   kinds can be reported separately — the ones that fail the build first, and
   in one block. Interleaved they were indistinguishable. */
const failures = [];
const candidates = [];

for (const route of ROUTES) {
  const dom = new JSDOM(html, {
    url: 'https://vikasanasystems.tech' + route,
    runScripts: 'dangerously',
    resources: new LocalFiles(),
    pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => ({
        matches: false, media: '',
        addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
      });
      w.scrollTo = () => {};
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } };
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.console.error = () => {};
    },
  });

  await waitForSettled(dom.window);

  const d = dom.window.document;
  const gcs = (el) => dom.window.getComputedStyle(el);

  /* jsdom does not apply the linked stylesheet's rules to computed style on its
     own, so the built CSS is injected once per document. */
  const cssFile = fs.readdirSync(path.join(BUILD, 'static/css')).find((f) => f.endsWith('.css'));
  const cssText = fs.readFileSync(path.join(BUILD, 'static/css', cssFile), 'utf8');
  loadTokens(cssText);
  if (!d.querySelector('style[data-injected]')) {
    const st = d.createElement('style');
    st.setAttribute('data-injected', '1');
    st.textContent = cssText;
    d.head.appendChild(st);
  }

  /*
    The background behind an element.

    `backgroundColor` alone is not enough. This codebase sets band grounds with
    the SHORTHAND, from JS — `style={{ background: b.bg }}` where b.bg is
    `var(--ink)` — and jsdom does not expand a shorthand whose value is a
    var() into its longhand, so `backgroundColor` comes back empty for every
    dark section on the site. The walk then ran all the way to the document and
    returned the light default, which is how 1,238 elements were reported as
    #F1F0F0 text on a #F1F0F0 ground at 1.00:1. They are white text on ink, and
    they are correct.

    So: longhand first, then the shorthand's own value, then the inline style
    attribute, before giving up on this ancestor and climbing.
  */
  const bgOf = (n) => {
    const cs = gcs(n);
    const scope = scopeOf(n);
    return (
      parse(cs.backgroundColor, scope) ||
      parse(cs.background, scope) ||
      parse(n.style && n.style.background, scope) ||
      parse(n.style && n.style.backgroundColor, scope)
    );
  };

  /*
    ONLY ASSERT WHERE THE EVIDENCE IS SOLID.

    Both lookups return null rather than a default when nothing in the ancestor
    chain declares a value. An element whose colour or ground had to be guessed
    is counted as unresolved and skipped, not measured against an assumption.

    This matters because jsdom's cascade is partial: it does not model the
    scoped token overrides this design system uses (.on-dark redefines
    --amber-text and the secondary text tokens for a whole subtree), and it
    resolves some author shorthands and not others. Guessing produced 431
    failures of which the overwhelming majority were white-on-ink text reported
    as white-on-white — noise that would have trained everyone to ignore this
    check, which is precisely how the vacuous version survived.

    A smaller set of verdicts that are all trustworthy is worth more than a
    large set that has to be triaged by hand. The unresolved count is printed,
    so if it ever grows the coverage loss is visible rather than silent.
  */
  /*
    The walk also records whether anything between the text and its ground
    makes the pair inexact, because that is what decides whether a finding can
    fail the build:

      - a GRADIENT on an ancestor. The decorative grids are hairlines at low
        opacity and change nothing, but a scrim laid over a band changes the
        effective ground by an amount this cannot compute.
      - a TRANSLUCENT background colour, which is composited over whatever is
        further up and is therefore not the colour measured.
      - PARTIAL `opacity` on an ancestor, which is a scrim by another name.

    Two opacity cases are deliberately NOT counted.

    `opacity` on the text element itself blends the glyph toward the ground
    behind it, so it can only move the ratio further below the floor — a
    finding stays a finding, and the exact figure would not change the verdict.

    `opacity: 0` exactly is an entrance animation that has not run. Every
    reveal on this site starts at zero and animates to one on intersection,
    and IntersectionObserver is stubbed here, so the initial frame is what this
    environment sees. Treating it as a scrim would have excused sixteen
    arithmetic failures on /company, /careers, /hardware, /site-map and
    /knowledge on the strength of a jsdom limitation. The rendered opacity of
    those subtrees is 1.
  */
  const findBg = (el) => {
    let n = el;
    let inexact = '';
    while (n && n !== d.documentElement) {
      const cs = gcs(n);
      const bi = cs.backgroundImage;
      if (!inexact && bi && bi !== 'none' && bi.includes('gradient')) inexact = 'gradient';
      if (!inexact && n !== el && cs.opacity) {
        const o = Number(cs.opacity);
        if (o > 0 && o < 1) inexact = 'partial opacity';
      }

      const b = bgOf(n);
      if (b) {
        if (b.alpha < 1) inexact = inexact || 'translucent ground';
        return { ...b, inexact };
      }
      n = n.parentElement;
    }
    return null;
  };

  /* Inheritance, which jsdom does not do for `color`. */
  const findFg = (el) => {
    let n = el;
    while (n && n !== d.documentElement) {
      const c = parse(gcs(n).color, scopeOf(n));
      if (c) return c;
      n = n.parentElement;
    }
    return null;
  };

  /*
    Over a PHOTOGRAPH, not over any background-image.

    This used to return true for any `background-image` other than `none`, and
    that is why the check was measuring almost nothing even once the pages
    rendered. Nearly every section on this site lays a decorative CSS grid over
    its band — `.grid-fine`, `.grid-pattern` and friends, all of which are
    `linear-gradient` hairlines at low opacity. A gradient of 1px rules at 40%
    opacity does not change the effective background behind a heading in any
    way that matters, but it made the walk return true at the first ancestor,
    so every descendant of every section was skipped as "over an image".

    A raster plate is the thing that cannot be resolved to a colour pair, and a
    raster plate says `url(`. Gradients are ignored and the walk continues to
    the real background colour underneath.
  */
  const overImage = (el) => {
    let n = el;
    while (n && n !== d.documentElement) {
      const bi = gcs(n).backgroundImage;
      if (bi && bi !== 'none' && bi.includes('url(')) return true;
      if (n.querySelector && n.querySelector(':scope > .absolute img, :scope > .absolute picture, :scope > picture, :scope > img.absolute')) return true;
      n = n.parentElement;
    }
    return false;
  };

  const root = d.getElementById('root');
  const before = measured;
  const label = (el) => {
    const cls = typeof el.className === 'string' ? el.className : '';
    return `<${el.tagName.toLowerCase()}${cls ? ` class="${cls.slice(0, 40)}"` : ''}>`;
  };

  /*
    Headings clear 3:1 (they are large text). Body copy and labels clear 4.5:1.
    `.meta` is the mono label class and is set at 11-12.5px, so it is small text
    however short it is.
  */
  const targets = [
    ...[...d.querySelectorAll('h1,h2,h3,h4')].map((el) => [el, 3.0, 'heading']),
    ...[...d.querySelectorAll('p, li, .meta, label, dd, dt')].map((el) => [el, 4.5, 'text']),
  ];

  for (const [el, floor, kind] of targets) {
    if (!root || !root.contains(el)) continue;
    const text = el.textContent.trim();
    if (!text) continue;
    if (el.closest('.sr-only, [aria-hidden="true"], [hidden]')) continue;
    if (overImage(el)) continue;

    const fg = findFg(el);
    const bg = findBg(el);
    if (!fg || !bg) { unresolved += 1; continue; }
    const ratio = cr(fg.rgb, bg.rgb);
    measured += 1;

    if (ratio < floor) {
      /*
        CONFIRMED when both colours are fully opaque and nothing between the
        text and its ground composites them. Two opaque sRGB values have
        exactly one contrast ratio; it is arithmetic, and no part of the
        cascade this script does not model can move it. Anything else is a
        candidate for a real browser to settle.
      */
      const confirmed = fg.alpha === 1 && bg.alpha === 1 && !bg.inexact;
      const why = fg.alpha < 1 ? 'translucent text' : bg.inexact || 'translucent ground';

      (confirmed ? failures : candidates).push({
        route, kind, floor, ratio, why,
        el: label(el),
        text: text.slice(0, 46),
        fg: fg.rgb,
        bg: bg.rgb,
      });
      bad += 1;
    }
  }

  if (measured === before) emptyRoutes.push(route);
  dom.window.close();
}

/*
  WHAT FAILS THE BUILD, AND WHAT DOES NOT.

  This block used to end in an unconditional process.exit(0), with a paragraph
  explaining that every ratio finding was advisory because jsdom's cascade is
  partial. The reasoning was sound and the conclusion was not: the CI step is
  named "Heading contrast", and it could not fail for any contrast reason
  whatsoever. A gate that cannot fail is a label, and a green label over an
  unread list is how the vacuous-pass problem comes back wearing a new coat.

  The doubt had one specific shape, and it has been removed rather than
  reasoned around: `.on-dark` redefines the secondary text tokens for a whole
  dark subtree, jsdom resolved none of it, and dark-band labels were therefore
  measured with their light-band values. SCOPES above models every such rule
  and resolves the nearest one, so the pair reported for those subtrees is the
  pair the browser resolves — including where a closer scope such as
  `.img-slot` overrides an ancestor `.on-dark`. What remains is the distinction between a ratio that is COMPUTED
  and a ratio that is ARITHMETIC: two fully opaque sRGB values have exactly one
  contrast ratio, and no part of the cascade can move it.

  So the split is by evidence rather than by category:

    - BOTH COLOURS OPAQUE, nothing compositing between the text and its
      ground: the ratio is a fact about those two values. It FAILS.
    - Anything translucent, any gradient or scrim in between: the pair
      measured is not the pair rendered. It is PRINTED and does not fail.
    - Text over a photographic plate is not measured at all; see above.
    - FALLING BELOW THE FLOOR still fails, unchanged. That is vacuity, and it
      is the regression this file was written for.

  A confirmed failure is therefore either a token that is too light for its
  ground, or a dark band that forgot its `.on-dark` marker. Both are real
  defects, and the report names the class and both colours so it is clear
  which.

  The authoritative check remains axe-core against a real rendering engine,
  which would settle the candidates too. Until that is in CI, this fails on
  what it can prove and reports the rest. Scoped overrides are now discovered
  automatically, but only for plain class selectors outside @media/@supports —
  a scope written any other way is still unmodelled, and an unmodelled scope is
  a FALSE BUILD FAILURE rather than a note in a list. If one appears, widen the
  parser in the same commit that introduces it.
*/

const show = (f, mark) => {
  console.log(`  ${mark} ${f.route}  ${f.el} ${f.kind} "${f.text}"`);
  console.log(
    `       rgb(${f.fg}) on rgb(${f.bg}) = ${f.ratio.toFixed(2)}:1, needs ${f.floor}:1` +
      (mark === 'FAIL' ? '' : `  [${f.why}]`)
  );
};

if (failures.length) {
  console.log(`\nconfirmed — both colours opaque, ratio is arithmetic (${failures.length}):\n`);
  for (const f of failures) show(f, 'FAIL');
}

if (candidates.length) {
  console.log(
    `\ncandidates — composited, so the measured pair is not the rendered pair (${candidates.length}).\n` +
      'These do not fail the build. Confirm in a browser before changing a colour.\n'
  );
  for (const f of candidates) show(f, 'CAND');
}

console.log(`\nelements measured: ${measured}   below threshold: ${bad}   unresolved (skipped): ${unresolved}`);
console.log(`confirmed failures: ${failures.length}   advisory candidates: ${candidates.length}`);
if (emptyRoutes.length) {
  console.log(`routes that yielded nothing: ${emptyRoutes.join(', ')}`);
}
console.log('(text over a photographic plate is not resolvable to a colour pair and is not measured)');

if (measured < MIN_MEASURED) {
  console.error(
    `\ncontrast: only ${measured} elements were measured, below the floor of ${MIN_MEASURED}.\n` +
      'That is not a pass — it means the pages did not render. The usual cause is that\n' +
      'the lazy route chunks failed to load, which makes every code-split page an empty\n' +
      'Suspense fallback with no text in it. Check the ResourceLoader and the build.'
  );
  process.exit(1);
}

if (failures.length) {
  console.error(
    `\ncontrast: ${failures.length} confirmed contrast failure(s). Both colours in each pair are\n` +
      'fully opaque and fully resolved, so the ratio is arithmetic — no cascade this script\n' +
      'does not model can change it. Fix the token in src/index.css, or the scope it is\n' +
      'being read from.'
  );
  process.exit(1);
}

process.exit(0);
