import React from 'react';
import Reveal from '@/components/Reveal';

/*
  The document section shell.

  One grid, used by every section on the Company page:

    cols 1-5   the statement column. The `// SECTION` eyebrow and the heading,
               set as short uppercase display type stacked into a block.
    cols 6-12  the reading column. Everything else, capped at --measure.

  5 / 7 rather than the 4 / 8 this file previously used, because the supplied
  design gives the headline more room than a quarter of the page and the
  stacked-capitals treatment needs it — at four columns the lines break to one
  word each and the block stops reading as a sentence.

  The consequence is that body copy on every section begins at the same
  x-position from the hero to the footer. Nothing on this page is positioned
  relative to itself; it is positioned relative to the page.

  The eyebrow is `// LABEL` rather than SectionLabel's number-plus-rule. That
  is the design's own marker, and it is quieter: a rule running out to the
  container edge on eight consecutive sections was drawing eight horizontal
  lines down a page whose sections are already separated by 64-112px of space.
  Numbering is dropped with it — it was counting sections for the reader, which
  is a table of contents' job, not a heading's.
*/
export default function Section({
  label,
  heading,
  children,
  dark = false,
  tight = false,
  id,
}) {
  return (
    <section
      id={id}
      style={{
        background: dark ? 'var(--ink)' : 'var(--white)',
        color: dark ? 'var(--text-on-dark)' : 'var(--ink)',
      }}
    >
      <div className={`container-x ${tight ? 'doc-section-tight' : 'doc-section'}`}>
        <div className="grid md:grid-cols-12 gap-8 md:gap-12">
          <div className="md:col-span-5">
            <Reveal>
              <div className="meta mb-8" style={{ color: dark ? 'var(--stone-300)' : 'var(--stone-500)' }}>
                {'// '}{label}
              </div>
            </Reveal>
            {heading && (
              <Reveal delay={0.05}>
                <h2 className={`h-statement ${dark ? 'h-statement-dark' : ''}`}>{heading}</h2>
              </Reveal>
            )}
          </div>

          <div className="md:col-span-7">{children}</div>
        </div>
      </div>
    </section>
  );
}
