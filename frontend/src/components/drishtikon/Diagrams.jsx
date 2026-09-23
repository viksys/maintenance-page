import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

/*
  The two diagrams on the DRISHTIKON page.

  ---------------------------------------------------------------------------
  WHY THEY ARE DIAGRAMS AND NOT PARAGRAPHS
  ---------------------------------------------------------------------------
  Each one replaces an explanation. The architecture is a path, the command
  model is a sequence, and modularity is a shape — all three are faster to see
  than to read, and the page's whole premise is that a reader has under a
  minute. If any of these ever needs a paragraph beside it to be understood,
  the diagram has failed and the paragraph is not the fix.

  ---------------------------------------------------------------------------
  MOTION
  ---------------------------------------------------------------------------
  Scroll-linked, never autoplaying, and never looping. A diagram that animates
  on a timer competes with the reader; one that animates as they arrive
  confirms they are in the right place and then stops. Nothing moves more than
  a few pixels and nothing bounces.

  Every component here returns its finished state under prefers-reduced-motion
  — the full diagram, drawn, with no transition. Not a faster animation: the
  end frame. These carry meaning, so they must be complete even when they are
  not allowed to move.

  ---------------------------------------------------------------------------
  COLOUR
  ---------------------------------------------------------------------------
  Each takes a `tone` object from lib/bands.js rather than naming a colour.
  That is what lets the same diagram sit on a dark band on this page and a
  light one elsewhere without a second copy.
*/

const EASE = [0.16, 1, 0.3, 1];

/*
  The accent, resolved for the band it sits on.

  THE REASON THIS FUNCTION WAS WRITTEN NO LONGER HOLDS. It was written when the
  site had one amber, #FF6A00, which measures 2.52:1 on --white; the rule then
  was to keep amber off light bands entirely rather than introduce a second
  value, so the light branch dropped the accent and took the heading colour.

  index.css reversed that on 3 September 2026. There are now two values and the
  band decides between them: LIGHT_BAND.accent is --amber-text #B24700 at
  4.87:1 on --white, DARK_BAND.accent is --amber at 6.52:1 on --ink. `tone
  .accent` is therefore readable on either band, and this function is no longer
  a contrast measure.

  It is kept as a VISUAL decision, which is what it now is and all it now is: on
  a light band these markers read as structure — the joints of a schematic —
  rather than as an accent picking out a step, and at 19.21:1 they hold the
  drawing together in a way a mid-tone does not. If that reading is ever
  revisited, `return tone.accent` is the whole change and it is safe on both
  bands. Do not reintroduce the old justification.
*/
function markOn(tone) {
  return tone.tone === 'dark' ? tone.accent : tone.heading;
}


/* ═══════════════════════════════════════════════════════════════════════
   ARCHITECTURE — the vertical path from platform to operator.

   The strongest visual moment on the page, so it gets the most room and the
   least ornament: five stops on one line, a rule that draws itself downward
   as the section arrives, and an amber marker at each stop.

   The line is drawn with scaleY on a 1px element rather than an SVG stroke
   dash. It is one composited property, it needs no path length measurement,
   and it stays crisp at any height — a stroke-dasharray animation on a line
   this long shimmers on fractional pixels.
   ═══════════════════════════════════════════════════════════════════════ */
export function ArchitectureFlow({ stages, tone }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: '-15% 0px -15% 0px' });
  const on = reduce || inView;
  const mark = markOn(tone);

  return (
    <div ref={ref} className="relative" style={{ paddingLeft: 2 }}>
      {/* The spine. Sits behind the stops and grows from the first to the
          last as the section comes into view. */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          left: 7,
          top: 10,
          bottom: 10,
          width: 1,
          background: tone.ruleStrong,
          transformOrigin: 'top',
          transform: on ? 'scaleY(1)' : 'scaleY(0)',
          transition: reduce ? 'none' : `transform 1.1s ${EASE.join(',')}`,
        }}
      />

      <ol className="list-none m-0 p-0">
        {stages.map((s, i) => (
          <li
            key={s.t}
            className="relative flex items-baseline gap-6"
            style={{
              paddingLeft: 34,
              paddingBottom: i === stages.length - 1 ? 0 : 'clamp(28px, 3.4vw, 52px)',
              opacity: on ? 1 : 0,
              transform: on ? 'none' : 'translateY(10px)',
              transition: reduce
                ? 'none'
                : `opacity .6s ${EASE.join(',')} ${0.15 + i * 0.13}s, transform .6s ${EASE.join(',')} ${0.15 + i * 0.13}s`,
            }}
          >
            {/* The stop. A filled square for the ends of the path and a hollow
                one between, so the eye reads a start and a destination rather
                than five equal beads. */}
            <span
              aria-hidden="true"
              className="absolute"
              style={{
                left: 0,
                top: 7,
                width: 15,
                height: 15,
                border: `1px solid ${mark}`,
                background: i === 0 || i === stages.length - 1 ? mark : tone.bg,
              }}
            />
            <span
              className="font-display font-semibold"
              style={{ color: tone.heading, fontSize: 'clamp(19px, 2.4vw, 32px)', lineHeight: 1.15 }}
            >
              {s.t}
            </span>
            <span className="meta" style={{ color: tone.body }}>{s.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   COMMAND — a packet crossing four gates.

   The animation is the argument: the packet does not jump from intent to
   platform, it stops at each gate. Speed is deliberately even and unhurried;
   a fast packet would suggest the checks are a formality.
   ═══════════════════════════════════════════════════════════════════════ */
export function CommandPath({ steps, tone }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: '-20% 0px -20% 0px' });
  const on = reduce || inView;
  const mark = markOn(tone);

  return (
    <div ref={ref} className="w-full">
      <div className="flex flex-wrap items-stretch gap-y-4">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <React.Fragment key={s}>
              <div
                className="relative flex-1"
                style={{
                  minWidth: 128,
                  padding: 'clamp(16px, 1.7vw, 24px) clamp(14px, 1.4vw, 22px)',
                  border: `1px solid ${last ? mark : tone.surfaceBorder}`,
                  background: tone.surface,
                  opacity: on ? 1 : 0,
                  transform: on ? 'none' : 'translateY(8px)',
                  transition: reduce
                    ? 'none'
                    : `opacity .5s ${EASE.join(',')} ${i * 0.16}s, transform .5s ${EASE.join(',')} ${i * 0.16}s`,
                }}
              >
                <div className="meta mb-2" style={{ color: tone.body }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div
                  className="font-display font-semibold"
                  style={{ color: last ? mark : tone.heading, fontSize: 'clamp(14px, 1.3vw, 18px)' }}
                >
                  {s}
                </div>

                {/* The packet: a short amber bar that travels the width of the
                    gate once, as that gate arrives. It is the only thing on
                    the page that moves by itself, and it moves once. */}
                {!reduce && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute left-0 bottom-0"
                    style={{ height: 2, width: '28%', background: mark }}
                    initial={{ x: '-100%', opacity: 0 }}
                    animate={on ? { x: ['-100%', '360%'], opacity: [0, 1, 1, 0] } : {}}
                    transition={{ duration: 1.1, delay: 0.2 + i * 0.16, ease: 'linear' }}
                  />
                )}
              </div>

              {!last && (
                <span
                  aria-hidden="true"
                  className="self-center px-2 sm:px-3"
                  style={{
                    color: mark,
                    opacity: on ? 1 : 0,
                    transition: reduce ? 'none' : `opacity .4s ease ${0.1 + i * 0.16}s`,
                  }}
                >
                  &rarr;
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

