#!/usr/bin/env node
/*
  check-gs.js
  -----------
  Catches undefined references in the Apps Script files under docs/.

  WHY node --check IS NOT ENOUGH
  ------------------------------
  It validates syntax and nothing else. On 9 October 2026 the approval gate
  removed DELAY_MIN_MINUTES while doGet still read it; the file parsed, was
  deployed, and every request to /exec answered

      ReferenceError: DELAY_MIN_MINUTES is not defined

  which is only discoverable by calling the deployed endpoint — after a paste
  and a redeploy. That is the cycle this removes.

  WHY THE FILES ARE CONCATENATED
  ------------------------------
  Apps Script puts every file in ONE shared global scope: WebForm.gs calls
  CONFIG, COL, cell_ and rowData_ from Code.gs with no import. Linted
  separately, eslint reports 97 false "not defined" errors and the real one is
  invisible. Concatenated, it sees what the runtime sees.

  Order matters only for readability here — function and var declarations hoist
  — but Code.gs goes first because that is the dependency direction.
*/

const path = require('path');
const fs = require('fs');
const { ESLint } = require('eslint');

const DOCS = path.resolve(__dirname, '..', '..', 'docs');
/* Code.gs first: it defines what WebForm.gs reaches for. */
const FILES = ['hr-code.gs', 'hr-webform.gs'];

/* Apps Script's own globals. eslint has no env for them, and an incomplete list
   produces false positives that train people to ignore this check — so add to
   it rather than suppressing a rule when a new service is used. */
const APPS_SCRIPT_GLOBALS = [
  'SpreadsheetApp', 'DriveApp', 'DocumentApp', 'GmailApp', 'MailApp', 'CalendarApp',
  'ScriptApp', 'PropertiesService', 'LockService', 'CacheService', 'Utilities',
  'UrlFetchApp', 'ContentService', 'HtmlService', 'MimeType', 'Logger', 'Session',
  'Browser', 'Drive', 'Calendar', 'console',
];

async function main() {
  const missing = FILES.filter((f) => !fs.existsSync(path.join(DOCS, f)));
  if (missing.length) {
    console.error(`check-gs: missing ${missing.join(', ')} in docs/`);
    process.exit(1);
  }

  /* Line numbers in the report are offsets into the concatenation, so each file
     is announced and its starting line recorded to translate them back. */
  const parts = [];
  const offsets = [];
  let line = 1;
  for (const f of FILES) {
    const src = fs.readFileSync(path.join(DOCS, f), 'utf8');
    offsets.push({ file: f, start: line });
    line += src.split('\n').length;
    parts.push(src);
  }
  const combined = parts.join('\n');

  const eslint = new ESLint({
    useEslintrc: false,
    overrideConfig: {
      env: { es2021: true },
      parserOptions: { ecmaVersion: 2021, sourceType: 'script' },
      globals: Object.fromEntries(APPS_SCRIPT_GLOBALS.map((g) => [g, 'readonly'])),
      rules: { 'no-undef': 'error' },
    },
  });

  const [result] = await eslint.lintText(combined, { filePath: path.join(DOCS, 'combined.js') });
  const errors = (result.messages || []).filter((m) => m.severity === 2);

  const locate = (n) => {
    let hit = offsets[0];
    for (const o of offsets) if (n >= o.start) hit = o;
    return `${hit.file}:${n - hit.start + 1}`;
  };

  console.log(`check-gs: ${FILES.join(' + ')} linted as one scope (${combined.split('\n').length} lines).`);

  if (errors.length) {
    console.error(`\n${errors.length} undefined reference(s):\n`);
    for (const m of errors) console.error(`  ${locate(m.line)}  ${m.message}`);
    console.error('\nEither the name was removed and a caller was missed, or it is an Apps Script');
    console.error('global this script does not know about — add it to APPS_SCRIPT_GLOBALS.');
    process.exit(1);
  }

  console.log('check-gs: no undefined references.');
}

main().catch((err) => {
  console.error('check-gs failed to run:', err.message);
  process.exit(1);
});
