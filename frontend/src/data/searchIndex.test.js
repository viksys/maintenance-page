/*
  Tests for the built search corpus.

  The engine itself is covered in src/lib/search.test.js with synthetic
  fixtures. What is covered HERE is the wiring: that the real index points at
  destinations which exist, and that the deep-link fragments it builds are the
  same ids the pages actually render.

  That second one is the whole reason src/lib/slug.js exists as a shared
  module. A search result that lands on /knowledge#term-sensor-fusion when the
  page renders id="term-sensor-fusion-" does not error, does not warn, and does
  not look broken — the page simply opens at the top and the visitor assumes
  the feature is imprecise.
*/

import fs from 'fs';
import path from 'path';

import { SEARCH_INDEX } from '@/data/searchIndex';
import { ROUTES, canonicalPath } from '@/data/seo';
import { TYPE_LABEL } from '@/lib/search';
import { faqAnchor, termAnchor } from '@/lib/slug';

const basePath = (url) => String(url).split('#')[0];
const fragment = (url) => {
  const i = String(url).indexOf('#');
  return i === -1 ? '' : String(url).slice(i + 1);
};

describe('the corpus is well formed', () => {
  test('the index is not empty', () => {
    /* Every assertion below is vacuously true over an empty array, so this
       has to come first. */
    expect(SEARCH_INDEX.length).toBeGreaterThan(20);
  });

  test('every document carries the fields a result row renders', () => {
    SEARCH_INDEX.forEach((d) => {
      expect(typeof d.id).toBe('string');
      expect(d.id).not.toBe('');
      expect(typeof d.title).toBe('string');
      expect(d.title.trim()).not.toBe('');
      expect(typeof d.url).toBe('string');
      expect(d.url.startsWith('/')).toBe(true);
      expect(typeof d.breadcrumb).toBe('string');
      expect(d.breadcrumb.trim()).not.toBe('');
    });
  });

  test('no two documents share an id', () => {
    /* The id is the React key for the result list. Duplicates make results
       disappear and reorder as the query is typed. */
    const ids = SEARCH_INDEX.map((d) => d.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every document type has a label the result row can display', () => {
    const types = [...new Set(SEARCH_INDEX.map((d) => d.type))];

    types.forEach((t) => {
      expect(TYPE_LABEL[t]).toBeDefined();
    });
  });

  test('every document arrives pre-tokenised, or scoring would throw on it', () => {
    SEARCH_INDEX.forEach((d) => {
      expect(Array.isArray(d._title)).toBe(true);
      expect(Array.isArray(d._alias)).toBe(true);
      expect(Array.isArray(d._tags)).toBe(true);
      expect(Array.isArray(d._summary)).toBe(true);
      expect(Array.isArray(d._body)).toBe(true);
    });
  });
});

describe('every search result points at a destination that exists', () => {
  test('the path of every document is a registered route', () => {
    /* The route table is the single source and four things derive from it.
       A search result is the fifth, and a result that 404s is worse than no
       result at all. */
    const orphans = SEARCH_INDEX
      .map((d) => basePath(d.url))
      .filter((p) => !ROUTES[p]);

    expect([...new Set(orphans)]).toEqual([]);
  });

  test('the path of every document is already in canonical form', () => {
    SEARCH_INDEX.forEach((d) => {
      const p = basePath(d.url);
      expect(canonicalPath(p)).toBe(p);
    });
  });
});

describe('deep-link fragments match the anchors the pages render', () => {
  test('every knowledge document links to the anchor its own title generates', () => {
    const knowledge = SEARCH_INDEX.filter((d) => d.type === 'knowledge' && d.url.includes('#'));

    expect(knowledge.length).toBeGreaterThan(0);
    knowledge.forEach((d) => {
      expect(fragment(d.url)).toBe(termAnchor(d.title));
    });
  });

  test('every FAQ document links to the anchor its own question generates', () => {
    const faqs = SEARCH_INDEX.filter((d) => d.type === 'faq');

    expect(faqs.length).toBeGreaterThan(0);
    faqs.forEach((d) => {
      expect(fragment(d.url)).toBe(faqAnchor(d.title));
    });
  });

  test('no two documents resolve to the same anchor on the same page', () => {
    /* Two identical ids on one page means the browser scrolls to whichever
       the parser saw first, so one of the two results is permanently wrong. */
    const anchored = SEARCH_INDEX.filter((d) => d.url.includes('#')).map((d) => d.url);

    expect(new Set(anchored).size).toBe(anchored.length);
  });

  test('the glossary the index deep-links into is the glossary the page renders', () => {
    /*
      src/pages/Knowledge.js holds its term list in a module-private TERMS
      const, and src/data/searchIndex.js holds a second copy of the same list
      to build the index from. Two hand-maintained copies of one list is the
      exact shape of drift this whole slug module was written to prevent, and
      nothing else in the build compares them — so it is compared here, by
      reading the page source.

      If this test ever fails because the extraction stopped working rather
      than because the lists diverged, the right fix is to EXPORT the term list
      from one module and import it into the other, which removes the need for
      this test entirely.
    */
    const src = fs.readFileSync(path.join(__dirname, '..', 'pages', 'Knowledge.js'), 'utf8');
    const rendered = [...src.matchAll(/^\s*term: '((?:[^'\\]|\\.)*)',/gm)].map((m) => m[1]);

    expect(rendered.length).toBeGreaterThan(5);

    const renderedAnchors = rendered.map(termAnchor).sort();
    const indexedAnchors = SEARCH_INDEX
      .filter((d) => d.type === 'knowledge' && d.url.includes('#'))
      .map((d) => fragment(d.url))
      .sort();

    expect(indexedAnchors).toEqual(renderedAnchors);
  });
});
