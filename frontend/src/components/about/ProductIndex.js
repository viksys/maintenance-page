import React from 'react';
import { Link } from 'react-router-dom';
import Reveal from '@/components/Reveal';

/*
  The product index.

  This replaced three equal-height cards. The cards were the largest objects on
  the page and the least informative per pixel: a border, eight units of padding
  and a repeated "EXPLORE →" on each, carrying one kicker, one name and one
  sentence between them.

  Set as an index instead — hairline rows on the same grid as everything else —
  the same information occupies a third of the height, aligns to the page
  rather than to itself, and reads as a register of systems rather than as
  three things being sold. The affordance is one arrow per row at the right
  edge, not three call-to-action labels.

  The whole row is the link. Row height is therefore also the touch target, and
  at py-8 it clears 44px comfortably.
*/
export default function ProductIndex({ items, dark = false }) {
  return (
    <div className={`doc-list ${dark ? 'doc-list-dark' : ''}`}>
      {items.map((p, i) => (
        <Reveal key={p.name} delay={Math.min(i * 0.06, 0.18)}>
          {/*
            grid-cols-7 at the outer gutter, not grid-cols-12.

            This row sits inside the seven-column content column. Redividing
            that span into twelve new columns would put every inner edge
            between two outer gridlines — a second, unrelated grid nested in
            the first. Seven columns at the same 48px gutter is algebraically
            the outer grid continued: with 7w + 6g = 7w + 6g, the inner column
            width equals the outer one and every edge lands on a real
            gridline. 2 / 4 / 1 sums to 7.
          */}
          <Link to={p.to} className="doc-row doc-link grid md:grid-cols-7 gap-2 md:gap-12 py-8">
            <div className="md:col-span-2">
              {/* .meta-kicker, not .meta-amber. The original reason — that amber
                  at 12px on paper is unreadable — is no longer the reason: since
                  3 September 2026 the light-band accent is --amber-text at
                  4.87:1 and a light-band kicker in the accent would pass. This
                  row is a document index, and an index whose every row opens
                  with an accent has no accent left; the kicker greys are what
                  keep the product NAME the first thing read. A visual decision
                  now, not a contrast one. */}
              <div className={`meta mb-2 ${dark ? 'meta-kicker-dark' : 'meta-kicker'}`}>{p.kicker}</div>
              <h3
                className="font-display font-semibold text-[21px] md:text-[22px] leading-tight doc-link-title m-0"
                style={{ color: dark ? 'var(--text-on-dark)' : 'var(--ink)' }}
              >
                {p.name}
              </h3>
            </div>

            <div className="md:col-span-4">
              <p className="copy-body measure m-0" style={{ color: dark ? 'var(--text-on-dark-2)' : 'var(--text-tertiary)' }}>
                {p.d}
              </p>
            </div>

            <div className="md:col-span-1 md:text-right">
              <span className="doc-arrow font-mono" aria-hidden="true">→</span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
