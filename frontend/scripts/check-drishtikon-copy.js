#!/usr/bin/env node
/*
  check-drishtikon-copy.js
  ------------------------
  Enforce the DRISHTIKON page's copy rules against src/data/drishtikon.js.

  Why this exists
  ---------------
  The brief for that page is mostly a list of things the copy must not do:
  no marketing vocabulary, no status labels, no invented numbers, no walls of
  text, no repetition of a handful of phrases the company has decided are
  worn out. Every one of those is checkable, and a rule that is only written
  in a comment is a rule that survives exactly until the next edit made in a
  hurry.

  So the rules live here, executably. Add copy that breaks one and this fails
  with the sentence that did it.

  What it does not check
  ----------------------
  Whether the copy is any good. It catches the failures that have a shape.

  Usage
  -----
      node scripts/check-drishtikon-copy.js
*/

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src', 'data', 'drishtikon.js');
const raw = fs.readFileSync(SRC, 'utf8');

/* Strip comments — the rules apply to what ships, and the file's own notes
   quote several of the banned words in order to ban them. */
const code = raw
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

/*
  Every string the page renders — with adjacent literals joined first.

  This used to collect each quoted literal separately. Every paragraph in this
  file is written as a concatenation across source lines for readability:

      'DRISHTIKON gives operators a common interface for UAVs, UGVs, USVs and '
      + 'surveillance systems across multiple vendors and environments. …'

  so the length rule and the sentence-count rule below were measuring source
  fragments rather than sentences. A 340-character, four-sentence paragraph
  passed a 260-character, three-sentence limit simply because it had been typed
  across five lines — which is how every paragraph here is typed. Both rules
  were therefore unenforceable in practice, and had been since they were
  written.

  Joining `'a' + 'b'` chains before matching is what makes them mean anything.
  The banned-vocabulary rule was never affected: a term split across a
  concatenation boundary would have escaped it, but none was.
*/
const joined = code.replace(
  /'((?:[^'\\]|\\.)*)'(\s*\+\s*'((?:[^'\\]|\\.)*)')+/g,
  (whole) => {
    const parts = [...whole.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
    return `'${parts.join('')}'`;
  }
);

const strings = [...joined.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
  .map((m) => m[1].replace(/\\'/g, "'"))
  .filter((s) => s.trim().length > 1)
  /* Drop the ones that are plumbing rather than prose. */
  .filter((s) => !s.startsWith('/') && !s.startsWith('['));

let failures = 0;
const fail = (rule, detail) => {
  console.log(`  FAIL  ${rule}\n        ${detail}`);
  failures += 1;
};

/* ---------------------------------------------------------------- rules -- */

/* 1. Marketing vocabulary, and the phrases the brief calls worn out. Word
      boundaries on both sides so "advanced" is caught and "advances" is not
      matched inside another word by accident. */
const BANNED = [
  'advanced', 'next-generation', 'next generation', 'seamless', 'seamlessly',
  'revolutionary', 'revolutionize', 'revolutionise', 'cutting-edge',
  'state-of-the-art', 'world-class', 'best-in-class', 'game-changing',
  'AI-powered', 'AI-driven', 'powered by AI', 'unparalleled', 'robust',
  'leverage', 'ecosystem',
];

/* 2. Status labels. The guide tracks status; the page describes the product. */
const STATUS = ['roadmap', 'in development', 'coming soon', 'beta', 'GA', 'live now', 'currently building'];

/* 3. Phrases the brief says not to repeat. One use is a choice; two is a tic.
      Checked as a count across the whole file rather than per string. */
const LIMITED = {
  'one operational environment': 0,
  connected: 1,
  coordinated: 1,
  'mission software': 0,
};

console.log('DRISHTIKON copy rules\n');

console.log('banned vocabulary');
BANNED.forEach((w) => {
  const re = new RegExp(`\\b${w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
  strings.forEach((s) => { if (re.test(s)) fail(`"${w}" is banned`, s); });
});
if (!failures) console.log('  ok    none of the ' + BANNED.length + ' banned terms appear');

const before = failures;
console.log('\nstatus labels');
STATUS.forEach((w) => {
  const re = new RegExp(`\\b${w}\\b`, 'i');
  strings.forEach((s) => { if (re.test(s)) fail(`status label "${w}"`, s); });
});
if (failures === before) console.log('  ok    no status labels');

const beforeCounts = failures;
console.log('\nrepetition limits');
Object.entries(LIMITED).forEach(([phrase, max]) => {
  const n = strings.filter((s) => new RegExp(phrase, 'i').test(s)).length;
  if (n > max) fail(`"${phrase}" used ${n}×, limit ${max}`, strings.find((s) => new RegExp(phrase, 'i').test(s)));
});
if (failures === beforeCounts) console.log('  ok    within limits');

/* 4. No invented numbers. A bare integer or percentage in prose on a product
      page is a claim; the brief forbids counts and statistics outright.
      Ratios like 16/9 and the guide filename are not prose. */
const beforeNums = failures;
console.log('\ninvented numbers');
strings
  .filter((s) => s.includes(' ') && !/^\d+\/\d+$/.test(s) && !s.includes('.pdf'))
  .forEach((s) => {
    const m = s.match(/\b\d[\d,.]*\s*(%|\+|platforms|integrations|systems|customers|users)\b/i);
    if (m) fail('numeric claim', `${s}   →   "${m[0]}"`);
  });
if (failures === beforeNums) console.log('  ok    no counts, percentages or tallies');

/* 5. Length. The brief asks for one to three sentences per block; anything
      longer is documentation that has wandered onto the page. */
const beforeLen = failures;
console.log('\nparagraph length');
strings
  .filter((s) => /[.!?]/.test(s) && s.length > 40)
  .forEach((s) => {
    const sentences = s.split(/(?<=[.!?])\s+/).filter((x) => x.trim().length > 1);
    if (sentences.length > 3) fail(`${sentences.length} sentences, limit 3`, s.slice(0, 90) + '…');
    if (s.length > 260) fail(`${s.length} characters, limit 260`, s.slice(0, 90) + '…');
  });
if (failures === beforeLen) console.log('  ok    every block is 3 sentences or fewer');

/* 6. The buyer's sentence has to survive edits — it is rule 4 of the file's
      own doctrine and the first thing anyone reads. */
console.log('\nrequired copy');
const REQUIRED = 'One operational interface for heterogeneous unmanned systems.';
if (!strings.includes(REQUIRED)) fail('the opening statement was changed', REQUIRED);
else console.log('  ok    the opening statement is intact');

console.log(failures ? `\n${failures} problem(s)` : '\nAll copy rules pass.');
process.exit(failures ? 1 : 0);
