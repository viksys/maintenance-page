/*
  Client-side retrieval engine.

  No backend, no network, no dependencies. The whole corpus is a few hundred
  KB of strings already bundled with the app, so matching runs synchronously on
  every keystroke — typically well under a millisecond for this corpus size.

  Scoring is layered rather than a single similarity number, because the useful
  ranking signal is *where* a term matched, not just how closely:

      title exact            > title prefix > title word-boundary
      > alias/synonym match  > tag match    > summary > body

  A type weight is then applied so that, at comparable text relevance, a product
  outranks knowledge, and so on down to legal.
  Exact title matches short-circuit above everything.

  Typo tolerance is bounded Levenshtein (edit distance 1 for 4-6 char terms, 2
  for 7+). Short terms are matched strictly — at three characters almost
  everything is within one edit of everything else, and fuzzy matching there
  produces noise rather than tolerance.
*/

/* Ranking floor per content type. Higher wins. */
const TYPE_WEIGHT = {
  product: 70,
  knowledge: 40,
  faq: 30,
  company: 18,
  legal: 10,
};

export const TYPE_LABEL = {
  product: 'Product',
  knowledge: 'Knowledge',
  faq: 'FAQ',
  company: 'Company',
  legal: 'Legal',
};

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (s) => norm(s).split(' ').filter(Boolean);

/* Bounded edit distance. Returns Infinity once it exceeds `max` so the common
   case exits early instead of filling the full matrix. */
function editDistance(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return Infinity;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return Infinity;
    prev = cur;
  }
  return prev[b.length] <= max ? prev[b.length] : Infinity;
}

const fuzzyBudget = (term) => (term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0);

/* Does `term` match any token in `text`, allowing prefix and bounded typos?
   Returns a quality score 0..1, or 0 for no match. */
function matchInText(term, tokens) {
  let best = 0;
  for (const tok of tokens) {
    if (tok === term) return 1;
    if (tok.startsWith(term)) {
      best = Math.max(best, 0.85);
      continue;
    }
    if (term.length >= 4 && tok.includes(term)) {
      best = Math.max(best, 0.6);
      continue;
    }
    const budget = fuzzyBudget(term);
    if (budget > 0) {
      const d = editDistance(term, tok, budget);
      if (d !== Infinity) best = Math.max(best, d === 1 ? 0.55 : 0.4);
    }
  }
  return best;
}

/*
  Score one document against the query terms.
  Every term must contribute something, otherwise the document is rejected —
  this keeps multi-word queries conjunctive ("edge computing" should not match
  a document that only knows about "edge").
*/
function scoreDoc(doc, terms, rawQuery) {
  const titleN = norm(doc.title);
  let score = 0;

  /* Whole-query exact / prefix on the title short-circuits to the top. */
  if (titleN === rawQuery) score += 1000;
  else if (titleN.startsWith(rawQuery)) score += 420;
  else if (titleN.includes(rawQuery)) score += 260;

  for (const term of terms) {
    const inTitle = matchInText(term, doc._title);
    const inAlias = matchInText(term, doc._alias);
    const inTags = matchInText(term, doc._tags);
    const inSummary = matchInText(term, doc._summary);
    const inBody = matchInText(term, doc._body);

    const termScore =
      inTitle * 120 + inAlias * 90 + inTags * 60 + inSummary * 34 + inBody * 14;

    if (termScore === 0) return 0; // conjunctive: this term matched nothing
    score += termScore;
  }

  return score + (TYPE_WEIGHT[doc.type] || 0);
}

export function search(index, query, limit = 24) {
  const rawQuery = norm(query);
  if (rawQuery.length < 2) return [];
  const terms = tokenize(rawQuery);
  if (!terms.length) return [];

  const out = [];
  for (const doc of index) {
    const s = scoreDoc(doc, terms, rawQuery);
    if (s > 0) out.push({ doc, score: s });
  }

  out.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));
  return out.slice(0, limit).map((r) => r.doc);
}

/*
  Split `text` into highlighted / plain runs for the matched terms.
  Operates on the original string so casing and punctuation survive.
*/
export function highlight(text, query) {
  const src = String(text || '');
  const terms = tokenize(query).filter((t) => t.length >= 2);
  if (!terms.length) return [{ text: src, hit: false }];

  const marks = new Array(src.length).fill(false);
  const lower = src.toLowerCase();
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(term, from);
      if (at === -1) break;
      for (let i = at; i < at + term.length; i++) marks[i] = true;
      from = at + term.length;
    }
  }

  const runs = [];
  let i = 0;
  while (i < src.length) {
    const hit = marks[i];
    let j = i;
    while (j < src.length && marks[j] === hit) j++;
    runs.push({ text: src.slice(i, j), hit });
    i = j;
  }
  return runs;
}

/*
  Return a window of the summary/body centred on the first match, so results
  show the sentence the term actually appeared in rather than a generic opening.
*/
export function snippet(doc, query, len = 165) {
  const source = doc.summary || doc.body || '';
  const terms = tokenize(query);
  const lower = source.toLowerCase();

  let at = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (at === -1 || i < at)) at = i;
  }
  if (at === -1 || source.length <= len) return source.slice(0, len) + (source.length > len ? '…' : '');

  const start = Math.max(0, at - 55);
  const cut = source.slice(start, start + len);
  return (start > 0 ? '…' : '') + cut.trim() + (start + len < source.length ? '…' : '');
}

/* Precompute token arrays once at module load — matching then avoids
   re-tokenising the corpus on every keystroke. */
export function prepare(docs) {
  return docs.map((d) => ({
    ...d,
    _title: tokenize(d.title),
    _alias: tokenize((d.aliases || []).join(' ')),
    _tags: tokenize((d.tags || []).join(' ')),
    _summary: tokenize(d.summary),
    _body: tokenize(d.body),
  }));
}
