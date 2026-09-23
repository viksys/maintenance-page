import React from 'react';

/*
  Company registry facts, set as a description list.

  Three corrections to the block this replaces. It was a <div> grid, which
  described a key/value relationship visually and to nobody else; it is a <dl>
  now. The keys were painted #A3ADAA — 2.03:1 on paper, under the 4.5:1 floor
  for text this size — and now take a token that clears it on each surface.
  And the grid is 7 columns at the outer gutter rather than 12, so the value
  column starts on a real gridline; see the note in ProductIndex.js.

  Values are set in the sans rather than the mono. A CIN is a reference
  number, not a readout, and mono at this size reads as decoration.
*/
export default function SpecList({ rows, dark = false }) {
  return (
    <dl className={`doc-list m-0 ${dark ? 'doc-list-dark' : ''}`}>
      {rows.map(([k, v]) => (
        <div key={k} className="doc-row grid md:grid-cols-7 gap-2 md:gap-12 py-6">
          <dt
            className="md:col-span-2 meta"
            style={{ color: dark ? 'var(--stone-300)' : 'var(--stone-500)' }}
          >
            {k}
          </dt>
          <dd
            className="md:col-span-5 m-0 text-[15px] measure"
            style={{ color: dark ? 'var(--text-on-dark)' : 'var(--ink)' }}
          >
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
