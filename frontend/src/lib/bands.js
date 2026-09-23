/*
  Band tones — the one place the page rhythm is decided.

  ---------------------------------------------------------------------------
  THE RULE
  ---------------------------------------------------------------------------
  Every page opens DARK and alternates: dark, light, dark, light. The hero is
  band 0, so the hero is dark. Two tones only — the #D8DEDB and #C7CFCB greys
  that used to sit between them are gone, folded into whichever tone their
  position calls for.

  ---------------------------------------------------------------------------
  WHY THIS IS A MODULE AND NOT A FIND-AND-REPLACE
  ---------------------------------------------------------------------------
  A band is not a background colour. It is a background AND the six or seven
  foreground values that have to move with it: heading, body, muted label,
  hairline, card surface, card border. Before this file those were written
  inline at every call site — 46 literal '#FFFFFF' backgrounds, 20 '#0D0F10',
  and body copy pinned to '#4A5148' next to headings pinned to '#0D0F10'.

  That is why flipping a band by editing its background alone produces an
  unreadable page: the background inverts and the text does not. Every value
  a band needs is therefore returned together, and a call site asks for a
  POSITION rather than a colour.

  ---------------------------------------------------------------------------
  USE
  ---------------------------------------------------------------------------
      import { band } from '@/lib/bands';

      const b = band(0);                  // dark
      <section style={{ background: b.bg, color: b.fg }}>
        <h2 style={{ color: b.heading }}>…</h2>
        <p style={{ color: b.body }}>…</p>
        <div style={{ borderColor: b.rule }} />
      </section>

  Pass the section's index down the page. Insert a section and the ones after
  it re-tone themselves, which is the whole point — the previous arrangement
  had to be re-checked by eye after every edit.

  ---------------------------------------------------------------------------
  CONTRAST
  ---------------------------------------------------------------------------
  Every pairing below clears WCAG AA against its own background. The values are
  not new: they are the ones already carried by index.css, chosen there against
  measured ratios that are recorded in that file's comments. Nothing here
  invents a colour, and nothing here should — add a token to index.css first.

  THE ACCENT IS THE ONE VALUE THAT IS NOT THE SAME IN BOTH BANDS, and this
  paragraph used to say the opposite. The brand accent #FF6A00 measures 6.52:1
  on --ink and 2.52:1 on --white. It was previously treated as one colour that
  simply failed on light bands — "a documented, accepted failure" — and the
  mitigation was to put less amber on light bands.

  That was reversed on 3 September 2026, by direction. index.css now carries a
  second value, --amber-text #B24700, which is the same hue at 4.87:1 on
  --white; the argument for it is recorded there and is not repeated here. What
  matters to a caller is that the substitution is BY BAND and this module is
  where the substitution happens:

      DARK_BAND.accent   var(--amber)        6.52:1 on --ink
      LIGHT_BAND.accent  var(--amber-text)   4.87:1 on --white

  So a call site that reads `band.accent` is correct on both and does not have
  to know either token exists. A call site that names --amber or --amber-text
  directly has taken responsibility for knowing its own tone, and if it is on a
  dark surface it needs the .on-dark marker from index.css.

  ---------------------------------------------------------------------------
  AND THE ACCENT SPLITS AGAIN BY SIZE
  ---------------------------------------------------------------------------
  `accent` above is sized for the 4.5:1 floor that SMALL text owes, because
  that is the harder of the two cases and a label is where the accent most
  often lands. On a headline it is the wrong value: #B24700 set at 60px across
  a whole line reads as a burnt brown-orange rather than as the brand colour,
  and a page that carries it next to a dark band shows a reader two different
  oranges. That was reported and fixed on 23 September 2026.

  THE SIZE SPLIT LIVES IN CSS, NOT HERE. --amber-display (#E05500) carries
  display-sized accents on a light band and .text-amber is its only consumer;
  index.css holds the full record beside the token, including the two reversals
  it went through in one day and why no SINGLE orange is possible.

  `accentDisplay` WAS a key on both bands and is deliberately not coming back.
  Nothing ever read it — every accent on the site arrives through .text-amber or
  .meta-amber, which resolve the tokens directly — so it was a second place to
  state the same rule, and two places drift. What this file exposes is the
  BAND split, which is the thing a call site cannot work out for itself:

      DARK_BAND.accent   var(--amber)        6.52:1 on --ink
      LIGHT_BAND.accent  var(--amber-text)   4.87:1 on --white

  The SIZE split is a property of the type, which a call site already knows.
*/

export const DARK_BAND = {
  tone: 'dark',
  bg: 'var(--ink)',
  fg: 'var(--text-on-dark)',
  /* Headings sit at full strength; body drops one step so the two are
     distinguishable without a size change. */
  heading: 'var(--text-on-dark)',
  body: 'var(--stone-400)',
  /* THE WORKING-INSTRUCTION ROLE. One step above `body`, for a sentence the
     reader is meant to act on rather than absorb — the enquiry note's
     instruction line, which has to be distinguishable from the description
     sitting directly above it. Introduced because the contact sentences were
     set in `body`, identical to the description, and read as randomly appended
     text; see components/EnquiryNote.js. The Careers coda is the precedent. */
  bodyStrong: 'var(--text-on-dark-2)',
  /* --text-on-dark-3 (4.90:1 on ink), not --stone-500 (3.04:1). `muted` sets
     12px labels, which is small text and owes 4.5:1 — measured in a browser on
     3 September 2026, not inferred. */
  muted: 'var(--text-on-dark-3)',
  /* Hairlines convey nothing and are exempt from the 3:1 boundary rule; the
     strong variant is for boundaries that carry state. */
  rule: 'var(--night-line)',
  ruleStrong: 'var(--night-line-strong)',
  surface: 'var(--night-2)',
  surfaceBorder: 'var(--night-line)',
  /* For an inset panel that has to read as a panel ON the band — a note box,
     a callout — rather than as part of it. This is NOT a third band tone; it
     never spans the page, and folding the greys away was about bands. */
  surfaceAlt: 'var(--night-3)',
  /* The brand accent, unsubstituted. 6.52:1 on --ink, so nothing is needed. */
  accent: 'var(--amber)',
};

export const LIGHT_BAND = {
  tone: 'light',
  bg: 'var(--white)',
  fg: 'var(--ink)',
  heading: 'var(--ink)',
  /* --text-tertiary is #4A5148, the literal this line carried before tokens
     existed for it. 7.21:1 on --white. */
  body: 'var(--text-tertiary)',
  /* The working-instruction role — see the note on DARK_BAND.bodyStrong. */
  bodyStrong: 'var(--text-body)',
  /* --text-secondary, 5.45:1 on --white and 4.55:1 on --stone-50. Both tokens
     now clear the floor on both light grounds — --stone-500 would also pass
     at 5.43:1 — so this is a consistency choice rather than a rescue. It was
     a rescue once: the pair measured 4.78:1 and 4.49:1, and the second was a
     miss by a hundredth, which is why it survived every review by eye.
     `muted` sets 12px labels: small text, 4.5:1 floor. */
  muted: 'var(--text-secondary)',
  rule: 'var(--stone-200)',
  ruleStrong: 'var(--stone-300)',
  surface: 'var(--white)',
  surfaceBorder: 'var(--stone-200)',
  surfaceAlt: 'var(--stone-50)',
  /* --amber-text, #B24700: the brand hue darkened to 4.87:1 on --white, which
     --amber itself cannot reach at 2.52:1. It is NOT a second brand colour and
     it is not to be used on a dark band, where it measures 3.38:1 — that is
     what DARK_BAND.accent above is for. It now carries DISPLAY type on this
     band as well; see the note at the top of this file. */
  accent: 'var(--amber-text)',
};

/*
  The band at a given position. Index 0 is the hero and is dark; odd indices
  are light. Anything non-numeric returns dark, so a missing prop fails toward
  the page's opening tone rather than toward an accidental white screen.
*/
export function band(index) {
  return Number(index) % 2 === 1 ? LIGHT_BAND : DARK_BAND;
}
