import React from 'react';
import { SITE } from '@/data/seo';

/*
  THE ENQUIRY NOTE — the one way this site asks a reader to write to us.

  ─────────────────────────────────────────────────────────────────────────────
  WHY THIS IS A COMPONENT AND NOT A CONVENTION
  ─────────────────────────────────────────────────────────────────────────────

  Every contact form and every contact button was removed by direction, leaving
  one address as the whole mechanism. The address was then written into several
  surfaces by hand, and every one of them decayed differently:

    - Company welded "Write to us at …" onto the end of a descriptive sentence,
      same type role, same colour, no separation — an action disguised as prose.
    - CollectionPage stacked two <p> elements with IDENTICAL class and colour,
      so the instruction was indistinguishable from the description above it.
    - Drishtikon left an empty flex container with a margin, then a sentence.

  Each was a layout built to hold a button, with a sentence dropped where the
  button used to be. A shared convention would have decayed the same way; a
  component cannot.

  ─────────────────────────────────────────────────────────────────────────────
  THE PATTERN
  ─────────────────────────────────────────────────────────────────────────────

    LABEL          .meta, uppercase, at heading strength — names the action or
                   the case, so the block declares its job before it is read.
                   Segregation by tracking and case, not by size.
    instruction    copy-body at `bodyStrong`, one step above the surrounding
                   description. This is the difference that makes an action
                   read as an action.
    the address    inline in the sentence, in the band's accent, underlined.

  UNDERLINE IS NOT OPTIONAL. With every button gone, it is the only interactive
  affordance left on the site; colour alone does not carry a link (WCAG 1.4.1).

  NEVER `text-justified`. Justification on a two-line instruction opens rivers
  and was part of why the Company paragraph read as pasted in.

  ─────────────────────────────────────────────────────────────────────────────
  WHICH FORM TO USE
  ─────────────────────────────────────────────────────────────────────────────

  This is the INLINE form: the note sits inside a band that is about something
  else, so it carries its own `.meta` label. Used on Careers, Company (twice)
  and Drishtikon.

  Where the WHOLE BAND is the enquiry — the closing band of CollectionPage —
  the band's own SectionLabel eyebrow is already that label, so it composes the
  pattern inline rather than calling this. Adding a second label inside an
  eyebrowed band is the noise this component exists to prevent.

  Exactly one mono label per note, and it is whichever label is nearest.
*/

export default function EnquiryNote({ band, label, align = 'left', children }) {
  const centred = align === 'center';

  return (
    <div className={centred ? 'text-center' : undefined}>
      <div className="meta mb-3" style={{ color: band.heading }}>{label}</div>
      <p
        className="copy-body m-0"
        style={{
          color: band.bodyStrong,
          /* A centred note is a column in its own right and takes the narrower
             centred measure the surrounding centred copy uses; a left-aligned
             one inherits the page's reading measure. */
          maxWidth: centred ? '52ch' : 'var(--measure)',
          marginLeft: centred ? 'auto' : undefined,
          marginRight: centred ? 'auto' : undefined,
        }}
      >
        {children}
      </p>
    </div>
  );
}

/*
  The address, as a link, in the band's accent.

  Exported so a call site composes its own sentence around it — the instruction
  differs by surface ("to arrange one", "to request the full product guide") and
  a single fixed sentence would put the wrong words on three of the four. What
  does not differ is the address, the colour rule and the underline, which is
  what this holds.

  SITE.email is the one source for the address; data/seo.js already feeds it to
  the Organization schema. Never write it out by hand.
*/
export function EnquiryAddress({ band }) {
  return (
    <a
      href={`mailto:${SITE.email}`}
      style={{ color: band.accent, textDecoration: 'underline' }}
    >
      {SITE.email}
    </a>
  );
}
