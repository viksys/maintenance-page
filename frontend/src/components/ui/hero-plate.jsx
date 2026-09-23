import React from 'react';

/*
  The hero plate. One full-viewport image, shown.

  WHAT THIS WAS, AND WHY IT IS NOT THAT ANY MORE
  It was SmoothScrollHero: a sticky plate whose clip-path opened from a 25/75
  inset to the full frame while a transform scaled it from 1.7 to 1, both
  driven off useScroll, with a bouncing chevron cue underneath and a 1200px
  spacer under that to give the animation somewhere to run. It was removed by
  direction on 23 September 2026 — the image is the content, and a reader who
  arrived at /company had to scroll through two viewports of choreography
  before seeing it whole.

  WHAT WENT WITH IT, because none of it has a job once the animation is gone:

    framer-motion       the only reason the file imported it
    the 1200px spacer   `height: calc(1200px + 100vh)` on the wrapper. This is
                        why the section measured 2145px tall against a 945px
                        viewport; the plate is one screen now.
    position: sticky    there is nothing to hold the plate still for
    ScrollCue           it was positioned at calc(100vh - 64px) against the
                        wrapper, so leaving it mounted would have floated a
                        chevron over the section below
    useReducedMotion    this branch WAS the reduced-motion branch. There is no
                        motion left to opt out of, so there is nothing to ask.

  The framing is unchanged from that branch and therefore from the animation's
  final state: object-fit: cover with object-position: center is what
  background-size: cover / background-position: center resolved to, so the
  plate lands exactly where the zoom used to settle.

  STILL AN <img> RATHER THAN A BACKGROUND, for the two reasons that predate the
  animation and outlive it. It is the LCP element of the page that mounts it:
  as a CSS background it is invisible to the preload scanner and cannot carry
  fetchpriority, and it takes no intrinsic dimensions, so the box is not
  reserved before the decode. As an <img> inside a <picture> it does both, and
  <picture> is also the only way to stop the browser fetching the plate it will
  not use — a display:none background-image is never downloaded, but a
  display:none <img> is.
*/

/*
  The plates' true intrinsic sizes, so the browser reserves the box from the
  right ratio before either decodes. They are not the same shape — the mobile
  file is a portrait crop of the same scene, not a scaled copy — so the pair
  goes on the <source> as well as on the <img>. Attributes on <source> are how
  a <picture> tells the layout the ratio of the candidate it actually picked;
  without them a handset would reserve the 16:9 desktop box and reshape the
  image when the portrait file landed. Update both pairs whenever a file is
  replaced.
*/
const PLATE_W = 1675;
const PLATE_H = 939;
const PLATE_MOBILE_W = 750;
const PLATE_MOBILE_H = 939;

export default function HeroPlate({ desktopImage, mobileImage, className = '' }) {
  return (
    <div
      className={`relative w-full h-screen overflow-hidden ${className}`}
      style={{ background: 'var(--ink)' }}
    >
      {/* 767px is the same breakpoint the rest of the page switches on. */}
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet={mobileImage}
          width={PLATE_MOBILE_W}
          height={PLATE_MOBILE_H}
        />
        <img
          src={desktopImage}
          alt=""
          width={PLATE_W}
          height={PLATE_H}
          /* Lowercase on purpose. React 18 forwards unknown lowercase
             attributes untouched; the camelCase spelling is a React 19 feature
             and warns on this version. This is the page's LCP element, so the
             hint is worth having. */
          fetchpriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full max-w-none"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
      </picture>
    </div>
  );
}
