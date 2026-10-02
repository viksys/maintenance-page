import React from 'react';

const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
  stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round',
};

export const IconAir = (p) => (
  <svg {...base} {...p}><path d="M2 12h20"/><path d="M12 2c1.5 3 2.5 6 2.5 10s-1 7-2.5 10c-1.5-3-2.5-6-2.5-10s1-7 2.5-10z"/><path d="M4 15l3-3-3-3"/><path d="M20 15l-3-3 3-3"/></svg>
);
export const IconGround = (p) => (
  <svg {...base} {...p}><rect x="3" y="9" width="18" height="7" rx="1"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/><path d="M3 12h18"/></svg>
);
export const IconMaritime = (p) => (
  <svg {...base} {...p}><path d="M3 17c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/><path d="M5 14l7-8 7 8"/><path d="M12 6v8"/></svg>
);
export const IconISR = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/></svg>
);
export const IconCounter = (p) => (
  <svg {...base} {...p}><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/><circle cx="12" cy="12" r="3"/></svg>
);
export const IconAutonomy = (p) => (
  <svg {...base} {...p}><rect x="7" y="5" width="10" height="8" rx="2"/><path d="M9 9h.01M15 9h.01"/><path d="M12 13v3M8 20h8"/></svg>
);
export const IconComms = (p) => (
  <svg {...base} {...p}><path d="M4 8a10 10 0 0 1 16 0"/><path d="M7 11a6 6 0 0 1 10 0"/><circle cx="12" cy="15" r="1.5"/><path d="M12 17v4"/></svg>
);
export const IconShield = (p) => (
  <svg {...base} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>
);
export const IconLayers = (p) => (
  <svg {...base} {...p}><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>
);
export const IconCPU = (p) => (
  <svg {...base} {...p}><rect x="5" y="5" width="14" height="14" rx="1"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>
);
export const IconGlobe = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>
);
export const IconLock = (p) => (
  <svg {...base} {...p}><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
);

export const IconSun = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
);
export const IconArrowRight = (p) => (
  <svg {...base} {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
);
export const IconPlus = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14"/></svg>
);
export const IconPlay = (p) => (
  <svg {...base} {...p}><path d="M7 4l12 8-12 8z" fill="currentColor"/></svg>
);
export const IconCheck = (p) => (
  <svg {...base} {...p}><path d="M4 12l5 5L20 6"/></svg>
);
/*
  SOCIAL MARKS.

  IconLinkedIn, IconX, IconYouTube and IconGitHub were deleted on 23 September
  2026 with the social row and the header's SOCIAL column, on the grounds that
  nothing linked to a network. Two of them are back on 2 October 2026 because
  two links now exist; YouTube and GitHub are not, because they still do not.

  These two do NOT use `base`. Every other glyph here is a 1.4px stroked
  outline, which is this site's icon language — but a company's mark is not ours
  to restyle. Both are the official solid shapes, filled with currentColor and
  explicitly unstroked, so the surrounding colour still drives them while the
  geometry stays exactly as published.
*/
const mark = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'none' };

export const IconX = (p) => (
  <svg {...mark} {...p}><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
);

export const IconLinkedIn = (p) => (
  <svg {...mark} {...p}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
);
