#!/usr/bin/env node
/*
  check-artifact.js
  -----------------
  Assert facts about the BUILT OUTPUT that no amount of reading the source can
  establish.

  Why this exists
  ---------------
  On 3 September 2026 an audit found that a clean clone of this repository could
  not deploy. Not because of a bug in the application — the application was
  fine — but because `frontend/.env` was matched by `*.env` in the root
  .gitignore and was therefore never in the git tree that the hosting platform
  builds from. That file carried INLINE_RUNTIME_CHUNK=false. Without it, Create
  React App writes the webpack runtime as an INLINE <script> into index.html,
  and this site serves `script-src 'self'` with no 'unsafe-inline' and no hash.
  The browser blocks that script, React never mounts, and every visitor gets a
  blank document. The error boundary cannot help: it is inside the bundle that
  never runs.

  The same file carried GENERATE_SOURCEMAP=false. Without it, a deploy publishes
  the complete unminified source of a defence company's website.

  Both variables now live in vercel.json's build.env, where CI can read them.
  This script is the proof that they took effect, run against the artefact
  rather than against the configuration that was supposed to produce it. A
  configuration file can be correct and still not be the one the build used.

  Usage:  npm run build && npm run check:artifact
  Exits non-zero on any violation, so it can gate a deployment.
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');

const failures = [];
const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

if (!fs.existsSync(path.join(BUILD, 'index.html'))) {
  console.error('No build/index.html. Run `npm run build` first.');
  process.exit(1);
}

/* Every HTML file the build produced, including the per-route shells that
   scripts/generate-seo.js writes. A violation in one of those is exactly as
   fatal as one in the root shell, and only the root shell was ever looked at
   by hand. */
function htmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(p, out);
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = htmlFiles(BUILD);
const rel = (p) => path.relative(BUILD, p).replace(/\\/g, '/');

/* ------------------------------------------------------- 1. inline scripts */

/*
  A <script> with no src= and a body. Matched with a tolerant expression
  because the minifier collapses the document onto one line and quoting is not
  guaranteed.

  type="application/ld+json" is exempt: it is data, never prepared for
  execution, and therefore outside script-src. Every structured-data block on
  this site is one of those, which is why they are allowed to be inline while
  the runtime chunk is not.
*/
const INLINE = /<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const offenders = [];

for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  let m;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(html))) {
    const attrs = m[1] || '';
    const body = (m[2] || '').trim();
    if (!body) continue;
    if (/type\s*=\s*["']?application\/ld\+json["']?/i.test(attrs)) continue;
    offenders.push(`${rel(file)}: ${body.slice(0, 70).replace(/\s+/g, ' ')}…`);
  }
}

check(
  'no executable inline <script> (CSP script-src \'self\')',
  offenders.length === 0,
  offenders.length ? `${offenders.length} found — first: ${offenders[0]}` : ''
);

/* --------------------------------------------------------- 2. source maps */

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const maps = walk(BUILD).filter((f) => f.endsWith('.map'));
check(
  'no .map files published (GENERATE_SOURCEMAP=false)',
  maps.length === 0,
  maps.length ? `${maps.length} found — first: ${rel(maps[0])}` : ''
);

/* sourceMappingURL comments survive even when the .map itself is absent under
   some tool combinations, and they tell a reader exactly what to go looking
   for. */
const withRefs = walk(path.join(BUILD, 'static'))
  .filter((f) => /\.(js|css)$/.test(f))
  .filter((f) => /\/\/[#@]\s*sourceMappingURL=/.test(fs.readFileSync(f, 'utf8')));
check(
  'no sourceMappingURL references in bundles',
  withRefs.length === 0,
  withRefs.length ? `${withRefs.length} found — first: ${rel(withRefs[0])}` : ''
);

/* -------------------------------------------- 3. the root shell still works */

const shell = fs.readFileSync(path.join(BUILD, 'index.html'), 'utf8');
check('root shell has <div id="root">', /id=["']?root["']?/.test(shell));
check(
  'root shell loads at least one external script',
  /<script\b[^>]*\bsrc=/.test(shell)
);

/* --------------------------------------- 4. per-route shells carry real heads */

/*
  generate-seo.js rewrites the <title> of every route shell in place. If it
  ever silently no-ops — a change to the shell's markup that its regular
  expression stops matching is the obvious way — every route would ship the
  homepage title and nothing would error. Compare a sample rather than trusting
  the generator's own exit code.
*/
const routeShells = pages.filter((p) => rel(p) !== 'index.html');
const homeTitle = (shell.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
const sameTitle = routeShells.filter((p) => {
  const t = (fs.readFileSync(p, 'utf8').match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  return t === homeTitle;
});
check(
  'every route shell has its own <title>',
  routeShells.length > 0 && sameTitle.length === 0,
  routeShells.length === 0
    ? 'no route shells were written at all'
    : sameTitle.length
      ? `${sameTitle.length} share the homepage title — first: ${rel(sameTitle[0])}`
      : ''
);

/*
  No two routes may share a <title>.

  Two of our own URLs carrying identical titles compete for the same query, and
  neither accumulates the signal that would rank either — keyword
  cannibalisation, and the cheapest SEO defect there is to introduce by
  accident. It happens here whenever the same subject is addressed twice from
  different sections.

  This check stops such a pair appearing silently.
*/
const byTitle = new Map();
for (const p of pages) {
  const t = (fs.readFileSync(p, 'utf8').match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
  if (!t) continue;
  if (!byTitle.has(t)) byTitle.set(t, []);
  byTitle.get(t).push(rel(p));
}
const collisions = [...byTitle].filter(([, files]) => files.length > 1);
check(
  'no two routes share a <title>',
  collisions.length === 0,
  collisions.length
    ? collisions
        .map(([t, files]) => `"${t}" → ${files.join(', ')}`)
        .join('; ')
    : ''
);

/*
  The homepage LCP preload must not be inherited by shells that do not render
  it. It is a 320 KB image at fetchpriority="high"; on any other route it
  competes with that route's own largest element for bandwidth and priority.
*/
const inheritedPreload = routeShells.filter((p) =>
  /rel=["']preload["'][^>]*hero-field/.test(fs.readFileSync(p, 'utf8'))
);
check(
  'route shells do not inherit the homepage hero preload',
  inheritedPreload.length === 0,
  inheritedPreload.length ? `${inheritedPreload.length} do — first: ${rel(inheritedPreload[0])}` : ''
);

/* ------------------------------------------------ 5. the real 404 document */

/*
  build/404.html is what the platform serves, with a genuine HTTP 404 status,
  for any path that is not a route. Three things about it are load-bearing and
  none of them is visible in the source that produced it.

  The robots directive has to be IN THE FILE. A noindex written by a React
  effect after hydration is a noindex that the crawlers this matters for never
  execute, and an unbounded space of invalid URLs is exactly what gets indexed
  when they miss it.

  And there must be NO canonical. A 404 has no canonical URL to declare;
  a canonical pointing anywhere tells a crawler that the mistyped path IS that
  page, which is the soft-404 signal the whole arrangement exists to end. The
  shell carries a homepage canonical, so this is an assertion that something
  removed it rather than that nobody added one.
*/
const notFoundPath = path.join(BUILD, '404.html');
const hasNotFound = fs.existsSync(notFoundPath);
const notFound = hasNotFound ? fs.readFileSync(notFoundPath, 'utf8') : '';

check(
  'build/404.html exists',
  hasNotFound,
  hasNotFound ? '' : 'the platform has no document to serve with a 404 status'
);
check(
  'build/404.html is noindex, statically',
  hasNotFound && /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*noindex/i.test(notFound),
  hasNotFound ? '' : 'not written'
);
check(
  'build/404.html declares no canonical URL',
  hasNotFound && !/<link\b[^>]*\brel=["']canonical["']/i.test(notFound),
  hasNotFound ? '' : 'not written'
);

/* ------------------------------------------------------------- 6. report */

for (const c of checks) {
  console.log(`${c.ok ? 'ok  ' : 'FAIL'}  ${c.name}${c.ok || !c.detail ? '' : `\n      ${c.detail}`}`);
}

if (failures.length) {
  console.error(`\ncheck-artifact: ${failures.length} of ${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\ncheck-artifact: ${checks.length} checks passed over ${pages.length} HTML files.`);
