/*
  Route smoke test.

  Loads the real production bundle from build/ into jsdom, once per route, and
  asserts the things that are cheap to check and expensive to get wrong. It is
  not a substitute for a browser — it cannot see layout, paint or focus rings —
  but it catches the class of defect that static review reliably misses.

  It has already earned its place: it found three hardware product pages that
  returned their own not-found page for valid URLs, because those routes are
  declared as literal paths and useParams() therefore handed the component an
  undefined slug. Nothing about that is visible in a diff.

  Usage:
      npm run build          # build/ must exist and be current
      npm run smoke

  Exits non-zero on any failure, so it can gate a pull request.
*/

import { JSDOM, ResourceLoader } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BUILD = path.join(ROOT, 'build');

if (!fs.existsSync(path.join(BUILD, 'index.html'))) {
  console.error('No build/index.html. Run `npm run build` first.');
  process.exit(1);
}

/*
  Routes are derived from App.js rather than hand-listed, so a route added
  without a test is impossible. Parameterised families get one known-good slug
  and one deliberately invalid one, to exercise both the happy path and the
  not-found path.

  There are no parameterised families left. /hardware/:slug was the last, and
  it was removed along with the placeholder records that fed it, so all three
  built devices are declared as literal paths and are covered above by being
  routes at all. SAMPLE stays because the next family will need it, and an
  empty table is a clearer statement than a deleted mechanism.
*/
const appSrc = fs.readFileSync(path.join(ROOT, 'src/App.js'), 'utf8');
const BAD = '__nonexistent-slug__';
const SAMPLE = {};

/*
  Redirects, derived — not hand-listed.

  This file used to carry `const ALIASES = [...]` naming three hardware aliases,
  and asserted that everything else must land on the path it requested. App.js
  declared further <Navigate> routes beyond those three, and routes that
  redirect correctly were reported as
  failures, and — worse — a redirect could have been pointed at the wrong
  target without this test noticing, because it only ever checked THAT a
  redirect happened, never WHERE it went.

  Deriving the map from App.js closes both. A redirect is now asserted against
  its declared destination, and a route added or repointed cannot leave this
  test behind. It is the same rule the route table already imposes on
  sitemap.xml, the static heads and the link checker.
*/
const REDIRECTS = new Map();
for (const decl of appSrc.match(/<Route\b[\s\S]*?\/>/g) || []) {
  if (!decl.includes('<Navigate')) continue;
  const from = decl.match(/path="([^"]+)"/);
  const to = decl.match(/<Navigate[^>]*\bto="([^"]+)"/);
  if (from && to) REDIRECTS.set(from[1], to[1]);
}
if (!REDIRECTS.size) {
  throw new Error('src/App.js: no <Navigate> routes parsed — the redirect declaration shape changed');
}

const routes = new Set();
for (const p of appSrc.match(/<Route\s+path="([^"]+)"/g) || []) {
  const route = p.match(/path="([^"]+)"/)[1];
  if (route === '*') {
    routes.add('/a/deliberately/invalid/path');
  } else if (route.includes(':slug')) {
    const base = route.replace('/:slug', '');
    for (const slug of SAMPLE[route] || [BAD]) routes.add(`${base}/${slug}`);
  } else {
    routes.add(route);
  }
}
/* The multi-line <Route> declarations are not matched by the single-line
   expression above, and every redirect in this file is written that way. */
for (const from of REDIRECTS.keys()) routes.add(from);

/*
  One unknown hardware URL, kept deliberately.

  /hardware/:slug used to catch these and hand them to a detail template that
  rendered its own not-found page; that route is gone and every device is now
  declared literally, so an unknown slug falls through to the catch-all. It is
  the URL shape most likely to arrive stale — the retired product slugs were
  indexed, and they were linked — and it owes the same noindex as any other
  invalid path. The assertion below picks it up through BAD.
*/
routes.add(`/hardware/${BAD}`);

const html = fs.readFileSync(path.join(BUILD, 'index.html'), 'utf8');

/* Serve assets from build/ so React.lazy's dynamic chunk requests resolve.
   Without this only the eagerly-imported routes render and every code-split
   page looks empty — which reads as 30 failures rather than a missing loader. */
class LocalFiles extends ResourceLoader {
  fetch(url) {
    const f = path.join(BUILD, new URL(url).pathname);
    const ok = fs.existsSync(f) && fs.statSync(f).isFile();
    return Promise.resolve(ok ? fs.readFileSync(f) : Buffer.from(''));
  }
}

/*
  Wait for the page to settle, rather than sleeping a fixed interval.

  A fixed wait is flaky by construction: it passes on a warm run and fails on a
  cold one, and a test that fails at random gets ignored — which is worse than
  not having the test. Two things make a naive wait wrong here:

    1. React commits the DOM before it runs effects, and <Seo> writes the
       metadata in an effect. There is a real window in which <main> and the
       heading exist while the robots and canonical tags still hold the shell's
       values. Asserting in that window reports a false soft-404.

    2. Three routes are <Navigate replace> aliases. They render, redirect, and
       render again — so any condition pinned to the requested path can never
       become true for them.

  Quiescence handles both without special cases: poll the signals that matter,
  and accept once they have stopped changing for two consecutive intervals.
*/
function waitForSettled(win, { timeout = 8000, interval = 40, stableFor = 2 } = {}) {
  const signature = () => {
    const doc = win.document;
    const root = doc.getElementById('root');
    return [
      root?.textContent.trim().length || 0,
      doc.querySelectorAll('main').length,
      doc.title,
      doc.querySelector('link[rel=canonical]')?.getAttribute('href') || '',
      doc.querySelector('meta[name=robots]')?.getAttribute('content') || '',
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

const problems = [];
let pass = 0;

for (const route of [...routes].sort()) {
  const errors = [];
  const dom = new JSDOM(html, {
    url: 'https://vikasanasystems.tech' + route,
    runScripts: 'dangerously',
    resources: new LocalFiles(),
    pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => ({
        matches: false,
        media: '',
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
      });
      w.scrollTo = () => {};
      w.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      };
      w.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
      w.onerror = (m) => errors.push(`window.onerror: ${m}`);
      w.addEventListener('unhandledrejection', (e) => errors.push(`unhandledrejection: ${e.reason}`));
      const passthrough = w.console.error;
      w.console.error = (...a) => {
        const s = a.map(String).join(' ');
        /* jsdom cannot lay out, so these two are noise rather than signal. */
        if (!/not wrapped in act|useLayoutEffect does nothing/.test(s)) {
          errors.push(`console.error: ${s.slice(0, 220)}`);
        }
        passthrough(...a);
      };
    },
  });

  try {
    for (const s of dom.window.document.querySelectorAll('script[src]')) {
      const f = path.join(BUILD, new URL(s.src, 'https://x/').pathname);
      if (fs.existsSync(f)) dom.window.eval(fs.readFileSync(f, 'utf8'));
    }
  } catch (e) {
    errors.push(`threw while evaluating bundle: ${e && e.message}`);
  }

  const rendered = await waitForSettled(dom.window);
  const doc = dom.window.document;
  const text = (doc.getElementById('root')?.textContent || '').trim();

  if (!rendered) errors.push(`did not render within timeout (${text.length} chars)`);
  if (doc.querySelectorAll('h1').length !== 1) {
    errors.push(`h1 count = ${doc.querySelectorAll('h1').length}, expected 1`);
  }
  if (doc.querySelectorAll('main').length !== 1) {
    errors.push(`main count = ${doc.querySelectorAll('main').length}, expected 1`);
  }
  if (!doc.getElementById('main-content')) errors.push('no #main-content for the skip link to target');
  if (!doc.querySelector('a.skip-link')) errors.push('no skip link');

  /* An invalid slug must be noindex, or the site publishes an unbounded space
     of soft 404s. A valid route must NOT be, or real pages get deindexed. */
  const robots = doc.querySelector('meta[name=robots]')?.getAttribute('content') || '';
  const invalid = route.includes(BAD) || route.includes('deliberately/invalid');
  /* A declared redirect must land on its declared target — not merely somewhere
     else. Anything not declared as a redirect must land where it was asked to. */
  const landed = dom.window.location.pathname;
  const target = REDIRECTS.get(route);
  if (target) {
    if (landed === route) errors.push(`declared redirect did not fire (expected ${target})`);
    else if (landed !== target) errors.push(`redirected to ${landed}, but App.js declares ${target}`);
  } else if (landed !== route) {
    errors.push(`unexpectedly redirected to ${landed}`);
  }
  if (invalid && !/noindex/.test(robots)) errors.push('invalid URL is not noindex — soft 404');
  if (!invalid && /noindex/.test(robots)) errors.push('valid route is marked noindex');

  if (errors.length) problems.push({ route, errors });
  else pass += 1;
}

console.log(`\nroutes: ${routes.size}   pass: ${pass}   fail: ${problems.length}\n`);
for (const p of problems) {
  console.log(`  FAIL ${p.route}`);
  for (const e of p.errors) console.log(`       ${e}`);
}
process.exit(problems.length ? 1 : 0);
