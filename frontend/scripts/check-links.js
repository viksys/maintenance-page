#!/usr/bin/env node
/*
  check-links.js
  --------------
  Resolve every internal link and every asset reference in the source against
  what actually exists, and fail if any of them does not.

  Why this exists
  ---------------
  Three defects found by hand in the September 2026 audit were all of one kind,
  and all of them were invisible in a diff and invisible to the build:

    - /integration was a live page, linked from the header and the footer, and
      absent from sitemap.xml, because the committed sitemap predated the route.
    - /assets/docs/DRISHTIKON-Product-Guide.pdf did not exist. A `published:
      false` flag was the only thing standing between a visitor and a 404 on a
      prominent download button.
    - A link to a slug that no data module defines renders the not-found page
      at HTTP 200. Nothing errors, and the page looks deliberate.

  A link checker that runs against a deployed site finds these too, but only
  after they have shipped. This one runs against the source, in CI, before the
  merge.

  It checks four things:

    1. Every internal path literal in src/ resolves to a declared route.
    2. Every /assets reference in src/ and public/index.html exists on disk.
    3. Every URL in public/sitemap.xml resolves to a declared route.
    4. Every declared route appears in public/sitemap.xml — except the ones
       that are deliberately excluded (redirects, the 404).

  Usage:  npm run links
  Exits non-zero on any failure.
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');

const read = (p) => fs.readFileSync(p, 'utf8');
const problems = [];

/* ------------------------------------------------------------ the routes */

/*
  Literal paths from the route table, and the redirect targets, taken from
  App.js rather than hand-listed. A route added without a sitemap entry is then
  impossible rather than merely unlikely.
*/
function routeTable() {
  const source = read(path.join(SRC, 'App.js'));
  const literal = [];
  const dynamic = [];
  const redirect = [];

  for (const match of source.matchAll(/<Route\b[\s\S]*?\/>/g)) {
    const decl = match[0];
    const found = decl.match(/path="([^"]+)"/);
    if (!found) continue;
    const route = found[1];

    if (decl.includes('<Navigate')) {
      redirect.push(route);
      continue;
    }
    if (route.includes('*')) continue;
    if (route.includes(':')) {
      dynamic.push(route);
      continue;
    }
    literal.push(route);
  }

  if (!literal.length) {
    throw new Error('src/App.js: no literal routes parsed — the route table shape changed');
  }
  return { literal, dynamic, redirect };
}

/*
  Slugs for a named export of a data module.

  Read as text, because the data modules import React components that cannot be
  resolved from a plain node script. The quote class is deliberately wide: the
  previous expression matched single quotes only, so a slug written with double
  quotes or as a template literal would have vanished from the sitemap
  silently. The guard below turns that class of miss into a failure instead —
  it counts every `slug:` key in the block and insists the capture count
  matches.
*/
function slugs(file, exportName) {
  const p = path.join(SRC, 'data', file);
  if (!fs.existsSync(p)) throw new Error(`missing data module: src/data/${file}`);

  const source = read(p);
  const start = source.search(new RegExp(`export\\s+const\\s+${exportName}\\b`));
  if (start === -1) throw new Error(`src/data/${file} has no export named ${exportName}`);

  const rest = source.slice(start);
  const end = rest.search(/\nexport\s/);
  const block = end === -1 ? rest : rest.slice(0, end);

  const keys = (block.match(/\bslug\s*:/g) || []).length;
  const found = [...block.matchAll(/\bslug\s*:\s*(['"`])([^'"`]+)\1/g)].map((m) => m[2]);

  if (!found.length) throw new Error(`src/data/${file}: ${exportName} yielded no slugs`);
  if (found.length !== keys) {
    throw new Error(
      `src/data/${file}: ${exportName} has ${keys} slug keys but ${found.length} readable values — ` +
        'a slug is written in a form this reader does not understand (computed key, concatenation, ' +
        'or a template literal with an expression in it). Write it as a plain string.'
    );
  }
  return found;
}

/* Data modules that supply the slugs for each detail family. /hardware once had
   a second source in products.js describing hardware the company does not
   build; those records are gone, and so is the entry. The value stays a list
   because a family with two real sources is a shape this still has to allow. */
const DETAIL = {
  hardware: [['hardware.js', 'HARDWARE']],
};

const { literal, redirect } = routeTable();

const detailRoutes = [];
for (const [section, sources] of Object.entries(DETAIL)) {
  for (const [file, exportName] of sources) {
    for (const slug of slugs(file, exportName)) detailRoutes.push(`/${section}/${slug}`);
  }
}

const VALID = new Set([...literal, ...detailRoutes]);
const REDIRECT = new Set(redirect);

/* ------------------------------------------------- 1. internal link literals */

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(p, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = sourceFiles(SRC);
const links = new Map();
const assets = new Map();

for (const file of files) {
  const source = read(file);
  const where = path.relative(ROOT, file).replace(/\\/g, '/');

  for (const m of source.matchAll(/(?:to|href)\s*[:=]\s*[{]?\s*['"](\/[^'"\s]*)['"]/g)) {
    const url = m[1];
    /* Template-literal interpolation and route patterns are not link targets. */
    if (url.includes('${') || url.includes(':')) continue;
    if (url.startsWith('/assets/')) {
      if (!assets.has(url)) assets.set(url, new Set());
      assets.get(url).add(where);
      continue;
    }
    if (!links.has(url)) links.set(url, new Set());
    links.get(url).add(where);
  }

  for (const m of source.matchAll(/['"](\/assets\/[^'"\s]+)['"]/g)) {
    const url = m[1];
    if (url.includes('${')) continue;
    if (!assets.has(url)) assets.set(url, new Set());
    assets.get(url).add(where);
  }
}

/* index.html references assets too, and it is the one file that can point the
   preload scanner at something that does not exist. */
for (const m of read(path.join(PUBLIC, 'index.html')).matchAll(/["'](\/assets\/[^"'\s]+)["']/g)) {
  const url = m[1];
  if (!assets.has(url)) assets.set(url, new Set());
  assets.get(url).add('public/index.html');
}

for (const [url, where] of [...links].sort()) {
  const clean = url.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
  if (VALID.has(clean)) continue;
  if (REDIRECT.has(clean)) {
    problems.push(
      `LINK → REDIRECT  ${url}  (${[...where].join(', ')})\n` +
        '    resolves, but through a 301. Point internal links at the canonical URL.'
    );
    continue;
  }
  problems.push(`BROKEN LINK      ${url}  (${[...where].join(', ')})`);
}

/* ----------------------------------------------------- 2. asset existence */

/*
  One reference is legitimately allowed to point at a file that is not there.

  data/drishtikon.js carries PRODUCT_GUIDE, whose `published` flag decides
  whether the page's second-strongest call to action is a download or a note
  asking the reader to write in. While the flag is false the href is never
  rendered, so the missing PDF is unreachable — that is the whole design, and
  it is the right one.

  What is NOT safe is the flag being flipped to true before the file lands. The
  reference is therefore exempted only while `published` is false, and asserted
  when it is true. The invariant is enforced here rather than trusted.
*/
const guide = read(path.join(SRC, 'data', 'drishtikon.js'));
const guideBlock = guide.slice(guide.search(/export\s+const\s+PRODUCT_GUIDE\b/));
const guidePublished = /published\s*:\s*true/.test(guideBlock.slice(0, 400));
const guideHref = (guideBlock.match(/href\s*:\s*['"]([^'"]+)['"]/) || [])[1];

for (const [url, where] of [...assets].sort()) {
  if (fs.existsSync(path.join(PUBLIC, url))) continue;
  if (url === guideHref && !guidePublished) continue;
  problems.push(`MISSING ASSET    ${url}  (${[...where].join(', ')})`);
}

if (guidePublished && guideHref && !fs.existsSync(path.join(PUBLIC, guideHref))) {
  problems.push(
    `MISSING ASSET    ${guideHref}\n` +
      '    PRODUCT_GUIDE.published is true, so the DRISHTIKON page renders a download\n' +
      '    button pointing at this file. Add the PDF or set published back to false.'
  );
}

/* ------------------------------------------- 3. router / platform parity */

/*
  Every <Navigate> route in App.js must have a matching 301 in vercel.json, and
  every redirect in vercel.json must exist in App.js.

  Both are needed and they do different jobs. The router redirect covers
  in-app navigation from a stale internal link; the platform redirect covers a
  crawler or an inbound link arriving cold, which would otherwise be answered
  by the SPA rewrite with the shell at HTTP 200 and a client-side replace. A
  search engine treats those very differently.

  This check exists because they had already drifted: /partners was retired to
  /integration in the router, the code comment stated it was "Mirrored in
  vercel.json", and it was not — so a URL indexed at priority 0.85 would have
  returned 200 to every crawler that asked for it. Nothing could have caught
  that except a comparison of the two files.

  A redirect target must also be a real route, and must not itself redirect.
*/
/*
  Vercel spells "permanent" two ways and both are correct: `permanent: true` is
  308, and `statusCode` takes an explicit code. The check used to test
  `permanent !== true` alone, which reported an explicit 301 — the conventional
  code for a moved public page, and the one every crawler and link checker
  handles most predictably — as if it were a temporary redirect.

  What actually matters is that the redirect is PERMANENT, because that is what
  moves the index signal to the new URL. Either spelling of either code passes.
*/
const isPermanent = (r) => r.permanent === true || r.statusCode === 301 || r.statusCode === 308;

const vercelPath = path.join(ROOT, '..', 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercel = JSON.parse(read(vercelPath));
  const platform = new Map((vercel.redirects || []).map((r) => [r.source, r]));

  /* Normalised the same way the internal-link scan above normalises, so the
     orphan test below compares like with like. */
  const linkedInternally = new Set(
    [...links.keys()].map((u) => u.split('#')[0].split('?')[0].replace(/\/$/, '') || '/')
  );

  const router = new Map();
  for (const decl of read(path.join(SRC, 'App.js')).match(/<Route\b[\s\S]*?\/>/g) || []) {
    if (!decl.includes('<Navigate')) continue;
    const from = decl.match(/path="([^"]+)"/);
    const to = decl.match(/<Navigate[^>]*\bto="([^"]+)"/);
    if (from && to) router.set(from[1], to[1]);
  }

  for (const [source, destination] of router) {
    const p = platform.get(source);
    if (!p) {
      problems.push(
        `REDIRECT MISSING  ${source} → ${destination}\n` +
          '    declared in App.js but absent from vercel.json, so a cold arrival\n' +
          '    gets the SPA shell at HTTP 200 instead of a 301.'
      );
    } else if (p.destination !== destination) {
      problems.push(`REDIRECT MISMATCH ${source}: App.js → ${destination}, vercel.json → ${p.destination}`);
    } else if (!isPermanent(p)) {
      problems.push(
        `REDIRECT NOT PERMANENT  ${source} is declared temporary in vercel.json\n` +
          '    a retired URL must move its index signal, which only 301/308 does.'
      );
    }
    if (!VALID.has(destination)) problems.push(`REDIRECT TO 404   ${source} → ${destination}`);
    if (router.has(destination)) problems.push(`REDIRECT CHAIN    ${source} → ${destination}, which itself redirects`);
  }

  /*
    A platform redirect needs an App.js twin ONLY IF something in this codebase
    still links to its source.

    The two kinds of redirect in vercel.json look identical and are not. An
    ALIAS — /hardware/tactical-tablet for /hardware/gcs-x-h — is a URL people
    type and may be linked internally, so in-app navigation has to honour it or
    a click lands on the not-found page. A RETIREMENT — the eight
    /hardware/<slug> URLs deleted in the September 2026 purge — exists purely to
    catch inbound links from outside, which arrive as cold document requests and
    are answered by the edge before the router exists. Requiring a <Navigate>
    for those means shipping a route for a URL nothing can reach from inside the
    application, which is the dead code this pass is removing.

    Rather than hand-maintain a list of which is which — a list that would rot —
    the distinction is derived: `links` is every internal link target in the
    source, already collected above. If a redirect source is in it, in-app
    navigation can reach it and the router must handle it. If it is not, the
    edge redirect alone is correct and complete.

    This stays a real check. Add an internal link to a retired URL and it fires.
  */
  for (const source of platform.keys()) {
    if (!router.has(source) && linkedInternally.has(source)) {
      problems.push(
        `REDIRECT ORPHAN   ${source}\n` +
          '    linked from inside the app and declared in vercel.json, but with no\n' +
          '    <Navigate> in App.js — so in-app navigation renders the not-found page.'
      );
    }
  }
} else {
  problems.push('MISSING          vercel.json — the deployment configuration is the redirect authority');
}

/* ----------------------------------------------------------- 4+5. sitemap */

const sitemapPath = path.join(PUBLIC, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const xml = read(sitemapPath);
  const locs = [...xml.matchAll(/<loc>https:\/\/vikasanasystems\.tech([^<]*)<\/loc>/g)].map(
    (m) => m[1] || '/'
  );
  const listed = new Set(locs.map((u) => u.replace(/\/$/, '') || '/'));

  for (const url of locs) {
    const clean = url.replace(/\/$/, '') || '/';
    if (!VALID.has(clean)) problems.push(`SITEMAP → 404    ${url}`);
    if (REDIRECT.has(clean)) problems.push(`SITEMAP → 301    ${url}  (a redirect is not a URL to index)`);
  }
  for (const route of VALID) {
    const clean = route.replace(/\/$/, '') || '/';
    if (!listed.has(clean)) problems.push(`NOT IN SITEMAP   ${route}`);
  }
} else {
  problems.push('MISSING          public/sitemap.xml — run `npm run sitemap`');
}

/* --------------------------------------------------------------- report */

console.log(
  `check-links: ${VALID.size} routes (${literal.length} literal, ${detailRoutes.length} detail), ` +
    `${links.size} internal link targets, ${assets.size} asset references.`
);

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('check-links: no broken links, no missing assets, sitemap complete.');
