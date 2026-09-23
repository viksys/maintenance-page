import React, { useEffect, useInsertionEffect, useRef, useState } from 'react';

/*
  Infinite, GPU-accelerated logo marquee. Pure CSS transform animation (no JS
  ticking), a track built from two identical halves so the loop is seamless,
  fade masks on both edges, and two independent ways to stop it: hovering the
  strip, and an explicit pause control. Renders whatever logos are passed in —
  no logos are generated or invented here, only the ones already shipped in
  /assets/img/logos are used by the caller.

  ---------------------------------------------------------------------------
  THE STYLESHEET IS INJECTED ONCE, NOT ONCE PER MOUNT
  ---------------------------------------------------------------------------
  These rules used to be a <style> element rendered inside the component, so
  every mount appended another copy of the same global rules to the document
  and triggered a document-wide style recalculation to install them. Two
  carousels on one page meant two identical sheets; a route change that
  remounted the section meant a third. The rules are global — they are keyed on
  class names, not scoped to an instance — so exactly one copy is correct.

  It is a module-scoped sheet installed from useInsertionEffect, which is the
  hook that exists for this: it runs before layout effects and before paint, so
  the first frame is already styled, and the guard makes every call after the
  first a no-op.

  ---------------------------------------------------------------------------
  NOTHING RUNS OFF-SCREEN
  ---------------------------------------------------------------------------
  The animation and the compositor layer that serves it are both gated on
  `is-running`, which an IntersectionObserver sets. will-change: transform held
  permanently is a layer the browser cannot reclaim, on a component that lives
  well down a long page; the marquee also had no reason to keep translating
  where nobody could see it.

  ---------------------------------------------------------------------------
  THREE THINGS CAN PAUSE THE TRACK, AND THEY DO NOT ALL WIN THE SAME WAY
  ---------------------------------------------------------------------------
  The base rule pauses it and the observer's `is-running` starts it, which is
  the arrangement described above. On top of that sit two user-driven pauses,
  and they take the cascade by different means.

  Hover wins on SPECIFICITY: `.logo-carousel.is-running:hover .track` is
  (0,4,0) against the running rule's (0,3,0), so it beats it wherever the two
  sit in the sheet.

  The explicit pause wins on SOURCE ORDER: `.logo-carousel.is-paused .track` is
  (0,3,0) — exactly equal to the running rule — and is written after it, so it
  takes the cascade. That ordering is the whole mechanism and must survive any
  re-shuffle of this sheet: a user who has pressed Pause must stay paused when
  the observer scrolls the strip back into view and re-asserts `is-running`.

  Neither is an inline style fighting the sheet, which is what both of these
  would otherwise have had to be.

  ---------------------------------------------------------------------------
  THE ROOT IS NOT THE CLIPPING BOX
  ---------------------------------------------------------------------------
  `overflow: hidden` and the edge mask live on `__viewport`, not on the root.
  The root is a bare positioning context, because the pause control is
  absolutely positioned against it and is 44px tall against a strip that is
  only as tall as the logos (34px at the site's one caller). Clipped to the
  root, the control would have silently lost a third of its hit target — and
  the edge mask would have faded the control out along with the logos, since a
  mask applies to the whole subtree.
*/

const SHEET = `
.logo-carousel {
  position: relative;
  width: 100%;
}
.logo-carousel__viewport {
  position: relative;
  overflow: hidden;
  width: 100%;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 10%, #000 90%, transparent 100%);
}
.logo-carousel__track {
  display: flex;
  align-items: center;
  width: max-content;
  animation-name: logo-carousel-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  /* Paused, unpromoted and untranslated until the carousel is on screen. */
  animation-play-state: paused;
}
.logo-carousel.is-running .logo-carousel__track {
  animation-play-state: running;
  will-change: transform;
  transform: translate3d(0, 0, 0);
}
.logo-carousel.is-running:hover .logo-carousel__track {
  animation-play-state: paused;
}
/* MUST STAY AFTER THE is-running RULE. Equal specificity, later in the sheet —
   see the note on the cascade above. will-change is released too: a track the
   user has stopped has no reason to hold a compositor layer open. The transform
   is left alone deliberately; a paused animation keeps its computed value, and
   resetting it here would snap the strip back to its start. */
.logo-carousel.is-paused .logo-carousel__track {
  animation-play-state: paused;
  will-change: auto;
}
.logo-carousel__item {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}
.logo-carousel__item img {
  width: auto;
  height: auto;
  object-fit: contain;
  filter: grayscale(100%);
  opacity: 0.5;
  transition: opacity 0.3s ease, filter 0.3s ease;
}
.logo-carousel__item:hover img {
  opacity: 1;
  filter: grayscale(0%);
}
/* 14px of icon, 44px of target — the same split .vk-panel-close and .nav-link
   make in index.css, for the same reason. The strip is 34px tall, so the target
   overhangs it by 5px top and bottom while the icon stays comfortably inside:
   nothing extends past the strip except the hit area, and nothing moves. It is
   also why the root cannot be the clipping box.

   ALWAYS VISIBLE, never revealed on hover. A control that appears on hover is
   no control at all on a touch device, which is half the audience this rule
   exists for, and an icon faded down far enough to be unobtrusive cannot meet
   the 3:1 that 1.4.11 asks of a control's own boundary. --stone-500 measures
   5.43:1 on --white, which is the only ground this component is placed on
   today (the integrations strip on the homepage) and clears the text floor,
   never mind the control floor. It is NOT safe on ink: the same token is
   3.04:1 there. If this carousel is ever placed on a dark band, the colour
   has to move with it - --text-on-dark-3 is the token for that role. Hover
   and focus resolve to the inherited text colour rather than a hard-coded
   one, so they follow the band for free. */
.logo-carousel__toggle {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: var(--stone-500, #5F6355);
  cursor: pointer;
  transition: color 0.18s ease;
}
.logo-carousel__toggle:hover,
.logo-carousel__toggle:focus-visible {
  color: inherit;
}
@keyframes logo-carousel-scroll {
  from { transform: translate3d(0, 0, 0); }
  to { transform: translate3d(-50%, 0, 0); }
}
@media (prefers-reduced-motion: reduce) {
  /* Later in the sheet and equal in specificity to the is-running rule, so it
     wins on both properties whatever the observer has decided. The is-paused
     rule needs no entry here: it only ever pauses, and there is nothing left
     running to pause. */
  .logo-carousel.is-running .logo-carousel__track,
  .logo-carousel .logo-carousel__track {
    animation: none;
    will-change: auto;
    transform: none;
  }
}
`;

/*
  INTRINSIC PIXEL SIZES OF THE SHIPPED LOGO FILES.

  Read from the .webp headers, not estimated. They belong with the logo data
  rather than here — a caller that passes `width` and `height` on a logo wins
  over this table, which is the intended direction of travel.

  FALLBACK ONLY, AND ON ITS WAY OUT. data/home.js now carries the pair on every
  entry in PARTNER_LOGOS, which is the site's one caller, so nothing in the
  shipped site reaches this table any more. It stays for a caller that passes a
  logo list without dimensions, and it should be deleted the moment there is no
  such caller — two records of the same measurement is one too many, and the
  copy nobody reads is the one that goes stale.

  The table is keyed on src so a file that is replaced at the same path is
  caught by the same review that would catch a stale width anywhere else.
*/
const INTRINSIC = {
  '/assets/img/logos/mavlink.webp': [437, 88],
  '/assets/img/logos/px4.webp': [640, 305],
  '/assets/img/logos/ardupilot.webp': [640, 94],
  '/assets/img/logos/ros.webp': [416, 110],
  '/assets/img/logos/atak.webp': [464, 506],
};

function intrinsicSize(logo) {
  if (logo.width && logo.height) return [logo.width, logo.height];
  return INTRINSIC[logo.src] || [undefined, undefined];
}

let sheetInstalled = false;

function installSheet() {
  if (sheetInstalled || typeof document === 'undefined') return;
  sheetInstalled = true;
  const el = document.createElement('style');
  el.setAttribute('data-logo-carousel', '');
  el.appendChild(document.createTextNode(SHEET));
  document.head.appendChild(el);
}

/* Two bars or a triangle, 14px, drawn in currentColor so the button's one
   colour rule governs both states. Marked presentational: the button's own
   accessible name already says what it does, and an icon that repeats it is a
   second announcement of one control. */
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

export default function LogoCarousel({ logos = [], height = 30, itemGap = 96, duration = 32, className = '' }) {
  const rootRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);

  /*
    THE PAUSE CONTROL EXISTS BECAUSE WCAG 2.2.2 REQUIRES ONE.

    The marquee moves automatically, it starts without being asked, and a
    32-second loop is a great deal longer than the five seconds past which
    Level A stops treating motion as incidental. Hovering the strip already
    paused it — but hover is a pointer affordance, and neither a keyboard user
    nor a touch user has one. "It pauses on hover" is not a mechanism; it is a
    mechanism for some people.

    The control is a real <button type="button">, not a div with a handler, so
    it is in the tab order, responds to Enter and Space, and is announced as a
    button without being told to be one.

    NO aria-pressed, DELIBERATELY. Its accessible name names the NEXT action —
    "Pause logo animation" while running, "Resume logo animation" while
    paused — which is how a media transport control behaves and how people
    already expect this shape to read. Adding aria-pressed on top would put the
    state in two places and get one of them backwards: a button named "Resume
    logo animation" carrying aria-pressed="true" announces "Resume logo
    animation, pressed", which asserts the opposite of what is true. One
    encoding of state, and the name is the one that survives being read aloud.
    No live region either — the name changes under focus, and screen readers
    re-announce it on their own.
  */
  const [paused, setPaused] = useState(false);

  useInsertionEffect(installSheet, []);

  /* Starts false rather than true so an off-screen carousel never promotes a
     layer at all. The observer resolves within the first frame, and a marquee
     that begins one frame into its 32-second cycle is not a thing anyone can
     see. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([entry]) => setIsRunning(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /*
    ONE LOGO, RENDERED TWICE, ANNOUNCED ONCE.

    `half` is 'a' for the read copy and 'b' for the duplicate. The duplicate's
    item is aria-hidden and its image's alt is empty; either alone would be
    enough, and both are here because they fail differently — aria-hidden is
    the guarantee today, and the empty alt is what keeps the duplicate honest
    if this wrapper is ever restructured away.

    There is nothing focusable in either half, so aria-hidden on 'b' hides no
    control from the keyboard — aria-hidden over a focusable element is the one
    way this pattern goes wrong, and anything interactive added inside an item
    would have to move out of the duplicated half first.
  */
  const renderLogo = (l, i, half) => {
    /*
      INTRINSIC DIMENSIONS, WHICH ARE NOT OPTIONAL ON THIS COMPONENT.

      The track is `width: max-content` and the keyframes translate it by
      -50% of that width. Without width/height each logo measures zero until
      it decodes, so every decode widened the track mid-animation and changed
      the distance the running loop was translating over — the marquee
      jumped, and the row's height stepped, every time an image landed. With
      the intrinsic pair the box is reserved from the true ratio and the
      max-height/max-width caps below resolve to the same used size before
      and after the decode, so nothing moves.
    */
    const [w, h] = intrinsicSize(l);
    return (
      <div
        className="logo-carousel__item"
        key={`${l.name}-${half}-${i}`}
        aria-hidden={half === 'b' ? 'true' : undefined}
        style={{ paddingLeft: itemGap / 2, paddingRight: itemGap / 2 }}
      >
        <img
          src={l.src}
          alt={half === 'b' ? '' : l.name}
          width={w}
          height={h}
          loading="lazy"
          decoding="async"
          style={{ maxHeight: height, maxWidth: 140 }}
        />
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      className={`logo-carousel ${isRunning ? 'is-running' : ''} ${paused ? 'is-paused' : ''} ${className}`}
    >
      <div className="logo-carousel__viewport">
        <div className="logo-carousel__track" style={{ animationDuration: `${duration}s` }}>
          {/* The half that is read. */}
          {logos.map((l, i) => renderLogo(l, i, 'a'))}
          {/*
            The half that exists only so the loop has somewhere to go.

            The keyframes translate the track by exactly -50% of its own width,
            which lands the second copy precisely where the first one started —
            that is what makes the wrap invisible, and it is only true while
            this half is an exact duplicate of the one above. It carries no
            information a reader has not already been given, so it is hidden:
            without that, the strip announced "MAVLink PX4 ArduPilot ROS ATAK"
            and then said the whole thing again.
          */}
          {logos.map((l, i) => renderLogo(l, i, 'b'))}
        </div>
      </div>

      {/*
        HOVER IS A TRANSIENT PAUSE; THIS IS A STICKY ONE.

        Reading this control with a mouse is momentarily confusing and is not a
        bug: pressing Resume necessarily means the pointer is over the strip,
        which is the hover pause, so nothing moves until the pointer leaves.
        The sticky pause really has been lifted — the transient one has not, and
        cannot be while the pointer is still there.

        Rendered unconditionally, including under prefers-reduced-motion. There
        the track already carries `animation: none` and the button is inert
        rather than wrong, which is easier to reason about than a control that
        disappears depending on a user preference — and it keeps this file clear
        of a matchMedia read that has no meaning during server rendering.
      */}
      <button
        type="button"
        className="logo-carousel__toggle"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'Resume logo animation' : 'Pause logo animation'}
      >
        <ToggleIcon paused={paused} />
      </button>
    </div>
  );
}
