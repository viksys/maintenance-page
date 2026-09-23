#!/usr/bin/env node
/*
  render-check.js
  ---------------
  Actually render a page to HTML and fail if it throws.

  Why this exists
  ---------------
  A page shipped broken while three separate static checks reported success.
  The file parsed, every import resolved, every export existed — and the page
  threw the moment React called it, because a helper returned an identifier
  that was never bound. Parsing proves a file is grammatical. It does not prove
  the code runs.

  A blanket rename had rewritten the helper's own body along with its call
  sites. That is not an exotic failure; it is the normal outcome of editing
  code with a regex, and the only thing that catches it reliably is executing
  the component.

  So this compiles the real modules with the project's own Babel config and
  renders them with react-dom/server. If a component references something that
  does not exist, this throws with the file and the identifier.

  What it does not do
  -------------------
  It is not a browser. There is no layout, no CSS and no IntersectionObserver,
  so it catches crashes and missing bindings rather than visual defects. That
  is the gap that mattered here.

  Usage
  -----
      node scripts/render-check.js                 # every registered page
      node scripts/render-check.js Drishtikon      # one of them
*/

const fs = require('fs');
const path = require('path');
const Module = require('module');
const babel = require('@babel/core');
const React = require('react');
const { renderToString } = require('react-dom/server');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/*
  Packages whose default resolution lands on an ES module Node cannot require.

  react-router-dom v7 publishes `exports` pointing at index.mjs, so a bare
  require() of it fails outside an ESM context — the same wall the jest attempt
  hit. The CJS build sits alongside it and is what the bundler uses anyway, so
  the loader is pointed straight at it.
*/
const CJS_OVERRIDES = {
  'react-router-dom': path.join(ROOT, 'node_modules/react-router-dom/dist/index.js'),
  'react-router': path.join(ROOT, 'node_modules/react-router/dist/development/index.js'),
};

const { MemoryRouter } = require(CJS_OVERRIDES['react-router-dom']);

/* The pages worth rendering, and the route each is mounted at. Add a line when
   a page is rebuilt; the cost of an entry is one render. */
const PAGES = [
  { name: 'Drishtikon', file: 'pages/Drishtikon.js', route: '/software/drishtikon' },
  /* Added 23 September 2026, when all three were rebuilt in one pass: Company
     lost two sections and had its bands replanned, Locations lost two and
     gained the map plate, Careers lost one and was renumbered. Three renders
     is the cheapest possible check that none of the removals left a dangling
     reference behind — which is precisely the failure mode this file exists
     for. */
  { name: 'Company', file: 'pages/Company.js', route: '/company' },
  { name: 'Locations', file: 'pages/Locations.js', route: '/contact' },
  { name: 'Careers', file: 'pages/Careers.js', route: '/careers' },
];

/* ---------------------------------------------------------------- loader -- */

/*
  A minimal module loader that understands the two things Node does not: the
  `@/` alias craco configures, and JSX. Everything else falls through to the
  real require, so framer-motion, React and react-router load normally.
*/
const cache = new Map();

function resolveAlias(request, fromDir) {
  const base = request.startsWith('@/')
    ? path.join(SRC, request.slice(2))
    : path.resolve(fromDir, request);
  for (const ext of ['', '.js', '.jsx', '/index.js', '/index.jsx']) {
    const p = base + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

function loadModule(file) {
  if (cache.has(file)) return cache.get(file).exports;

  const code = fs.readFileSync(file, 'utf8');
  const { code: compiled } = babel.transformSync(code, {
    filename: file,
    presets: [
      [require.resolve('@babel/preset-env'), { targets: { node: 'current' } }],
      [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
    ],
    babelrc: false,
    configFile: false,
  });

  const mod = { exports: {} };
  cache.set(file, mod);
  const dir = path.dirname(file);

  const localRequire = (request) => {
    /* Stylesheets and assets are not part of a render check. */
    if (/\.(css|scss|png|jpe?g|webp|svg|gif)$/.test(request)) return {};
    const aliased = resolveAlias(request, dir);
    if (aliased) return loadModule(aliased);
    if (CJS_OVERRIDES[request]) return require(CJS_OVERRIDES[request]);
    return require(Module.createRequire(file).resolve(request));
  };

  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', compiled);
  fn(mod.exports, localRequire, mod, file, dir);
  return mod.exports;
}

/* ---------------------------------------------------------------- render -- */

const only = process.argv[2];
const targets = only ? PAGES.filter((p) => p.name === only) : PAGES;

if (!targets.length) {
  console.log(`No page named "${only}". Known: ${PAGES.map((p) => p.name).join(', ')}`);
  process.exit(1);
}

let failed = 0;

for (const page of targets) {
  const file = path.join(SRC, page.file);
  process.stdout.write(`${page.name.padEnd(14)} `);
  try {
    const mod = loadModule(file);
    const Component = mod.default || mod[page.name];
    if (typeof Component !== 'function') throw new Error('no default export to render');

    const html = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: [page.route] },
        React.createElement(Component),
      ),
    );

    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length < 200) throw new Error(`rendered only ${text.length} characters of text`);

    console.log(`ok    ${html.length.toLocaleString()} bytes of HTML, ${text.length.toLocaleString()} of text`);
  } catch (err) {
    failed += 1;
    console.log('FAIL');
    console.log(`  ${err.message}`);
    const frame = (err.stack || '').split('\n').find((l) => l.includes('/src/'));
    if (frame) console.log(`  ${frame.trim()}`);
  }
}

console.log(failed ? `\n${failed} page(s) failed to render.` : '\nAll pages render.');
process.exit(failed ? 1 : 0);
