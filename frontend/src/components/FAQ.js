import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import { faqAnchor } from '@/lib/slug';

/*
  FAQ — an accessible disclosure list that doubles as an extraction surface.

  Design notes:
    - Uses the existing tokens only (container-x, section-y, meta, font-display,
      hairlines). No new visual language.
    - Answers are always present in the DOM, not mounted on expand. Collapsed
      content is hidden with [hidden], which crawlers and assistive technology
      still read, so the FAQ is indexable without the user having to click.
    - Emits FAQPage JSON-LD matching the visible questions and answers exactly.
      Schema that does not match visible content is a structured-data violation.
*/

export default function FAQ({
  items = [],
  number,
  label = 'FAQ',
  heading = 'Common questions.',
  dark = false,
  background,
  emitSchema = true,
  id,
  /*
    Opt-in layout variant, default off, so no existing caller changes.

    'document' puts the FAQ on the editorial rhythm used by the .doc-* layer:
    the taller section padding, the fluid label margin, and the rail heading
    size. The last of those matters most — this component sets its heading in
    a four-column rail, and .fs-h2 tops out at 46px, which in a ~430px column
    wraps to five lines. .doc-h2 is the same idea at the size the column holds.

    Only the Company page passes it today. It is a variant rather than a
    global change because the FAQ appears on a dozen pages that are
    compositions rather than documents, and their rhythm is not this one.
  */
  variant = 'default',
}) {
  const doc = variant === 'document';
  const [open, setOpen] = useState(0);
  const [flash, setFlash] = useState(null);
  const { hash } = useLocation();
  const rootRef = useRef(null);

  /*
    Deep-link handling. A search result links to a specific question, so on
    arrival we expand that question, bring it below the fixed header, and flash
    it briefly. Without this the result would land on a collapsed row and the
    answer would appear to be missing.
  */
  useEffect(() => {
    if (!hash || !items.length) return;
    const target = hash.replace('#', '');
    const idx = items.findIndex((it) => faqAnchor(it.q) === target);
    if (idx === -1) return;

    setOpen(idx);
    setFlash(idx);

    /* Wait a frame so the answer is expanded before we measure position. */
    const raf = requestAnimationFrame(() => {
      rootRef.current?.querySelector(`#${CSS.escape(target)}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const clear = setTimeout(() => setFlash(null), 1800);
    return () => { cancelAnimationFrame(raf); clearTimeout(clear); };
  }, [hash, items]);

  const bg = background || (dark ? 'var(--ink)' : 'var(--text-on-dark)');
  const line = dark ? 'var(--night-line)' : '#C7CFCB';
  const bodyColor = dark ? '#A3ADAA' : '#4A5148';
  const headColor = dark ? 'var(--text-on-dark)' : 'var(--ink)';

  if (!items.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };

  return (
    <section ref={rootRef} id={id} style={{ background: bg, color: headColor }}>
      <div className={`container-x ${doc ? 'doc-section' : 'section-y'}`}>
        <Reveal>
          {/*
            'document' swaps SectionLabel's number-and-rule for the `// LABEL`
            eyebrow the document pages use, and moves the 4 / 8 split to 5 / 7
            so the FAQ sits on the same grid as the sections above it. Default
            behaviour is untouched.
          */}
          {doc ? (
            /* mb-8 matches about/Section.js exactly. Any other value and the
               FAQ's heading sits on a different baseline from the eight
               headings above it. */
            <div className="meta mb-8" style={{ color: dark ? 'var(--stone-300)' : 'var(--stone-500)' }}>
              {'// '}{label}
            </div>
          ) : (
            <SectionLabel number={number} label={label} dark={dark} className="mb-10" />
          )}
          {/* gap-12 (48px), not gap-11 (44px). 44 was the only value in this
              grid that was not a multiple of eight, which put every FAQ on the
              site four pixels off the track of the section above it. */}
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className={doc ? 'md:col-span-5' : 'md:col-span-4'}>
              {/* The document variant takes .h-statement, the same treatment
                  about/Section.js gives every other heading on the page. It
                  previously used .doc-h2 — sentence case at 25-36px against
                  uppercase at 30-54px — which made the FAQ read as a heading
                  borrowed from a different site. */}
              {doc ? (
                <h2 className={`h-statement ${dark ? 'h-statement-dark' : ''}`}>{heading}</h2>
              ) : (
                <h2 className={`h-display fs-h2 ${dark ? 'h-display-dark' : ''}`}>{heading}</h2>
              )}
            </div>

            <dl className={doc ? 'md:col-span-7' : 'md:col-span-8'}>
              {items.map((it, i) => {
                const isOpen = open === i;
                const anchor = faqAnchor(it.q);
                return (
                  <div
                    key={it.q}
                    id={anchor}
                    /* Header clearance is not set here. index.css gives every
                       [id] a scroll-margin-top derived from the bar's own
                       tokens; the inline offset this comment used to claim was
                       never in the style object below. */
                    style={{
                      borderTop: i === 0 ? `1px solid ${line}` : 'none',
                      borderBottom: `1px solid ${line}`,
                      background: flash === i ? (dark ? 'rgba(255,165,0,0.10)' : 'rgba(255,165,0,0.09)') : 'transparent',
                      transition: 'background .6s ease',
                    }}
                  >
                    <dt>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? -1 : i)}
                        aria-expanded={isOpen}
                        aria-controls={`faq-a-${i}`}
                        id={`faq-q-${i}`}
                        className="w-full text-left flex items-start justify-between gap-6 py-6 transition-colors"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: headColor }}
                      >
                        <span className="font-display font-semibold text-[17px] md:text-[18px]">{it.q}</span>
                        <span
                          className="font-mono flex-shrink-0 transition-transform"
                          style={{
                            /* The + carries the open/closed state, so it is
                               held to the 3:1 non-text floor rather than left
                               decorative. Closed on paper was #A3ADAA, 2.30:1,
                               which failed it; --stone-300 is 3.03:1, the
                               boundary grey this is a sibling of. Closed on ink
                               was #6B7060, which passed at 3.67:1 but as a
                               literal followed nothing — --text-on-dark-3
                               (4.90:1) is the named value for that role. */
                            color: isOpen
                              ? (dark ? 'var(--amber)' : 'var(--amber-text)')
                              : dark ? 'var(--text-on-dark-3)' : 'var(--stone-300)',
                            fontSize: 16,
                            lineHeight: '1.4',
                            transform: isOpen ? 'rotate(45deg)' : 'none',
                          }}
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </button>
                    </dt>
                    {/* Rendered always; [hidden] keeps it readable to crawlers and
                        screen readers while collapsed for sighted users.

                        No role="region". The ARIA authoring practices offer it
                        for accordions, but it is a landmark: on /knowledge this
                        component runs a dozen times and the landmark list —
                        which exists so a reader can skip past the content to
                        the parts of the page — fills up with the content. The
                        button's aria-expanded/aria-controls pair already names
                        and states the relationship, and aria-labelledby keeps
                        the answer tied to its question without one. */}
                    <dd
                      id={`faq-a-${i}`}
                      aria-labelledby={`faq-q-${i}`}
                      hidden={!isOpen}
                      style={{ margin: 0 }}
                    >
                      {/* .copy-body, not text-[14px]. --measure is 512px, which
                          at 14px sets 76 characters — just outside the 60-75
                          band the measure exists to hold. copy-body's 14.5-15.5
                          brings it to 69-74. pb-8 (32px), not pb-7 (28px). */}
                      <p className="copy-body pb-8 pr-10 measure" style={{ color: bodyColor }}>
                        {it.a}
                      </p>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </Reveal>
      </div>

      {emitSchema && (
        /*
          JSON.stringify does not escape `</script>`. Inside an HTML <script>
          element the parser is looking for that byte sequence and nothing else —
          a FAQ answer containing it would close the tag early and drop the rest
          of the JSON into the document as markup. Every answer here comes from
          data/faqs.js today, but the escaping is what makes that safe rather
          than the provenance, and provenance is the thing most likely to change.
          Escaping `<` to its unicode form is valid JSON and inert to the parser.
        */
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
          }}
        />
      )}
    </section>
  );
}
