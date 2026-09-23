import React from 'react';
import { Link } from 'react-router-dom';
import { IconArrowRight as ArrowRight } from '@/components/Icon';
import { cn } from '@/lib/utils';

/*
  FlowButton.

  The interaction is the component: an arrow parked off the left edge slides in
  as the one on the right slides out, the label shifts with them, and a small
  disc scales up from the centre to become the fill. Four things moving on one
  hover, all on transform and opacity, so none of it touches layout.

  PORTED FROM THE SUPPLIED TSX
    - this codebase is JavaScript on CRA + craco, so the prop types are gone
      and the file is .jsx
    - "use client" is dropped; it is a Next App Router marker and inert here
    - it renders a react-router <Link> when given `to`, an <a> when given
      `href`, and a <button> otherwise. The original was always a <button>,
      which cannot navigate — and both of the places this is used are
      navigations.

  COLOUR IS A PROP, NOT A LITERAL
  The original hardcodes #111111 and white, which is a light-surface button.
  Both call sites here sit on a dark photographic plate, where that button is
  invisible. The two variants below are expressed as CSS custom properties so
  the same markup serves either surface; nothing in the component names a
  colour twice.

  ACCESSIBILITY
  The arrows are decorative — the label already says where the button goes — so
  they are hidden from assistive technology. The focus ring is NOT removed:
  the original's `active:scale-[0.95]` is kept, but a visible focus-visible
  ring is added, because a control that can be tabbed to has to show when it
  has been.

  THE ARROW IS THE SITE'S, NOT lucide-react's
  The supplied component imports ArrowRight from lucide-react. That package is
  not a dependency of this project — it was listed once and pruned, and nothing
  else imports it — so using it here would mean adding an icon library to draw
  a single chevron. src/components/Icon.js already exports IconArrowRight, on
  the same 24-unit grid, already stroked with currentColor, and already used by
  every other call to action on the site. It is aliased to the same local name
  so the JSX below is unchanged from the original. To go back to lucide-react,
  install it and swap the import line; nothing else refers to either.
*/

/*
  THE TWO OFF-PALETTE TONES THIS COMPONENT OWNS, AND WHY THEY ARE NOT TOKENS.

  Four literals lived inline in the variants below. They are named here rather
  than mapped onto the palette, because mapping them would change what renders
  and the difference is not subtle:

    CREAM #DED5C9 vs --off-white #E2E7E4 — 18 and 27 points apart on green and
    blue. The palette is cool and green-tinted throughout; this is warm. On a
    12px label the difference is arguable, but the `light` variant fills a
    whole pill with it against a photograph, and there the two read as
    different materials rather than as the same grey twice.

    WARM AMBER #D9B07A / #FFC66B vs --amber-2 #FF8A33 — 60 and 56 points apart
    on green and blue. Not the same colour by any reading. These are the hero
    mockup's own pair: a muted label that brightens on hover, deliberately one
    step off the brand orange so the mockup does not compete with the real
    accent elsewhere on the plate.

  Both belong to this component and to nowhere else on the site, which is the
  test for a local constant rather than a --token. Every variant using them
  sits on a dark plate; ratios below are against --ink:

    #DED5C9  12.91:1   the `light` label and fill
    #D9B07A   9.31:1   the `bare` label at rest
    #FFC66B  12.08:1   the `bare` label on hover
    CREAM_EDGE (#DED5C9 at 55%, resolving to #827D77 over ink) 4.59:1 — the
      outline of the `light` variant, comfortably over 1.4.11's 3:1 floor for
      a control boundary.

  The one value that does NOT clear 3:1 is the `bare` variant's hairline pair
  (#D9B07A at 42%, 2.59:1 over ink), and that is correct: `bare` has no pill
  and is not identified by its rules. Its label is the control, at 9.31:1.
*/
const CREAM = '#DED5C9';
const CREAM_EDGE = 'rgba(222, 213, 201, 0.55)';
const WARM_AMBER = '#D9B07A';
const WARM_AMBER_BRIGHT = '#FFC66B';

const VARIANTS = {
  /* On a dark plate: amber outline, filling to solid amber with ink text. */
  amber: {
    '--fb-edge': 'var(--amber)',
    '--fb-ink': 'var(--amber)',
    '--fb-fill': 'var(--amber)',
    '--fb-on-fill': 'var(--ink)',
  },
  /* On a dark plate: cream outline, filling to cream with ink text. */
  light: {
    '--fb-edge': CREAM_EDGE,
    '--fb-ink': CREAM,
    '--fb-fill': CREAM,
    '--fb-on-fill': 'var(--ink)',
  },
  /* The hero mockup's treatment: no pill, no fill. A muted-amber label between
     two hairlines, which is why `bare` also suppresses the expanding disc —
     a fill with no shape to fill just washes the plate behind the words. The
     arrows still travel, so the interaction survives the loss of the button. */
  bare: {
    '--fb-edge': 'transparent',
    '--fb-ink': WARM_AMBER,
    '--fb-fill': 'transparent',
    '--fb-on-fill': WARM_AMBER_BRIGHT,
  },
  /*
    FILLED AT REST, which is the one thing the other variants cannot express.

    The others are outlines that fill on hover, and that shape puts the label
    on whatever is behind the button — fine on a dark plate, and the reason the
    amber variant's 12px label was setting the scrim's floor. A solid pill puts
    the label on the button instead, so the photograph behind it stops being a
    legibility constraint at all and can be shown several stops brighter.

    It is what let the brand orange be used honestly. #FF6A00 has a relative
    luminance of 0.316, well below the #FFA500 it replaces, so as TEXT on a
    dark plate it needs a background at 48/255 or darker to clear 4.5:1 — a
    heavier wash than the one it was meant to lighten. As a FILL carrying
    #121212 it measures 6.6:1 against its own label and asks nothing of the
    plate.

    The disc still travels: --fb-fill is the lighter tint, so hovering brightens
    the pill from the centre out rather than colouring an empty one in. The
    label does not change colour, because it is already dark on both.
  */
  solid: {
    '--fb-edge': 'var(--amber)',
    '--fb-ink': 'var(--ink)',
    '--fb-fill': 'var(--amber-2)',
    '--fb-on-fill': 'var(--ink)',
    '--fb-rest': 'var(--amber)',
    '--fb-offset': 'var(--white)',
  },

  /* ---------------------------------------------------------------------
     LIGHT-SURFACE VARIANTS

     The four above were all drawn for a dark photographic plate, which is
     why this component started life in the hero and nowhere else. These
     three are their light-band equivalents, and adding them is what lets
     every button on the site share one interaction instead of the site
     carrying two button languages.

     They are direct replacements for the .btn-* classes in index.css:
       ink      <- .btn-primary       filled ink on a light band
       ghost    <- .btn-ghost         outlined on a light band
       inverse  <- .btn-inverse       filled white on a dark band
     and the two that already existed cover the rest:
       solid    <- .btn-amber
       light    <- .btn-outline-dark

     --fb-offset is the colour the focus ring is offset against. It was
     hardcoded to --ink, which is correct on a dark plate and invisible on a
     light one — the gap between ring and control has to be the colour of
     the surface behind it or the ring reads as a double border.
     --------------------------------------------------------------------- */

  /* The primary action on a light band. Filled at rest, brightening one
     step from the centre on hover. */
  ink: {
    '--fb-edge': 'var(--ink)',
    '--fb-ink': 'var(--text-on-dark)',
    '--fb-fill': 'var(--stone-800)',
    '--fb-on-fill': 'var(--text-on-dark)',
    '--fb-rest': 'var(--ink)',
    '--fb-offset': 'var(--white)',
  },

  /* The secondary action on a light band: an outline that fills to ink.
     --stone-300 rather than a hairline grey because an outlined button IS
     its outline — nothing else identifies it as a control — so the boundary
     has to clear 3:1. The same reasoning .btn-ghost carried. */
  ghost: {
    '--fb-edge': 'var(--stone-300)',
    '--fb-ink': 'var(--ink)',
    '--fb-fill': 'var(--ink)',
    '--fb-on-fill': 'var(--text-on-dark)',
    '--fb-offset': 'var(--white)',
  },

  /* Filled white on a dark band. The counterpart to `light`, which is the
     outline on the same surface. */
  inverse: {
    '--fb-edge': 'var(--white)',
    '--fb-ink': 'var(--ink)',
    '--fb-fill': 'var(--off-white)',
    '--fb-on-fill': 'var(--ink)',
    '--fb-rest': 'var(--white)',
    '--fb-offset': 'var(--ink)',
  },
};

export function FlowButton({
  text = 'Modern Button',
  variant = 'light',
  to,
  href,
  className,
  ...props
}) {
  const Tag = to ? Link : href ? 'a' : 'button';
  const tagProps = to ? { to } : href ? { href } : { type: 'button' };

  /* An unrecognised variant name used to be fatal: the lookup returned
     undefined and the --fb-rest read below threw, which white-screens the
     whole route rather than mis-styling one button. A call site carrying
     variant="dark" — a name that never existed here — is exactly how that
     happened. Fall back to the default instead.

     The fallback used to be paired with a development console.warn naming the
     bad variant. That is gone: a component in a shared UI directory does not get
     to write to the console, and the warning was never the thing that caught the
     typo — a button rendering in the wrong tone is visible on the page. The
     fallback is the behaviour that matters and it is unchanged. */
  const tokens = VARIANTS[variant] || VARIANTS.light;

  const bare = variant === 'bare';
  /* Whether the pill is painted at rest. Read off the variant's own --fb-rest
     rather than a second list of variant names here, so a new filled variant
     needs one entry in VARIANTS and nothing in this function. */
  const restFill = tokens['--fb-rest'];

  return (
    <Tag
      {...tagProps}
      {...props}
      style={{ ...tokens, ...(props.style || {}) }}
      className={cn(
        'group relative inline-flex items-center gap-1 overflow-hidden no-underline',
        'cursor-pointer text-[color:var(--fb-ink)]',
        restFill ? 'bg-[color:var(--fb-rest)]' : 'bg-transparent',
        bare
          ? 'border-y border-x-0 border-[rgba(217,176,122,0.42)] px-7 py-3 rounded-none'
          : 'rounded-[100px] border-[1.5px] border-[color:var(--fb-edge)] px-8 py-3',
        /* The site sets every other call to action in mono uppercase; this one
           matches so the hero does not introduce a second button language. */
        'font-[500] uppercase [font-family:var(--font-mono)]',
        bare ? 'text-[12px] tracking-[0.16em]' : 'text-[12px] tracking-[0.14em]',
        'transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        bare
          ? 'hover:text-[color:var(--fb-on-fill)] hover:border-[rgba(255,198,107,0.9)]'
          : 'hover:border-transparent hover:rounded-[12px] hover:text-[color:var(--fb-on-fill)]',
        'active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--fb-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--fb-offset,var(--ink))]',
        'motion-reduce:transition-none',
        className,
      )}
    >
      {/* Arrow parked off the left edge, riding in on hover. */}
      <ArrowRight
        aria-hidden="true"
        className="absolute w-4 h-4 left-[-25%] z-[9] fill-none stroke-current transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:left-4 motion-reduce:transition-none"
      />

      <span className="relative z-[1] -translate-x-3 transition-all duration-[800ms] ease-out group-hover:translate-x-3 motion-reduce:transition-none">
        {text}
      </span>

      {/* The fill. A disc that scales up from the centre rather than a
          background that cross-fades, so the change reads as one object
          arriving instead of the button changing colour. Suppressed in the
          bare variant — see the note on VARIANTS. */}
      {!bare && (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[color:var(--fb-fill)] opacity-0 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:w-[320px] group-hover:h-[320px] group-hover:opacity-100 motion-reduce:transition-none"
        />
      )}

      {/* Arrow at rest on the right, riding out on hover. */}
      <ArrowRight
        aria-hidden="true"
        className="absolute w-4 h-4 right-4 z-[9] fill-none stroke-current transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:right-[-25%] motion-reduce:transition-none"
      />
    </Tag>
  );
}

export default FlowButton;
