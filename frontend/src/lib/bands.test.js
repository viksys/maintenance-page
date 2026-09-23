/*
  Tests for the band tone system.

  A band is not a background colour, it is a background plus every foreground
  value that has to move with it. The failure mode this module exists to
  prevent is a half-flipped band: the surface inverts and the text does not,
  and the page ships unreadable. So the tests below check the SHAPE of a band
  as hard as they check the alternation — a band missing one key hands a call
  site `undefined`, which CSS drops silently and which therefore survives
  review by eye.

  The accent substitution is checked separately. docs/TYPOGRAPHY.md and this
  module both record it as an accessibility decision taken on 3 September 2026,
  reversing a standing directive: the brand orange measures 2.52:1 on white and
  is replaced per band so that required-field markers, accordion indicators and
  inline links clear the threshold a government accessibility assessment
  applies. That is the kind of decision that gets quietly reverted by someone
  tidying up "two oranges", so it is locked down here.
*/

import fs from 'fs';
import path from 'path';

import { band, DARK_BAND, LIGHT_BAND } from '@/lib/bands';

/* Every key a call site reads off a band. Listed explicitly rather than
   derived from one of the bands, so that deleting a key from BOTH bands still
   fails this test instead of quietly agreeing with itself. */
const REQUIRED_KEYS = [
  'tone',
  'bg',
  'fg',
  'heading',
  'body',
  'bodyStrong',
  'muted',
  'rule',
  'ruleStrong',
  'surface',
  'surfaceBorder',
  'surfaceAlt',
  'accent',
];

describe('band() alternation', () => {
  test('the hero is dark, because every page opens dark', () => {
    expect(band(0)).toBe(DARK_BAND);
    expect(band(0).tone).toBe('dark');
  });

  test('bands alternate dark, light, dark, light down the page', () => {
    const tones = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => band(i).tone);

    expect(tones).toEqual([
      'dark', 'light', 'dark', 'light', 'dark', 'light', 'dark', 'light',
    ]);
  });

  test('the tone is a pure function of the index', () => {
    /* Inserting a section re-tones everything after it. That only works if the
       answer depends on nothing but the position. */
    expect(band(4)).toBe(band(4));
    expect(band(5)).toBe(band(5));
    expect(band(2)).toBe(band(0));
    expect(band(3)).toBe(band(1));
  });

  test('a numeric string index is honoured, since props arrive stringly typed', () => {
    expect(band('1')).toBe(LIGHT_BAND);
    expect(band('2')).toBe(DARK_BAND);
  });

  test('an unusable index falls back to dark rather than to an accidental white page', () => {
    /* A missing prop must fail toward the page's opening tone. Falling to
       light would put dark-band text on a white surface at whatever position
       the mistake happened to be. */
    expect(band(undefined)).toBe(DARK_BAND);
    expect(band(null)).toBe(DARK_BAND);
    expect(band('not-a-number')).toBe(DARK_BAND);
    expect(band({})).toBe(DARK_BAND);
    expect(band(NaN)).toBe(DARK_BAND);
    /* Negative indices are deliberately not asserted either way. They are
       numeric, so they are not the fail-safe case, and no position on a page
       is negative — pinning what JS modulo happens to do with -1 would turn a
       correct rewrite of the alternation into a failing test. */
  });
});

describe('a band carries a complete set of paired values', () => {
  test.each([['dark', DARK_BAND], ['light', LIGHT_BAND]])(
    'the %s band supplies every key a call site reads',
    (_tone, b) => {
      REQUIRED_KEYS.forEach((key) => {
        expect(b[key]).toBeDefined();
        expect(typeof b[key]).toBe('string');
        expect(b[key].trim()).not.toBe('');
      });
    }
  );

  test('the two bands expose exactly the same keys', () => {
    /* A key present on one band only produces a page that renders correctly
       until it is moved one position up or down. */
    expect(Object.keys(DARK_BAND).sort()).toEqual(Object.keys(LIGHT_BAND).sort());
  });

  test('every band value is a CSS custom property, never a hex literal', () => {
    /* The palette lives in index.css and nowhere else. A literal here is a
       colour that no contrast audit and no theme change can reach. */
    [DARK_BAND, LIGHT_BAND].forEach((b) => {
      Object.entries(b).forEach(([key, value]) => {
        if (key === 'tone') return;
        expect(value).toMatch(/^var\(--[a-z0-9-]+\)$/);
      });
    });
  });

  test('every custom property a band names is declared in index.css', () => {
    /* An undeclared var() resolves to nothing and the property is dropped, so
       the element inherits — which looks like a styling oversight rather than
       a missing token, and is therefore fixed in the wrong place. */
    const css = fs.readFileSync(path.join(__dirname, '..', 'index.css'), 'utf8');
    const declared = new Set(
      (css.match(/--[a-zA-Z0-9-]+\s*:/g) || []).map((m) => m.replace(/\s*:$/, ''))
    );

    const missing = [];
    [DARK_BAND, LIGHT_BAND].forEach((b) => {
      Object.entries(b).forEach(([key, value]) => {
        if (key === 'tone') return;
        const token = value.slice('var('.length, -1);
        if (!declared.has(token)) missing.push(`${b.tone}.${key} -> ${token}`);
      });
    });

    expect(missing).toEqual([]);
  });

  test('the surface values differ between the bands, so a card is visible on both', () => {
    expect(DARK_BAND.bg).not.toBe(LIGHT_BAND.bg);
    expect(DARK_BAND.fg).not.toBe(LIGHT_BAND.fg);
    expect(DARK_BAND.heading).not.toBe(LIGHT_BAND.heading);
    expect(DARK_BAND.body).not.toBe(LIGHT_BAND.body);
    expect(DARK_BAND.rule).not.toBe(LIGHT_BAND.rule);
    expect(DARK_BAND.surfaceAlt).not.toBe(LIGHT_BAND.surfaceAlt);
  });

  test('headings and body copy are distinguishable within a band without a size change', () => {
    expect(DARK_BAND.heading).not.toBe(DARK_BAND.body);
    expect(LIGHT_BAND.heading).not.toBe(LIGHT_BAND.body);
  });

  test('the working-instruction role sits between heading and body on both bands', () => {
    /* bodyStrong exists because a sentence the reader must act on was set in
       `body`, identical to the description above it, and read as appended
       text. If it collapses back onto `body` the distinction is gone. */
    expect(DARK_BAND.bodyStrong).not.toBe(DARK_BAND.body);
    expect(LIGHT_BAND.bodyStrong).not.toBe(LIGHT_BAND.body);
  });

  test('the strong rule is a different token from the hairline', () => {
    /* ruleStrong carries state — it is the only thing identifying some
       controls — and owes 3:1 where a hairline owes nothing. */
    expect(DARK_BAND.rule).not.toBe(DARK_BAND.ruleStrong);
    expect(LIGHT_BAND.rule).not.toBe(LIGHT_BAND.ruleStrong);
  });
});

describe('the accent is substituted per band for contrast', () => {
  test('the small-text accent is a different token on light than on dark', () => {
    /* --amber (#FF6A00) measures 2.52:1 on white and cannot set small text
       there; --amber-text (#B24700) is the same hue at 4.87:1. Collapsing
       these back to one value is what the 3 September 2026 decision reversed. */
    expect(DARK_BAND.accent).toBe('var(--amber)');
    expect(LIGHT_BAND.accent).toBe('var(--amber-text)');
    expect(DARK_BAND.accent).not.toBe(LIGHT_BAND.accent);
  });

  test('a band states the tone split and leaves the size split to CSS', () => {
    /* --amber-display is back in index.css, carrying display-sized accents on
       a light band through .text-amber. It is deliberately NOT mirrored here:
       nothing ever read accentDisplay, so it was a second statement of a rule
       CSS already owns, and two statements of one rule drift apart. A band
       carries what a call site cannot derive — the tone of the ground. */
    expect(DARK_BAND.accentDisplay).toBeUndefined();
    expect(LIGHT_BAND.accentDisplay).toBeUndefined();
  });

  test('a call site can read accent from either band without knowing the tone', () => {
    [0, 1, 2, 3].forEach((i) => {
      expect(band(i).accent).toMatch(/^var\(--amber(-text)?\)$/);
    });
  });
});
