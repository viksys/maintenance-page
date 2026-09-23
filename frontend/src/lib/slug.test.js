/*
  Tests for the anchor slug helpers.

  These ids are not cosmetic. src/components/FAQ.js and src/pages/Knowledge.js
  render them onto the DOM, src/data/searchIndex.js builds the hrefs that point
  at them, and FAQ.js opens the matching accordion by comparing a location hash
  against faqAnchor(). If the function's output ever changes shape, every
  previously shared deep link lands on a page that scrolls nowhere — silently,
  because a missing fragment is not an error.

  So the cases below pin the OUTPUT SHAPE, not just "it returns a string".
*/

import { faqAnchor, termAnchor } from '@/lib/slug';

describe('slug generation', () => {
  test('a written question becomes a lower-case dashed anchor', () => {
    expect(faqAnchor('Does VIKASANA build drones?')).toBe('faq-does-vikasana-build-drones');
  });

  test('accents are stripped to their base letters rather than deleted', () => {
    /* "Café" must become "cafe", not "caf" — the second would put the anchor
       under a word nobody would guess when writing a link by hand. */
    expect(termAnchor('Café Déjà Vu')).toBe('term-cafe-deja-vu');
    expect(termAnchor('Naïve Señor')).toBe('term-naive-senor');
  });

  test('quotes are dropped rather than turned into a gap', () => {
    /* An apostrophe sits INSIDE a word. Treating it as a separator would split
       "Don't" into "don-t", which reads as two words and is not what anyone
       would type into a URL bar. */
    expect(faqAnchor("Don't Panic")).toBe('faq-dont-panic');
    expect(faqAnchor('It’s Here')).toBe('faq-its-here');
    expect(termAnchor('“Quoted” Term')).toBe('term-quoted-term');
    expect(termAnchor('The "Edge" Case')).toBe('term-the-edge-case');
  });

  test('an ampersand is spelled out, because it cannot survive as a character', () => {
    expect(termAnchor('Command & Control')).toBe('term-command-and-control');
    expect(termAnchor('R&D')).toBe('term-r-and-d');
  });

  test('leading and trailing separators are trimmed off the slug body', () => {
    expect(termAnchor('  --Hello--  ')).toBe('term-hello');
    expect(faqAnchor('...What is this?')).toBe('faq-what-is-this');
    expect(termAnchor('(Parenthesised)')).toBe('term-parenthesised');
  });

  test('runs of punctuation and whitespace collapse to a single dash', () => {
    expect(termAnchor('ISR — Intelligence, Surveillance, Reconnaissance'))
      .toBe('term-isr-intelligence-surveillance-reconnaissance');
    expect(termAnchor('Multi-Domain   Operations (MDO)'))
      .toBe('term-multi-domain-operations-mdo');
  });

  test('the slug body is capped at 72 characters so an anchor stays quotable', () => {
    const long = 'The quick brown fox jumps over the lazy dog while the sly cat watches from the wall';
    const anchor = termAnchor(long);

    expect(anchor.startsWith('term-')).toBe(true);
    expect(anchor.slice('term-'.length)).toHaveLength(72);
  });

  test('empty, null and unusable input still produce a namespaced anchor', () => {
    /* A bare "faq-" is useless as a destination but it is at least a valid id.
       Returning undefined here would put the string "undefined" into an href. */
    expect(faqAnchor('')).toBe('faq-');
    expect(faqAnchor(null)).toBe('faq-');
    expect(faqAnchor(undefined)).toBe('faq-');
    expect(termAnchor('!!!')).toBe('term-');
  });

  test('the same input always produces the same anchor', () => {
    /* The whole design depends on two call sites deriving the same id from the
       same string without coordinating. Any state or randomness breaks that. */
    const q = 'What is DRISHTIKON?';
    expect(faqAnchor(q)).toBe(faqAnchor(q));
    expect(termAnchor(q)).toBe(termAnchor(q));
  });

  /*
    BUG — truncation happens AFTER the dash trim, so a slug cut at 72 can end
    on a separator. src/lib/slug.js lines 18-20 run the trim, then .slice(0, 72).

        'x'.repeat(71) + ' tail'  ->  'xxx…xxx-'   (72 chars, trailing dash)

    Both producers call the same function so the link and the id still agree,
    which is why this has not broken anything visible. Nothing in the corpus
    reaches the cap either — the longest slug today is 48 characters, from
    "What does software-defined, hardware-enabled mean?" — so this is latent
    rather than live. It is still wrong: the trim exists precisely so an anchor
    does not end on a separator, and the truncation undoes it. The fix is to
    trim again after the slice.

    Skipped rather than deleted, and written for the INTENDED behaviour.
  */
  it('a truncated slug does not end on a dangling separator', () => {
    const long = `${'x'.repeat(71)} tail`;

    expect(termAnchor(long).endsWith('-')).toBe(false);
  });
});

describe('anchor namespacing', () => {
  test('an FAQ and a glossary term with identical wording cannot collide', () => {
    /* Company and Knowledge both render on pages that can carry the other's
       content; two elements with the same id would make the browser scroll to
       whichever came first. */
    const wording = 'Sensor Fusion';

    expect(faqAnchor(wording)).toBe('faq-sensor-fusion');
    expect(termAnchor(wording)).toBe('term-sensor-fusion');
    expect(faqAnchor(wording)).not.toBe(termAnchor(wording));
  });

  test('no FAQ anchor can ever equal a term anchor, whatever the wording', () => {
    const samples = ['', 'Edge', 'term-edge', 'faq-edge', 'Ground Control Station (GCS)'];

    samples.forEach((a) =>
      samples.forEach((b) => {
        expect(faqAnchor(a)).not.toBe(termAnchor(b));
      })
    );
  });

  test('every anchor is a valid HTML id — no spaces, no punctuation, no upper case', () => {
    const samples = [
      'What is VIKASANA Systems?',
      'ISR — Intelligence, Surveillance, Reconnaissance',
      'Café & Crème',
      "Who's hiring?",
    ];

    samples.forEach((s) => {
      expect(faqAnchor(s)).toMatch(/^faq-[a-z0-9-]*$/);
      expect(termAnchor(s)).toMatch(/^term-[a-z0-9-]*$/);
    });
  });
});
