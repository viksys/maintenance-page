import Lenis from 'lenis';

/*
  Site-wide smooth scrolling, and the scroll lock that modal surfaces depend on.

  ONE INSTANCE, EVER. Lenis drives window scroll itself by writing scrollTop on
  every frame. Two instances fight each other for the same gesture and the page
  judders. The singleton below is the whole reason this module exists rather
  than a hook: the instance has to outlive any single component and be reachable
  by the modals, which need to stop it while they are open.

  REDUCED MOTION IS A FULL NO-OP, NOT A FASTER ANIMATION. When the user has asked
  for less motion, Lenis is never constructed. Native scrolling is already the
  correct behaviour and hijacking it to animate more politely is still hijacking
  it. Every exported helper falls through to the native call when the instance is
  absent, so callers need no branch of their own.

  The preference is also watched at runtime. Changing it in the OS while the page
  is open tears the instance down or builds it, without a reload.

  DELIBERATELY NOT DRIVEN BY GSAP. An earlier version of this module ran Lenis
  from gsap.ticker and set gsap.ticker.lagSmoothing(0) — a mutation of a shared
  singleton, applied for this module's benefit and never restored on teardown,
  so every other GSAP animation on the page inherited it for the life of the
  session.

  GSAP is still a dependency: 3.15.0, imported by components/ui/looping-words.jsx
  for the hero word cycle and by nothing else. The reason this module does not
  use it is not availability, it is ownership. Scroll is site-wide and outlives
  every component; binding it to another library's global ticker means the
  scroll lifecycle is no longer this module's to control, and stopping smooth
  scroll for reduced motion becomes an edit to shared state rather than a local
  teardown. The raf loop below is therefore plain requestAnimationFrame and owns
  its own lifecycle — starting and stopping it touches nothing another module
  can observe.
*/

let lenis = null;
let rafId = 0;
let mql = null;
let onPrefChange = null;

/* Reference-counted, because two lockable surfaces can legitimately overlap —
   the search overlay can be opened from inside the careers modal. A boolean
   would unlock the page when the inner one closed. */
let lockCount = 0;
let restoreBodyStyle = null;

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function startLenis() {
  if (lenis || prefersReduced()) return;

  lenis = new Lenis({
    duration: 1.05,
    /* Exponential ease-out. Long tail, no overshoot: the page should settle,
       not bounce. */
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    /* Touch is deliberately excluded. Mobile browsers already implement
       momentum scrolling in the compositor, off the main thread; replacing it
       with a JS loop is slower and feels wrong to anyone used to the platform. */
    syncTouch: false,
    touchMultiplier: 1,
  });

  const loop = (time) => {
    lenis?.raf(time);
    rafId = window.requestAnimationFrame(loop);
  };
  rafId = window.requestAnimationFrame(loop);

  /* A surface may already be locked when the instance is (re)built — for
     example if the preference changes while a modal is open. */
  if (lockCount > 0) lenis.stop();
}

function stopLenis() {
  if (rafId) window.cancelAnimationFrame(rafId);
  rafId = 0;
  lenis?.destroy();
  lenis = null;
}

/*
  Mounted once, from App. Returns its own teardown so it can be used directly as
  a useEffect body. Safe under StrictMode's double-invoke: startLenis is a no-op
  when an instance already exists, and teardown fully releases.
*/
export function initSmoothScroll() {
  if (typeof window === 'undefined') return () => {};

  startLenis();

  if (window.matchMedia) {
    mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    onPrefChange = (e) => (e.matches ? stopLenis() : startLenis());
    /* addListener is the deprecated form, kept for older Safari. */
    if (mql.addEventListener) mql.addEventListener('change', onPrefChange);
    else if (mql.addListener) mql.addListener(onPrefChange);
  }

  return () => {
    if (mql && onPrefChange) {
      if (mql.removeEventListener) mql.removeEventListener('change', onPrefChange);
      else if (mql.removeListener) mql.removeListener(onPrefChange);
    }
    mql = null;
    onPrefChange = null;
    stopLenis();
    /* Reset the counter too. A teardown means the whole application is going
       away; leaving a stale count would leave the next mount unable to unlock. */
    lockCount = 0;
    if (restoreBodyStyle) {
      restoreBodyStyle();
      restoreBodyStyle = null;
    }
  };
}

/* Scroll to the top of the document. Instant by design — this runs on route
   change, where animating the scroll means the visitor watches the old page
   slide away before the new one arrives. */
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  else window.scrollTo({ top: 0, behavior: 'auto' });
}

/* Scroll an element into view, honouring in-page anchors. */
export function scrollToElement(el, { offset = 0 } = {}) {
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset, immediate: true });
  else el.scrollIntoView({ behavior: 'auto', block: 'start' });
}

/*
  Lock and unlock background scroll.

  Body overflow alone is NOT sufficient. Lenis writes the scroll position
  directly and ignores overflow, so a page with smooth scrolling active will
  keep scrolling underneath an open dialog unless the instance is stopped too.
  That was a live defect in the search overlay: it set overflow and nothing else.

  Both surfaces must call these rather than touching body.style themselves —
  two components mutating the same property will clobber each other's saved
  values and restore the wrong one.
*/
export function lockScroll() {
  lockCount += 1;
  if (lockCount > 1) return;

  const { overflow, paddingRight } = document.body.style;
  /* Compensate for the scrollbar the lock removes, or the page shifts sideways
     the moment a dialog opens. */
  const gap = window.innerWidth - document.documentElement.clientWidth;

  document.body.style.overflow = 'hidden';
  if (gap > 0) {
    const current = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
    document.body.style.paddingRight = `${current + gap}px`;
  }

  restoreBodyStyle = () => {
    document.body.style.overflow = overflow;
    document.body.style.paddingRight = paddingRight;
  };

  lenis?.stop();
}

export function unlockScroll() {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount > 0) return;

  if (restoreBodyStyle) {
    restoreBodyStyle();
    restoreBodyStyle = null;
  }
  lenis?.start();
}
