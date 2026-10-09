#!/usr/bin/env node
/*
  check-audit.js
  --------------
  The full-tree audit gate, with a documented exception list.

  WHY THIS EXISTS RATHER THAN `npm audit`
  ---------------------------------------
  react-scripts 5.0.1 has had no release since December 2021 and pins a
  webpack-4-era tree. New advisories land against that tree continually, and
  some have NO patched version at any release — `range: *`. A plain `npm audit`
  therefore fails forever through no action of ours, and the usual response is
  to make the step advisory with `|| true`, which throws away the check
  completely: a genuine, fixable advisory in a dependency we control would then
  land silently.

  This keeps the gate and names the exceptions. Every root advisory must either
  be fixable — in which case fix it, with an override in package.json — or be
  listed below with the reason it cannot be.

  WHAT IT DOES NOT COVER
  ----------------------
  Production dependencies. `npm audit --omit=dev` runs as its own step in
  verify.yml and is NOT allowed any exceptions: nothing here reaches the shipped
  bundle, and the moment something does, that step is what says so.
*/

const { execFileSync } = require('child_process');

/*
  Root advisories with no patched release, as at 9 October 2026.

  Each entry has to say what it is, why it cannot be fixed, and why it cannot
  reach anyone. Remove an entry the moment a patched version exists — the report
  below flags any that no longer appear, so a stale exception is visible rather
  than quietly permitting a future reintroduction.
*/
const ALLOWED = {
  'GHSA-vfj7-8cjw-p6xm': {
    package: 'braces',
    why:
      'Stack exhaustion on deeply nested patterns. Affects every published version (range *); ' +
      'npm offers only a tailwindcss 4.x major as a "fix". Build-time only — braces is reached ' +
      'through tailwind\'s file globbing, which runs over our own source at build and never sees ' +
      'untrusted input.',
  },
  'GHSA-hp3w-g68c-fv3c': {
    package: 'sprintf-js',
    why:
      'Denial of service through unbounded precision specifiers. Affects every published version ' +
      '(range *); npm offers only a react-scripts 1.x downgrade. Build-time only — reached through ' +
      'the Jest/istanbul reporting chain, formatting our own test output.',
  },
};

function audit() {
  try {
    /* npm audit exits non-zero when it finds anything, so the throw is the
       normal path and the JSON we want is on stdout either way. */
    return JSON.parse(execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
  } catch (err) {
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

const report = audit();
const vulns = report.vulnerabilities || {};

/*
  Only ROOT advisories are judged. npm lists every package that merely depends
  on a vulnerable one — 54 entries for the two roots below — and failing on those
  would make the output unreadable and the exception list impossible to maintain.
  A root is an entry whose `via` contains the advisory object itself.
*/
const roots = [];
for (const [name, v] of Object.entries(vulns)) {
  for (const via of v.via || []) {
    if (via && typeof via === 'object' && via.url) {
      roots.push({ name, severity: v.severity, url: via.url, title: via.title, range: v.range });
    }
  }
}

const id = (url) => (url.match(/GHSA-[\w-]+/) || [''])[0];
const unexpected = roots.filter((r) => !ALLOWED[id(r.url)]);
const seen = new Set(roots.map((r) => id(r.url)));
const stale = Object.keys(ALLOWED).filter((k) => !seen.has(k));

console.log(
  `check-audit: ${roots.length} root advisor${roots.length === 1 ? 'y' : 'ies'} ` +
    `over ${Object.keys(vulns).length} flagged package(s).`
);

for (const r of roots) {
  const known = ALLOWED[id(r.url)];
  console.log(`  ${known ? 'allowed ' : 'NEW     '} ${r.severity.padEnd(8)} ${r.name} (${r.range}) ${r.url}`);
}

if (stale.length) {
  /* Reported, not failed. A fix appearing upstream should not break the build —
     but an exception that no longer matches anything is dead text, and dead text
     is how an allow-list ends up permitting something nobody examined. */
  console.log('\nThese exceptions no longer match anything and should be deleted from check-audit.js:');
  for (const k of stale) console.log(`  ${k} — ${ALLOWED[k].package}`);
}

if (unexpected.length) {
  console.error(`\n${unexpected.length} advisory not on the exception list:\n`);
  for (const r of unexpected) {
    console.error(`  ${r.severity} ${r.name} (${r.range})`);
    console.error(`    ${r.title}`);
    console.error(`    ${r.url}`);
  }
  console.error(
    '\nFix it with an override in package.json. If there is genuinely no patched version, ' +
      'add it to ALLOWED in this file with the reason it cannot reach anyone.'
  );
  process.exit(1);
}

console.log('\ncheck-audit: nothing outside the documented exceptions.');
