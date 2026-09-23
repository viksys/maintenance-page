#!/usr/bin/env node
/*
  generate-seo.js
  ---------------
  Build-time SEO asset generator. Two jobs:

  1. sitemap  — writes public/sitemap.xml covering every public route, including
                the data-driven detail pages under /hardware.

  2. prerender — after `npm run build`, writes a static index.html into
                build/<route>/ for EVERY route, carrying that route's real
                <title>, meta description, canonical, Open Graph, Twitter and
                JSON-LD, plus a <noscript> summary of the page.

                This matters because the app is client-rendered: crawlers that
                do not execute JavaScript (GPTBot, ClaudeBot, PerplexityBot,
                CCBot and most answer engines) otherwise receive an empty
                <div id="root"> and can index nothing. The <noscript> summary
                mirrors visible page content — it is not cloaking.

                It also writes build/404.html, which the platform serves with a
                genuine HTTP 404 for any path that is not a route. See
                writeNotFound below for what that shell must and must not say.

  ---------------------------------------------------------------------------
  WHAT CHANGED ON 3 SEPTEMBER 2026, AND WHY
  ---------------------------------------------------------------------------

  1. PRERENDERING COVERED THE REGISTRY AND NOTHING ELSE.

     writePrerender iterated STATIC_ROUTES, which is the hand-written registry.
     Every data-driven detail page — the /hardware records, and the several
     other detail families the site carried at the time — was listed in
     sitemap.xml and served the GENERIC HOMEPAGE title, description and
     canonical to any crawler that does not run JavaScript. That is precisely
     the audience robots.txt names individually and invites, and a run of
     near-identical pages is not a thin-content risk, it is thin content.

     No route count is stated here on purpose. The site has been resized twice
     since, and a number written into a comment is wrong from the first edit
     after it — the count belongs in the line this script prints, which is
     derived rather than remembered.

     The detail metadata already existed: detailMeta() in src/data/seo.js builds
     it for the runtime <Seo>. It could not be reached from here because the
     data modules import React components. That is now solved — see loadModule
     below — so both paths derive from one function and cannot drift.

  2. EVERY PRERENDERED SHELL INHERITED THE HOMEPAGE'S LCP PRELOAD.

     The shell is the built index.html, and tags are rewritten in place. Nothing
     removed the <link rel="preload"> for hero-field.webp, so every route
     fetched a 320 KB image it never renders, at fetchpriority="high", in
     competition with its own largest element. It is now stripped from every
     shell that is not the homepage.

  3. SLUGS WERE READ WITH A REGULAR EXPRESSION THAT ASSUMED SINGLE QUOTES.

     A slug written with double quotes, as a template literal, or behind a
     computed key would have disappeared from the sitemap silently — no error,
     just a missing page. The data modules are now EVALUATED, like the registry
     already was, so what this script sees is what the application sees.

  4. breadcrumbScript SERIALISED JSON-LD WITHOUT ESCAPING </script>.

     src/components/FAQ.js escapes it and explains why: JSON.stringify does not,
     and inside a <script> element the parser is looking for that byte sequence
     and nothing else. Both emitters now use the same helper. The data is
     trusted today; the inconsistency was the risk.

  Usage:
    node scripts/generate-seo.js sitemap      # writes public/sitemap.xml
    node scripts/generate-seo.js prerender    # run AFTER build
    node scripts/generate-seo.js all
*/

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const PUBLIC = path.join(ROOT, 'public');
const BUILD = path.join(ROOT, 'build');
const ORIGIN = 'https://vikasanasystems.tech';

/* Routes that carry no registry entry and belong to no detail family. */
const DEFAULT_PRIORITY = '0.6';

/*
  Where each detail family's records live.

  The families themselves are declared once, in DETAIL_SECTIONS in the registry,
  because the page components need them too. This table says only which data
  module holds each one; a family added there without a source here stops the
  build rather than quietly producing a sitemap that is missing a section.

  /hardware has one source: the three built devices in hardware.js. It used to
  have a second — a set of module descriptions in products.js covering hardware
  the company does not build — and those records were removed rather than
  described more carefully. `from` stays a list because a family with two real
  sources is a shape this table should still be able to express.
*/
const DETAIL_SOURCES = {
  hardware: { priority: '0.7', from: [['hardware.js', 'HARDWARE']] },
};

/* ---------------------------------------------------------------- helpers */

const read = (p) => fs.readFileSync(p, 'utf8');
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/*
  JSON destined for a <script> element.

  JSON.stringify does not escape `</script>`, and inside a script element the
  HTML parser is looking for that byte sequence and nothing else — a value
  containing it would close the tag early and drop the rest of the JSON into
  the document as markup. Escaping `<` to its unicode form is valid JSON and
  inert to the parser. Same helper, same reasoning, as src/components/FAQ.js.
*/
const jsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

/* ------------------------------------------------------- module evaluation */

/*
  Evaluate a source module in this process.

  The registry (src/data/seo.js) is written as a leaf module with no imports
  precisely so it can be run here and read exactly as the application reads it.
  The DATA modules have not always been leaves: they have carried imports of
  icon components from '@/components/Icon', where the icon appears only as a
  VALUE on a record (`icon: IconISR`) and nothing here reads it.

  So the import is stubbed rather than resolved: the named bindings are
  declared as functions that return null, and evaluation proceeds. The
  alternative was the previous approach — slicing the file with a regular
  expression and scraping `slug:` out of the text — which could not see a
  record's title, could not see a record at all if it was written with the
  wrong quote character, and produced a silently short sitemap when it failed.

  A module that grows an import this cannot stub fails loudly here, with the
  specifier named, rather than producing wrong metadata.
*/
const IMPORT_RE = /^import\s+(?:{([^}]*)}|(\w+))\s+from\s+['"]([^'"]+)['"];?\s*$/gm;
const STUBBABLE = new Set(['@/components/Icon']);

function loadModule(file, exportNames) {
  const filename = path.join(SRC, file);
  if (!fs.existsSync(filename)) throw new Error(`missing module: src/${file}`);

  const source = read(filename);
  const stubs = [];

  const body = source.replace(IMPORT_RE, (whole, named, dflt, specifier) => {
    if (!STUBBABLE.has(specifier)) {
      throw new Error(
        `src/${file} imports from '${specifier}', which scripts/generate-seo.js cannot stub. ` +
          'Either keep the data modules importing only from ' +
          `${[...STUBBABLE].join(', ')}, or add the specifier to STUBBABLE and say what a stub means for it.`
      );
    }
    const ids = named
      ? named.split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)
      : [dflt];
    for (const id of ids) stubs.push(`const ${id} = function ${id}() { return null; };`);
    return '';
  });

  /* `export const X` / `export function X` → a plain declaration, so the vm
     sandbox can see it and the explicit module.exports below can name it. */
  const flattened = body.replace(/^export\s+(const|function|class|let|var)\s/gm, '$1 ');
  if (/^export\b/m.test(flattened)) {
    throw new Error(`src/${file} uses an export form this script cannot rewrite`);
  }

  const sandbox = { module: { exports: {} }, console };
  const names = exportNames.join(', ');
  vm.runInNewContext(`${stubs.join('\n')}\n${flattened}\nmodule.exports = { ${names} };`, sandbox, {
    filename,
  });
  return sandbox.module.exports;
}

let registry = null;
function loadRegistry() {
  if (registry) return registry;
  registry = loadModule('data/seo.js', [
    'SITE',
    'SOCIAL_CARD',
    'ROUTES',
    'STATIC_ROUTES',
    'DETAIL_SECTIONS',
    'detailMeta',
    'metaFor',
    'canonicalPath',
    'absoluteUrl',
    'pageTitle',
  ]);
  return registry;
}

/* Records, not just slugs. The sitemap needs the slug; the prerenderer needs
   the whole record, because detailMeta() reads name, summary and image off it. */
const moduleCache = new Map();
function records(file, exportName) {
  const key = `${file}#${exportName}`;
  if (moduleCache.has(key)) return moduleCache.get(key);

  const loaded = loadModule(`data/${file}`, [exportName]);
  const exported = loaded[exportName];

  /* Two shapes are accepted and both are legitimate: a data module may export a
     plain array, or key its records by slug the way hardware.js does because
     its pages look records up by slug. Normalising here keeps DETAIL_SOURCES a
     plain table of module and export name, rather than a table that also has to
     remember which shape each one is. */
  const list =
    Array.isArray(exported) ? exported
    : exported && typeof exported === 'object' ? Object.values(exported)
    : null;

  if (!list || !list.length) {
    throw new Error(
      `src/data/${file}: ${exportName} is neither a non-empty array nor a non-empty object of records`
    );
  }
  const missing = list.filter((r) => !r || !r.slug);
  if (missing.length) {
    throw new Error(`src/data/${file}: ${exportName} has ${missing.length} record(s) without a slug`);
  }
  moduleCache.set(key, list);
  return list;
}

/*
  Literal route paths declared in src/App.js.

  The registry covers the pages with hand-written metadata. App.js declares a
  few more that the registry does not, and they are public pages that belong in
  the sitemap.

  Three kinds of declaration are excluded. A path with ':' is a detail family,
  enumerated from the data modules below. '*' is the 404 page, which is
  explicitly noindex. A <Navigate> route is a redirect, and a redirect is not a
  URL to be indexed.
*/
function appRoutes() {
  const source = read(path.join(SRC, 'App.js'));
  const out = [];

  for (const match of source.matchAll(/<Route\b[\s\S]*?\/>/g)) {
    const decl = match[0];
    if (decl.includes('<Navigate')) continue;

    const found = decl.match(/path="([^"]+)"/);
    if (!found) continue;

    const route = found[1];
    if (route.includes(':') || route.includes('*')) continue;
    out.push(route);
  }

  if (!out.length) throw new Error('src/App.js: no routes parsed — the route table shape changed');
  return out;
}

/* Detail routes, with their records, for every family the registry declares. */
function detailRoutes() {
  const { DETAIL_SECTIONS } = loadRegistry();
  const out = [];

  for (const [section, meta] of Object.entries(DETAIL_SECTIONS)) {
    const source = DETAIL_SOURCES[section];
    if (!source) {
      throw new Error(`DETAIL_SECTIONS declares '${section}' but this script has no data source for it`);
    }
    for (const [file, exportName] of source.from) {
      for (const record of records(file, exportName)) {
        out.push({
          route: `${meta.index}/${record.slug}`,
          priority: source.priority,
          section,
          record,
        });
      }
    }
  }
  return out;
}

/* A route with no registry entry inherits its family's priority. */
function priorityFor(route) {
  const parts = route.split('/');
  const source = parts.length > 2 ? DETAIL_SOURCES[parts[1]] : null;
  return source ? source.priority : DEFAULT_PRIORITY;
}

/* The registry holds priorities as numbers, and JavaScript prints 1.0 as "1".
   Both are legal in a sitemap, but one decimal place reads as a priority rather
   than a count and keeps the file stable across regenerations. */
function formatPriority(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PRIORITY;
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

/* ---------------------------------------------------------------- sitemap */

function sitemapRoutes() {
  const { ROUTES, STATIC_ROUTES } = loadRegistry();

  /* Registry first: where a route appears in more than one source, its
     hand-set priority is the one that survives the de-duplication below. */
  const all = [
    ...STATIC_ROUTES.map((route) => ({ route, priority: formatPriority(ROUTES[route].priority) })),
    ...appRoutes().map((route) => ({ route, priority: priorityFor(route) })),
    ...detailRoutes().map(({ route, priority }) => ({ route, priority })),
  ];

  const seen = new Set();
  return all.filter((u) => (seen.has(u.route) ? false : seen.add(u.route)));
}

/*
  NO <lastmod>.

  It used to stamp `new Date()` on every URL on every run, which told every
  crawler that all twenty-odd pages had changed the moment anyone deployed
  anything. That is not a date, it is the build clock, and a crawler that finds
  it contradicted twice learns to discount the element for this host entirely —
  including on the one page where it would have been true.

  Nothing in this repository knows when a page's content last changed. Git knows
  when a FILE changed, which is not the same question once a page is assembled
  from a registry, a data module and a component. An absent lastmod is honest:
  the crawler falls back to its own observation, which is what it does anyway
  when it stops believing the element. Restore it only alongside a real
  per-page content date.
*/
function writeSitemap() {
  const routes = sitemapRoutes();

  const urls = routes
    .map(
      (u) =>
        `  <url>\n    <loc>${ORIGIN}${u.route === '/' ? '/' : u.route}</loc>\n` +
        `    <changefreq>${u.route === '/' ? 'weekly' : 'monthly'}</changefreq>\n` +
        `    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), xml);
  console.log(`sitemap.xml — ${routes.length} URLs`);
}

/* -------------------------------------------------------------- prerender */

/*
  The shell already carries a site-wide value for every tag written below.
  Appending a second copy is not an override: a consumer reads the first tag it
  finds, which is the generic one, so each tag is rewritten in place and only
  appended when the shell has none.

  Matching tolerates attribute wrapping, attribute order and either quote style.
  public/index.html is hand-formatted across several lines and the build
  minifier collapses it onto one, so an expression that depends on the exact
  spelling ' />' matches one of those two files and not the other.
*/
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/*
  Every replacement below is a FUNCTION, never the tag string itself.

  String.prototype.replace treats `$&`, `$1`, `` $` `` and `$'` in a replacement
  STRING as substitution patterns — with a string search argument as much as
  with a regular expression — so a title or description containing any of them
  would be silently rewritten with a fragment of the shell instead. A replacer
  function is handed the match and its return value is inserted verbatim, which
  is the only form that is safe for text this script does not control. No copy
  on the site contains a `$` today; that is a property of the content, not a
  property of the code, and it is not the kind of thing to rely on.
*/
function setMetaTag(html, attr, name, content) {
  const re = new RegExp(`<meta\\b[^>]*\\b${attr}=["']${escapeRe(name)}["'][^>]*>`, 'i');
  const tag = `<meta ${attr}="${name}" content="${content}" />`;
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => `${tag}</head>`);
}

function setLinkTag(html, rel, href) {
  const re = new RegExp(`<link\\b[^>]*\\brel=["']${escapeRe(rel)}["'][^>]*>`, 'i');
  const tag = `<link rel="${rel}" href="${href}" />`;
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => `${tag}</head>`);
}

function setTitleTag(html, title) {
  const re = /<title[^>]*>[\s\S]*?<\/title>/i;
  const tag = `<title>${title}</title>`;
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => `${tag}</head>`);
}

function setNoscript(html, inner) {
  const re = /<noscript>[\s\S]*?<\/noscript>/i;
  const tag = `<noscript>${inner}</noscript>`;
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</body>', () => `${tag}</body>`);
}

function setRobots(html, content) {
  return setMetaTag(html, 'name', 'robots', content);
}

/*
  Delete the canonical link rather than repointing it.

  setLinkTag has no way to express "none": its append branch ADDS the tag when
  the shell has none, so neither calling it nor skipping it removes what the
  shell already carries. Anchored on rel=canonical alone, so the preload, icon
  and stylesheet links are untouched.
*/
function dropCanonical(html) {
  return html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');
}

/*
  Remove the homepage's LCP preload.

  The shell is the built index.html, which preloads hero-field.webp at
  fetchpriority="high" because that image is the homepage's largest contentful
  paint. On any other route it is a 320 KB fetch of an image the page never
  renders, taken at the highest priority the platform offers, competing with
  that page's own hero. Two links now — one per media condition — so this
  strips both.
*/
function stripHeroPreload(html) {
  return html.replace(/<link\b[^>]*rel=["']preload["'][^>]*hero-field[^>]*>/gi, '');
}

function breadcrumbScript(crumbs, url, title) {
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: ORIGIN }];

  if (Array.isArray(crumbs) && crumbs.length) {
    crumbs.forEach(([name, href], i) => {
      items.push({ '@type': 'ListItem', position: i + 2, name, item: `${ORIGIN}${href}` });
    });
  } else {
    items.push({ '@type': 'ListItem', position: 2, name: title, item: url });
  }

  return `<script type="application/ld+json">${jsonForScript({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  })}</script>`;
}

/* Every route the site answers with a real page, each carrying the metadata
   that route's own <Seo> would produce at runtime. */
function prerenderTargets() {
  const { ROUTES, STATIC_ROUTES, SITE, detailMeta } = loadRegistry();
  const out = [];
  const seen = new Set();

  for (const route of STATIC_ROUTES) {
    if (route === '/') continue;
    const r = ROUTES[route] || {};
    out.push({
      route,
      title: r.title,
      description: r.description || SITE.description,
      type: r.type,
      image: r.image,
      breadcrumb: r.breadcrumb,
    });
    seen.add(route);
  }

  /* Routes declared in App.js but absent from the registry still deserve a real
     head; they fall back to the site description rather than to the homepage's
     title, which is what the old shell-only path gave them. */
  for (const route of appRoutes()) {
    if (route === '/' || seen.has(route)) continue;
    out.push({ route, title: undefined, description: SITE.description });
    seen.add(route);
  }

  for (const { route, section, record } of detailRoutes()) {
    if (seen.has(route)) continue;
    const meta = detailMeta({ ...record, section, name: record.name || record.title });
    out.push({
      route,
      title: meta.title,
      description: meta.description || record.summary || record.excerpt || SITE.description,
      type: meta.type,
      image: meta.image,
      breadcrumb: meta.breadcrumb,
    });
    seen.add(route);
  }

  return out;
}

/*
  build/404.html — the one shell that is not a route.

  The platform serves this file, with a genuine HTTP 404 status, for any path
  that is not a route. Until now every unknown path was rewritten to index.html
  and answered at HTTP 200, so the client-side <NotFound> page was the only
  thing saying the URL was wrong — and it says it in JavaScript, to an audience
  that by definition includes crawlers which do not run any.

  Four things about this shell are deliberate:

    - The robots directive is STATIC. It is the whole point of the file. A
      noindex written by an effect after hydration is a noindex that the
      crawlers this site cares about never see, and an unbounded space of
      invalid URLs is exactly what gets indexed when they miss it. `follow`
      stays: the links out of the page are real pages.
    - There is NO canonical link. A 404 has no canonical URL to declare, and
      pointing one at the homepage would tell a crawler that every mistyped
      path IS the homepage — the soft-404 signal this change exists to end.
    - No BreadcrumbList. A page that does not exist has no position in a
      hierarchy, and structured data asserting one is a false statement in the
      format search engines trust most.
    - The hero preload goes, for the same reason it goes from every other
      non-homepage shell.
*/
function writeNotFound(shell) {
  const { SITE, pageTitle } = loadRegistry();

  const title = esc(pageTitle('Page not found'));
  const description = esc(
    'This page does not exist on vikasanasystems.tech. It may have been moved, ' +
      'renamed, or the address may be mistyped.'
  );

  let html = stripHeroPreload(shell);
  html = setTitleTag(html, title);
  html = setMetaTag(html, 'name', 'description', description);
  html = dropCanonical(html);
  html = setRobots(html, 'noindex, follow');
  html = setMetaTag(html, 'property', 'og:title', title);
  html = setMetaTag(html, 'property', 'og:description', description);
  html = setMetaTag(html, 'property', 'og:type', 'website');
  html = setMetaTag(html, 'name', 'twitter:title', title);
  html = setMetaTag(html, 'name', 'twitter:description', description);

  /* og:url would name a URL this document does not have; the shell's homepage
     value is worse than none, so it is removed alongside the canonical. */
  html = html.replace(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/gi, '');

  html = setNoscript(
    html,
    `<h1>${title}</h1><p>${description}</p>` +
      `<p>Start again from <a href="${SITE.url}/">the homepage</a> or the ` +
      `<a href="${SITE.url}/site-map">site map</a>.</p>`
  );

  fs.writeFileSync(path.join(BUILD, '404.html'), html);
}

function writePrerender() {
  if (!fs.existsSync(BUILD)) {
    console.error('build/ not found — run `npm run build` first.');
    process.exit(1);
  }

  const { SITE, absoluteUrl, pageTitle } = loadRegistry();
  const shell = read(path.join(BUILD, 'index.html'));
  const targets = prerenderTargets();
  const untitled = [];
  let n = 0;

  for (const t of targets) {
    const url = `${ORIGIN}${t.route}`;
    if (!t.title) untitled.push(t.route);

    const rawTitle = t.title || SITE.name;
    const title = esc(pageTitle(rawTitle));
    const description = esc(t.description || SITE.description);
    const image = t.image ? absoluteUrl(t.image) : '';

    let html = stripHeroPreload(shell);
    html = setTitleTag(html, title);
    html = setMetaTag(html, 'name', 'description', description);
    html = setLinkTag(html, 'canonical', url);
    html = setRobots(html, 'index, follow, max-image-preview:large, max-snippet:-1');
    html = setMetaTag(html, 'property', 'og:url', url);
    html = setMetaTag(html, 'property', 'og:title', title);
    html = setMetaTag(html, 'property', 'og:description', description);
    html = setMetaTag(html, 'property', 'og:type', t.type === 'article' ? 'article' : 'website');
    html = setMetaTag(html, 'name', 'twitter:title', title);
    html = setMetaTag(html, 'name', 'twitter:description', description);

    /* Only a route that names its own image displaces the default card, and it
       takes the declared dimensions with it — those describe the card, not an
       arbitrary page image. */
    if (image && image !== absoluteUrl(SITE.ogImage)) {
      html = setMetaTag(html, 'property', 'og:image', esc(image));
      html = setMetaTag(html, 'name', 'twitter:image', esc(image));
      html = html
        .replace(/<meta\b[^>]*\bproperty=["']og:image:width["'][^>]*>/i, '')
        .replace(/<meta\b[^>]*\bproperty=["']og:image:height["'][^>]*>/i, '');
    }

    const crumbs = breadcrumbScript(t.breadcrumb, url, rawTitle);
    html = html.replace('</head>', () => `${crumbs}</head>`);

    /* Crawler-readable summary mirroring the page's own heading and intro. */
    html = setNoscript(
      html,
      `<h1>${title}</h1><p>${description}</p>` +
        '<p>VIKASANA Systems Private Limited, Mangaluru, Karnataka, India.</p>'
    );

    const dir = path.join(BUILD, t.route.replace(/^\//, ''));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    n++;
  }

  /*
    A route with no title falls back to the bare site name, which is exactly the
    duplicate-title problem this rewrite exists to remove. Fail rather than emit
    it: a missing registry entry or a record without a name is a content gap,
    and it is cheaper to see it here than in Search Console eight weeks later.
  */
  if (untitled.length) {
    console.error(
      `\n${untitled.length} route(s) have no title and would ship the bare site name:\n  ` +
        untitled.join('\n  ') +
        '\n\nAdd a ROUTES entry in src/data/seo.js, or a name/title on the record.'
    );
    process.exit(1);
  }

  writeNotFound(shell);

  console.log(`prerendered ${n} route shells into build/, plus build/404.html`);
}

/* ------------------------------------------------------------------- main */

const cmd = process.argv[2] || 'all';
if (cmd === 'sitemap' || cmd === 'all') writeSitemap();
if (cmd === 'prerender' || (cmd === 'all' && fs.existsSync(BUILD))) writePrerender();
