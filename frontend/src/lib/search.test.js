/*
  Tests for the client-side retrieval engine.

  These are written against the CONTRACT stated in src/lib/search.js's header —
  the ranking ladder, the conjunctive rule, and the typo budget — not against
  whatever the current implementation happens to return. The scoring constants
  are deliberately never asserted: they are tuning, and a test that pins them
  would fail on every tuning pass while protecting nothing. What is asserted is
  ORDER and INCLUSION, which is what a visitor actually experiences.

  Every fixture goes through prepare(), because search() reads the precomputed
  _title/_alias/_tags/_summary/_body token arrays and a raw document would
  throw rather than simply score zero.
*/

import { search, highlight, snippet, prepare, TYPE_LABEL } from '@/lib/search';

/* A document with every field present, so a fixture only has to name the one
   field the case is actually about. */
const doc = (over) =>
  ({ type: 'knowledge', title: '', summary: '', body: '', tags: [], aliases: [], ...over });

const index = (...docs) => prepare(docs.map(doc));

const ids = (results) => results.map((r) => r.id);

describe('search() query gate', () => {
  const idx = index({ id: 'a', title: 'Edge Computing' });

  test('a query shorter than two characters returns nothing rather than the whole corpus', () => {
    expect(search(idx, 'e')).toEqual([]);
    expect(search(idx, ' e ')).toEqual([]);
  });

  test('an empty or whitespace-only query returns nothing', () => {
    expect(search(idx, '')).toEqual([]);
    expect(search(idx, '   ')).toEqual([]);
    expect(search(idx, null)).toEqual([]);
    expect(search(idx, undefined)).toEqual([]);
  });

  test('a punctuation-only query returns nothing, because normalisation leaves no terms', () => {
    expect(search(idx, '!!!')).toEqual([]);
    expect(search(idx, '... ???')).toEqual([]);
    expect(search(idx, '@#$%^*()')).toEqual([]);
  });

  test('an empty corpus returns no results rather than throwing', () => {
    expect(search([], 'edge computing')).toEqual([]);
  });

  test('limit caps the number of results returned', () => {
    const many = index(
      { id: 'a', title: 'Edge One' },
      { id: 'b', title: 'Edge Two' },
      { id: 'c', title: 'Edge Three' },
    );
    expect(search(many, 'edge', 2)).toHaveLength(2);
    expect(search(many, 'edge')).toHaveLength(3);
  });
});

describe('search() ranking', () => {
  test('an exact title match outranks a richer document of a higher-weighted type', () => {
    /* The losing document is a product (the top type weight) that matches the
       query in its title, tags, summary AND body. The winner is a legal page
       (the bottom weight) whose only asset is that its title IS the query.
       If the short-circuit ever stops short-circuiting, this inverts. */
    const idx = index(
      { id: 'exact', type: 'legal', title: 'Sensor Fusion' },
      {
        id: 'rich',
        type: 'product',
        title: 'Sensor Fusion Deep Dive And More',
        tags: ['sensor', 'fusion'],
        summary: 'sensor fusion explained',
        body: 'sensor fusion in the field',
      },
    );

    expect(ids(search(idx, 'sensor fusion'))).toEqual(['exact', 'rich']);
  });

  test('whole-query title matches rank exact above prefix above substring', () => {
    const idx = index(
      { id: 'exact', title: 'Edge Compute' },
      { id: 'prefix', title: 'Edge Compute Module' },
      { id: 'substring', title: 'Tactical Edge Compute Node' },
    );

    expect(ids(search(idx, 'edge compute'))).toEqual(['exact', 'prefix', 'substring']);
  });

  test('a term is worth more in the title than the alias, tags, summary, then body', () => {
    /* Two terms, and no title contains the query as a contiguous string, so the
       whole-query bonus is out of the picture and only the per-field weights
       are being compared. */
    const idx = index(
      { id: 'title', title: 'Lattice Systems Mesh' },
      { id: 'alias', title: 'Alpha Node', aliases: ['lattice', 'mesh'] },
      { id: 'tags', title: 'Bravo Node', tags: ['lattice', 'mesh'] },
      { id: 'summary', title: 'Charlie Node', summary: 'lattice and mesh' },
      { id: 'body', title: 'Delta Node', body: 'lattice and mesh' },
    );

    expect(ids(search(idx, 'lattice mesh')))
      .toEqual(['title', 'alias', 'tags', 'summary', 'body']);
  });

  test('match quality degrades from exact token to prefix to substring to typo', () => {
    /* All five documents carry their only signal in the same field, so the
       ONLY thing separating them is how well the token matched. */
    const idx = index(
      { id: 'exact', title: 'Doc A', tags: ['control'] },
      { id: 'prefix', title: 'Doc B', tags: ['controller'] },
      { id: 'substring', title: 'Doc C', tags: ['xcontroly'] },
      { id: 'typo-one', title: 'Doc D', tags: ['contral'] },
      { id: 'typo-two', title: 'Doc E', tags: ['cuntral'] },
    );

    expect(ids(search(idx, 'control')))
      .toEqual(['exact', 'prefix', 'substring', 'typo-one', 'typo-two']);
  });

  test('type weight breaks a tie in the documented order', () => {
    /* Identical documents in every respect except `type`, so the only thing
       that can order them is the per-type floor. */
    const idx = index(
      { id: 'legal', type: 'legal', title: 'Common Record', tags: ['zephyr'] },
      { id: 'company', type: 'company', title: 'Common Record', tags: ['zephyr'] },
      { id: 'faq', type: 'faq', title: 'Common Record', tags: ['zephyr'] },
      { id: 'knowledge', type: 'knowledge', title: 'Common Record', tags: ['zephyr'] },
      { id: 'product', type: 'product', title: 'Common Record', tags: ['zephyr'] },
    );

    expect(ids(search(idx, 'zephyr')))
      .toEqual(['product', 'knowledge', 'faq', 'company', 'legal']);
  });

  test('an unknown type still ranks, it just contributes no floor of its own', () => {
    const idx = index(
      { id: 'known', type: 'product', title: 'Doc A', tags: ['zephyr'] },
      { id: 'unknown', type: 'not-a-real-type', title: 'Doc B', tags: ['zephyr'] },
    );

    expect(ids(search(idx, 'zephyr'))).toEqual(['known', 'unknown']);
  });
});

describe('search() multi-term matching is conjunctive', () => {
  const idx = index(
    { id: 'both', title: 'Edge Computing Guide' },
    { id: 'edge-only', title: 'Edge Node', body: 'the edge of the network' },
  );

  test('a document matching only one of two query terms is excluded entirely', () => {
    /* "edge computing" must not surface a document that only knows about
       "edge" — that is the difference between a search box and a keyword
       soup, and it is the single behaviour most likely to regress silently. */
    expect(ids(search(idx, 'edge computing'))).toEqual(['both']);
  });

  test('both documents still surface for the single term they share', () => {
    expect(ids(search(idx, 'edge')).sort()).toEqual(['both', 'edge-only']);
  });

  test('adding a term that matches nothing empties the result set', () => {
    expect(search(idx, 'edge quixotic')).toEqual([]);
  });
});

describe('search() typo tolerance boundaries', () => {
  /* The budget is derived from the length of the QUERY TERM: 0 below four
     characters, 1 for four to six, 2 for seven and above. Each case below
     pairs a passing control with the failure one character past the boundary,
     because a budget that silently widened would pass a one-sided test. */

  test('terms under four characters are matched strictly, with no typo allowance', () => {
    const idx = index({ id: 'a', title: 'Cop Overview' });

    expect(ids(search(idx, 'cop'))).toEqual(['a']);
    expect(search(idx, 'cap')).toEqual([]);
  });

  test('a four-character term tolerates one edit', () => {
    const idx = index({ id: 'a', title: 'Mesh Network' });

    expect(ids(search(idx, 'mesh'))).toEqual(['a']);
    expect(ids(search(idx, 'mash'))).toEqual(['a']);
  });

  test('a six-character term tolerates one edit but not two', () => {
    const idx = index({ id: 'a', title: 'Fusion Layer' });

    expect(ids(search(idx, 'fusiom'))).toEqual(['a']);
    expect(search(idx, 'fusiam')).toEqual([]);
  });

  test('a seven-character term tolerates two edits but not three', () => {
    const idx = index({ id: 'a', title: 'Mission Planning' });

    expect(ids(search(idx, 'missiam'))).toEqual(['a']);
    expect(search(idx, 'massiam')).toEqual([]);
  });

  test('a term far longer than any token is rejected on the length bound alone', () => {
    /* editDistance bails before building a matrix once the length difference
       already exceeds the budget. Observable only as "no match", but this is
       the path that keeps a pasted paragraph from costing a full matrix per
       token per document. */
    const idx = index({ id: 'a', title: 'Edge' });

    expect(search(idx, 'edgecomputingplatform')).toEqual([]);
  });

  test('a pathologically long query returns nothing without hanging', () => {
    const idx = index({ id: 'a', title: 'Edge Computing', body: 'edge computing at the edge' });

    expect(search(idx, 'z'.repeat(500))).toEqual([]);
  });
});

describe('search() input normalisation', () => {
  test('curly quotes in the corpus are found by a query typed with straight ones', () => {
    /* The corpus is written with typographic apostrophes; nobody types one
       into a search box. The normaliser folds both to U+0027 so the two
       spellings are one term. */
    const idx = index({ id: 'a', title: 'VIKASANA’s Platform' });

    expect(ids(search(idx, "vikasana's platform"))).toEqual(['a']);
    expect(ids(search(idx, 'vikasana’s platform'))).toEqual(['a']);
  });

  test('case and surrounding punctuation do not change what is found', () => {
    const idx = index({ id: 'a', title: 'Sensor Fusion' });

    expect(ids(search(idx, '  SENSOR, FUSION!  '))).toEqual(['a']);
  });

  test('hyphenated vocabulary survives normalisation as a single term', () => {
    const idx = index({ id: 'a', title: 'Multi-Domain Operations' });

    expect(ids(search(idx, 'multi-domain'))).toEqual(['a']);
  });
});

describe('highlight()', () => {
  test('runs always reassemble into the original string, casing and punctuation intact', () => {
    const src = 'The EDGE, at last — Edge computing.';
    const runs = highlight(src, 'edge');

    expect(runs.map((r) => r.text).join('')).toBe(src);
    expect(runs.filter((r) => r.hit).map((r) => r.text)).toEqual(['EDGE', 'Edge']);
  });

  test('a match splits the text into hit and non-hit runs in document order', () => {
    expect(highlight('Edge Computing', 'edge')).toEqual([
      { text: 'Edge', hit: true },
      { text: ' Computing', hit: false },
    ]);
  });

  test('every occurrence of a term is marked, not only the first', () => {
    expect(highlight('edge to edge', 'edge')).toEqual([
      { text: 'edge', hit: true },
      { text: ' to ', hit: false },
      { text: 'edge', hit: true },
    ]);
  });

  test('overlapping matches from different terms merge into one run', () => {
    /* "abcd" and "cdef" overlap at "cd". Marking must union rather than emit
       two runs that double-render the shared characters. */
    expect(highlight('abcdef', 'abcd cdef')).toEqual([{ text: 'abcdef', hit: true }]);
  });

  test('text with no match is returned as a single non-hit run', () => {
    expect(highlight('Edge Computing', 'fusion')).toEqual([
      { text: 'Edge Computing', hit: false },
    ]);
  });

  test('single-character query terms are ignored rather than highlighting every vowel', () => {
    expect(highlight('A big edge', 'a')).toEqual([{ text: 'A big edge', hit: false }]);
  });

  test('an empty or missing query leaves the text unmarked', () => {
    expect(highlight('Edge Computing', '')).toEqual([{ text: 'Edge Computing', hit: false }]);
    expect(highlight('Edge Computing', null)).toEqual([{ text: 'Edge Computing', hit: false }]);
  });
});

describe('snippet()', () => {
  test('a source shorter than the window is returned whole, with no ellipsis', () => {
    expect(snippet({ summary: 'Short and sweet.' }, 'sweet')).toBe('Short and sweet.');
  });

  test('a long source with no match falls back to the opening, marked as truncated', () => {
    const summary = 'q'.repeat(300);
    const out = snippet({ summary }, 'needle');

    expect(out).toBe(`${'q'.repeat(165)}…`);
  });

  test('the window centres on the match rather than on the opening sentence', () => {
    const summary = `${'x'.repeat(100)} needle ${'y'.repeat(200)}`;
    const out = snippet({ summary }, 'needle');

    expect(out).toContain('needle');
    expect(out.startsWith('…')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
  });

  test('a leading ellipsis is omitted when the window starts at the beginning', () => {
    const summary = `needle ${'q'.repeat(300)}`;
    const out = snippet({ summary }, 'needle');

    expect(out.startsWith('needle')).toBe(true);
    expect(out.endsWith('…')).toBe(true);
  });

  test('a trailing ellipsis is omitted when the window reaches the end of the source', () => {
    /* The ellipsis is a truthful claim that text was removed. A snippet that
       ends at the last character of the summary must not claim otherwise. */
    const summary = `${'z'.repeat(200)} needle end.`;
    const out = snippet({ summary }, 'needle');

    expect(out.startsWith('…')).toBe(true);
    expect(out.endsWith('needle end.')).toBe(true);
  });

  test('the window centres on the earliest matching term, not the first one typed', () => {
    const summary = `${'p'.repeat(100)} beta ${'q'.repeat(200)} alpha ${'r'.repeat(50)}`;
    const out = snippet({ summary }, 'alpha beta');

    expect(out).toContain('beta');
    expect(out).not.toContain('alpha');
  });

  test('body is used when the document carries no summary', () => {
    expect(snippet({ summary: '', body: 'Body text here.' }, 'body')).toBe('Body text here.');
  });

  test('a document with neither summary nor body yields an empty snippet', () => {
    expect(snippet({}, 'anything')).toBe('');
  });
});

describe('prepare()', () => {
  test('token arrays are precomputed for every scored field', () => {
    const [d] = prepare([
      doc({ id: 'a', title: 'Edge Compute', aliases: ['edge unit'], tags: ['edge'], summary: 'A summary.', body: 'A body.' }),
    ]);

    expect(d._title).toEqual(['edge', 'compute']);
    expect(d._alias).toEqual(['edge', 'unit']);
    expect(d._tags).toEqual(['edge']);
    expect(d._summary).toEqual(['a', 'summary']);
    expect(d._body).toEqual(['a', 'body']);
  });

  test('the original document fields survive preparation', () => {
    const [d] = prepare([doc({ id: 'a', title: 'Edge', url: '/edge' })]);

    expect(d.id).toBe('a');
    expect(d.title).toBe('Edge');
    expect(d.url).toBe('/edge');
  });

  test('missing optional fields prepare to empty token arrays rather than throwing', () => {
    const [d] = prepare([{ id: 'a', title: 'Edge' }]);

    expect(d._alias).toEqual([]);
    expect(d._tags).toEqual([]);
    expect(d._summary).toEqual([]);
    expect(d._body).toEqual([]);
  });
});

describe('TYPE_LABEL', () => {
  test('every content type the engine weights has a label the result list can render', () => {
    /* A missing entry renders `undefined` in the result row's type badge. The
       weights are private to the module, so the type vocabulary is restated
       here: if a sixth type is ever added, this is the reminder to label it. */
    expect(Object.keys(TYPE_LABEL).sort())
      .toEqual(['company', 'faq', 'knowledge', 'legal', 'product']);
  });
});
