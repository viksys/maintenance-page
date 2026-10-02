import React from 'react';
import { SOCIAL } from '@/data/social';

/*
  The social row, rendered once and used by the footer, the header's contact
  panel and the contact page.

  It takes its colour from the surface rather than naming one: `color` is the
  resting tone and `hoverColor` the accent, because the three callers sit on
  three different backgrounds — dark in the header and footer, paper on the
  contact page — and a component that hardcoded either would be wrong on two of
  them.

  EVERY LINK IS ICON-ONLY, SO EVERY LINK CARRIES ITS OWN NAME. aria-label is not
  decoration here: without it a screen reader announces "link" twice and the
  reader has no way to tell which network is which. The <title> inside the svg
  would not do it — the glyph is aria-hidden, as a mark that repeats the label
  should be.

  rel="noopener noreferrer" on every external target. noopener alone was the
  first choice — these are our own profiles, and the referrer is what lets the
  platform attribute the visit — but this project lints target="_blank" without
  noreferrer as an error and builds with --max-warnings=0. Every other external
  link on the site carries both, and one component quietly keeping its own rule
  is worth less than the consistency. Attribution is recoverable with a utm_
  parameter if it is ever wanted.
*/
export default function SocialLinks({
  color = 'var(--text-tertiary)',
  hoverColor = 'var(--amber)',
  size = 18,
  gap = 16,
  className = '',
}) {
  return (
    <ul
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap, listStyle: 'none', margin: 0, padding: 0 }}
    >
      {SOCIAL.map(({ key, label, href, Icon }) => (
        <li key={key} style={{ display: 'flex' }}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            style={{
              color,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              /* 44x44 is the pointer-target floor (WCAG 2.5.8). The mark is 18px;
                 without the padding these would be 18px targets, which is a miss
                 on a phone and the commonest way an icon row fails on touch. */
              width: 44,
              height: 44,
              marginLeft: -12,
              marginRight: -12,
              transition: 'color .2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = hoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = color;
            }}
            onFocus={(e) => {
              e.currentTarget.style.color = hoverColor;
            }}
            onBlur={(e) => {
              e.currentTarget.style.color = color;
            }}
          >
            <Icon width={size} height={size} aria-hidden="true" focusable="false" />
          </a>
        </li>
      ))}
    </ul>
  );
}
