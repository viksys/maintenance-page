import React, { useEffect, useInsertionEffect, useRef, useState } from 'react';
import { ANNOUNCEMENT, isLive } from '@/data/announcement';

/*
  The announcement band: a slim ink strip that scrolls one sentence.

  It is built the way LogoCarousel is built, and the reasons are the same ones
  written out in that file — a CSS transform animation with no JS ticking, a
  track of two identical halves so the wrap is invisible, a module-scoped sheet
  installed once from useInsertionEffect, an IntersectionObserver so nothing
  animates or holds a compositor layer off-screen, and a real pause button
  because WCAG 2.2.2 requires one for motion that starts by itself and runs
  longer than five seconds. Read the notes there for the cascade ordering and
  the aria-hidden-on-the-duplicate rule; they are not repeated here.

  WHAT IS DIFFERENT, AND WHY
  ---------------------------------------------------------------------------
  THE TRACK CARRIES TEXT, NOT IMAGES. So there are no intrinsic dimensions to
  reserve and no decode to wait for — but there IS a font swap, and a webfont
  landing mid-loop changes the track's width while the animation is translating
  over it. That is survivable in a way an image decode was not: the strip is one
  repeated sentence, so a width change shifts the wrap point rather than
  revealing a gap, and the message stays legible throughout. Nothing here
  depends on the track measuring the same before and after.

  IT IS A <section>, NOT A <div>. Header.js decides whether to draw its light or
  dark bar by probing the luminance of the `section, footer` under it, so a band
  the probe cannot see is a band the bar guesses about. This one is ink, between
  a hero that is ink and a mission band that is ink, and a <div> here would have
  left a gap in that run where the bar had nothing to measure.

  NOTHING IN THE TRACK IS FOCUSABLE, DELIBERATELY. A "meet us there" link is the
  obvious addition and it cannot go here: the second half of the track is
  aria-hidden, and aria-hidden over a focusable element is the one way this
  pattern breaks. A link belongs beside the strip, outside the duplicated
  halves, if one is ever wanted.
*/

const SHEET = `
.announce {
  background: var(--ink);
  /* Hairline above only. The band sits between two dark sections; a rule on the
     underside would draw a second line a few pixels from the mission band's own
     top edge and read as a seam rather than a separation. */
  border-top: 1px solid var(--night-line);
  overflow: hidden;
}
.announce__row {
  display: flex;
  align-items: center;
  gap: 26px;
  /* 44px of band. The pause control is a 44px target (2.5.8) and it is the
     tallest thing in the row, so the row is sized to it rather than to the
     text — anything shorter would have the control overhanging the hairline. */
  min-height: 44px;
  padding-top: 6px;
  padding-bottom: 6px;
}
.announce__flag {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: 0 0 auto;
  white-space: nowrap;
  /* The label is a fixed point the eye can return to, so it must not scroll
     with the message or wrap under it. */
}
.announce__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--amber);
  flex: 0 0 auto;
}
/* min-width: 0 is load bearing. A flex item's default min-width is auto, which
   on a max-content track means the viewport refuses to shrink below the full
   width of the sentence — the row then overflowed the page on every phone
   instead of clipping, and the band scrolled sideways. */
.announce__viewport {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 92%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 6%, #000 92%, transparent 100%);
}
.announce__track {
  display: flex;
  align-items: center;
  width: max-content;
  animation-name: announce-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-play-state: paused;
}
.announce.is-running .announce__track {
  animation-play-state: running;
  will-change: transform;
  transform: translate3d(0, 0, 0);
}
.announce.is-running:hover .announce__track {
  animation-play-state: paused;
}
/* MUST STAY AFTER THE is-running RULE — equal specificity, later in the sheet,
   so a reader who pressed Pause stays paused when the observer scrolls the band
   back into view and re-asserts is-running. */
.announce.is-paused .announce__track {
  animation-play-state: paused;
  will-change: auto;
}
.announce__item {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 12.5px;
  letter-spacing: 0.04em;
  line-height: 1.4;
  color: var(--text-on-dark);
  white-space: nowrap;
}
/* The separator between repeats, in the accent. It is the only amber in the
   band apart from the dot: 6.52:1 on ink, and it carries no meaning a reader
   would miss if it were not announced. */
.announce__sep {
  color: var(--amber);
  padding: 0 22px;
}
/* 14px of icon in a 44px target, as .logo-carousel__toggle and .vk-panel-close
   do. --text-on-dark-3 is 4.90:1 on ink and clears the 3:1 a control's own
   boundary owes; --stone-500, the light-band value that component uses, is
   3.03:1 here and would not. */
.announce__toggle {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-right: -12px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--text-on-dark-3);
  cursor: pointer;
  transition: color 0.18s ease;
}
.announce__toggle:hover,
.announce__toggle:focus-visible {
  color: var(--text-on-dark);
}
@keyframes announce-scroll {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@media (max-width: 640px) {
  /* The eyebrow goes, not the message. On a 360px screen the label, the
     sentence and the control cannot share a line, and of the three the label is
     the one carrying no information — "On the road" above a sentence that
     already names the summit is decoration. */
  .announce__flag {
    display: none;
  }
  .announce__item {
    font-size: 11.5px;
  }
  .announce__sep {
    padding: 0 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  /* Later in the sheet and equal in specificity to the is-running rule, so it
     wins whatever the observer has decided. The strip then reads as a static
     line of text, which is why the message is a whole sentence rather than a
     fragment that only makes sense in motion. */
  .announce.is-running .announce__track,
  .announce .announce__track {
    animation: none;
    will-change: auto;
    transform: none;
  }
}
`;

let sheetInstalled = false;

function installSheet() {
  if (sheetInstalled || typeof document === 'undefined') return;
  sheetInstalled = true;
  const el = document.createElement('style');
  el.setAttribute('data-announce', '');
  el.appendChild(document.createTextNode(SHEET));
  document.head.appendChild(el);
}

function ToggleIcon({ paused }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false" fill="currentColor">
      {paused ? (
        <path d="M3.5 1.5 L12 7 L3.5 12.5 Z" />
      ) : (
        <>
          <rect x="3" y="2" width="3" height="10" />
          <rect x="8" y="2" width="3" height="10" />
        </>
      )}
    </svg>
  );
}

/*
  COPIES PER HALF.

  The keyframes translate the track by exactly -50% of its own width, so the two
  halves must be identical and each half has to be wide enough that the viewport
  is never short of text. One copy per half leaves a 1440px desktop looking at a
  600px sentence and a great deal of ink; three fills it at every width the site
  supports and costs two more spans.
*/
const PER_HALF = 3;

export default function AnnouncementTicker({ duration = 34, className = '' }) {
  const rootRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [paused, setPaused] = useState(false);

  useInsertionEffect(installSheet, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setIsRunning(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /*
    The expiry check runs at RENDER, not in an effect, so an expired
    announcement never reaches the DOM at all — no band that paints and then
    vanishes, and nothing for the header's luminance probe to catch mid-frame.

    It is evaluated per render rather than once at module load: a tab left open
    across the closing date drops the band at its next route change instead of
    carrying it until a reload.
  */
  if (!isLive()) return null;

  /*
    ONE SENTENCE, READ ONCE.

    Every copy after the first is aria-hidden with its separator, so the strip
    announces the message a single time however many times it is drawn. Without
    that, a screen reader read the summit announcement six times in a row.
  */
  const copies = Array.from({ length: PER_HALF * 2 }, (_, i) => i);

  return (
    <section
      ref={rootRef}
      aria-label="Announcement"
      /* .on-dark remaps --text-secondary to --text-on-dark-2 (8.13:1 on ink) for
         the .meta label below. Without it the label resolves the light-band
         value and measures 3.02:1 — see the note on .meta in index.css. */
      className={`announce on-dark ${isRunning ? 'is-running' : ''} ${paused ? 'is-paused' : ''} ${className}`}
    >
      <div className="container-x announce__row">
        <span className="announce__flag meta">
          <span className="announce__dot" aria-hidden="true" />
          {ANNOUNCEMENT.label}
        </span>

        <div className="announce__viewport">
          <div className="announce__track" style={{ animationDuration: `${duration}s` }}>
            {copies.map((i) => (
              <span className="announce__item" key={i} aria-hidden={i === 0 ? undefined : 'true'}>
                {ANNOUNCEMENT.text}
                <span className="announce__sep" aria-hidden="true">
                  ◆
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Names the NEXT action rather than carrying aria-pressed, for the
            reason set out at length in LogoCarousel: a button named "Resume"
            with aria-pressed="true" announces the opposite of what is true. */}
        <button
          type="button"
          className="announce__toggle"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Resume the scrolling announcement' : 'Pause the scrolling announcement'}
        >
          <ToggleIcon paused={paused} />
        </button>
      </div>
    </section>
  );
}
