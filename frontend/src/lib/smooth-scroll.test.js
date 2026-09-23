/*
  Tests for the scroll lock.

  lockScroll()/unlockScroll() are reference counted for one concrete reason:
  the search overlay can be opened from inside the careers modal, so two
  lockable surfaces are legitimately open at once. A boolean would unlock the
  whole page the moment the INNER surface closed, leaving a dialog floating
  over a page that scrolls behind it. That defect is invisible in review — both
  surfaces work perfectly on their own — so it is exactly the kind of thing a
  test has to hold.

  The module is a singleton with module-level state (`lockCount`,
  `restoreBodyStyle`), so every case re-imports it through jest.resetModules().
  Sharing one instance across cases would let a leaked count from one test
  decide the outcome of the next.

  ---------------------------------------------------------------------------
  WHY `lenis` IS MOCKED HERE, AND WHY THAT IS NOT THE INTENDED ARRANGEMENT
  ---------------------------------------------------------------------------
  lenis is ESM only. craco.config.js carries a transformIgnorePatterns
  carve-out so that Jest transforms it, and the intent was that this file could
  import the real package.

  That carve-out does not currently take effect. @craco/craco CONCATENATES the
  array from jest.configure onto Create React App's, rather than replacing it,
  so Jest ends up holding four patterns — and the first is CRA's default

      [/\\]node_modules[/\\].+\.(js|jsx|mjs|cjs|ts|tsx)$

  which has no negative lookahead. transformIgnorePatterns is an OR: the first
  pattern matches node_modules/lenis/dist/lenis.mjs, so the file is never
  transformed and the carve-out below it can never be reached. Any test that
  imports a module which imports lenis dies on `Unexpected token 'export'`
  inside a dependency.

  So the mock below is a WORKAROUND, not a design choice, and it is scoped to
  keep the thing actually under test honest: the lock helpers are written to
  work whether or not an instance exists, and the reference counting is pure
  module state that Lenis never touches. The canary at the bottom of this file
  asserts the real package loads, and is skipped until the config is fixed.
*/

/* eslint-disable global-require */

jest.mock('lenis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    raf: jest.fn(),
    stop: jest.fn(),
    start: jest.fn(),
    destroy: jest.fn(),
    scrollTo: jest.fn(),
  })),
}));

/* Lenis is never constructed under reduced motion, which keeps jsdom out of
   the business of pretending to lay out a scrolling document. */
const pretendReducedMotion = (matches) => {
  window.matchMedia = jest.fn(() => ({
    matches,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  }));
};

describe('scroll lock reference counting', () => {
  let scroll;

  beforeEach(() => {
    jest.resetModules();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    scroll = require('@/lib/smooth-scroll');
  });

  test('locking stops the page scrolling', () => {
    scroll.lockScroll();

    expect(document.body.style.overflow).toBe('hidden');
  });

  test('two locks and one unlock leave the page locked', () => {
    /* The inner surface closed. The outer one is still open. */
    scroll.lockScroll();
    scroll.lockScroll();
    scroll.unlockScroll();

    expect(document.body.style.overflow).toBe('hidden');
  });

  test('the final unlock is the one that restores the page', () => {
    scroll.lockScroll();
    scroll.lockScroll();
    scroll.unlockScroll();
    scroll.unlockScroll();

    expect(document.body.style.overflow).toBe('');
  });

  test('a lock held three deep needs three unlocks', () => {
    scroll.lockScroll();
    scroll.lockScroll();
    scroll.lockScroll();

    scroll.unlockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    scroll.unlockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    scroll.unlockScroll();
    expect(document.body.style.overflow).toBe('');
  });

  test('an unbalanced extra unlock is a no-op rather than a negative count', () => {
    /* If the count were allowed to go negative, the NEXT lock would need two
       unlocks to release and the page would stay frozen after a dialog closed
       — a bug that only appears on the second dialog the visitor opens. */
    scroll.lockScroll();
    scroll.unlockScroll();
    scroll.unlockScroll();
    scroll.unlockScroll();

    expect(document.body.style.overflow).toBe('');

    scroll.lockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    scroll.unlockScroll();
    expect(document.body.style.overflow).toBe('');
  });

  test('unlocking before anything has locked leaves the page untouched', () => {
    document.body.style.overflow = 'visible';

    scroll.unlockScroll();

    expect(document.body.style.overflow).toBe('visible');
  });

  test('the inline style that was there before the lock is put back, not cleared', () => {
    /* Two components mutating body.style directly would clobber each other's
       saved values. The module saves once, on the outermost lock, and restores
       exactly that. */
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '8px';

    scroll.lockScroll();
    expect(document.body.style.overflow).toBe('hidden');

    scroll.unlockScroll();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.paddingRight).toBe('8px');
  });

  test('a nested lock does not overwrite the value saved by the outer one', () => {
    document.body.style.overflow = 'auto';

    scroll.lockScroll();
    scroll.lockScroll();
    scroll.unlockScroll();
    scroll.unlockScroll();

    expect(document.body.style.overflow).toBe('auto');
  });

  test('locking and unlocking repeatedly does not accumulate state', () => {
    for (let i = 0; i < 5; i += 1) {
      scroll.lockScroll();
      expect(document.body.style.overflow).toBe('hidden');
      scroll.unlockScroll();
      expect(document.body.style.overflow).toBe('');
    }
  });
});

describe('scroll helpers with no smooth-scroll instance', () => {
  let scroll;

  beforeEach(() => {
    jest.resetModules();
    scroll = require('@/lib/smooth-scroll');
  });

  test('scrollToTop falls through to the native jump', () => {
    /* Reduced motion is a full no-op, not a faster animation, so every helper
       has to work with no instance at all. */
    const spy = jest.spyOn(window, 'scrollTo').mockImplementation(() => {});

    scroll.scrollToTop();

    expect(spy).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    spy.mockRestore();
  });

  test('scrollToElement falls through to the native scroll', () => {
    const el = document.createElement('div');
    el.scrollIntoView = jest.fn();

    scroll.scrollToElement(el);

    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  test('scrollToElement on a missing element is ignored rather than throwing', () => {
    expect(() => scroll.scrollToElement(null)).not.toThrow();
    expect(() => scroll.scrollToElement(undefined)).not.toThrow();
  });
});

describe('initSmoothScroll() when the user has asked for reduced motion', () => {
  let scroll;
  let realMatchMedia;

  beforeEach(() => {
    jest.resetModules();
    document.body.style.overflow = '';
    realMatchMedia = window.matchMedia;
    pretendReducedMotion(true);
    scroll = require('@/lib/smooth-scroll');
  });

  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  test('no smooth-scroll instance is constructed at all', () => {
    /* Hijacking the scroll to animate more politely is still hijacking it. */
    const Lenis = require('lenis').default;
    Lenis.mockClear();

    const teardown = scroll.initSmoothScroll();

    expect(Lenis).not.toHaveBeenCalled();
    teardown();
  });

  test('it returns its own teardown, so it can be a useEffect body directly', () => {
    const teardown = scroll.initSmoothScroll();

    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();
  });

  test('mounting twice and tearing down twice is safe under StrictMode', () => {
    const first = scroll.initSmoothScroll();
    const second = scroll.initSmoothScroll();

    expect(() => {
      second();
      first();
    }).not.toThrow();
  });

  test('teardown releases a held lock and resets the count for the next mount', () => {
    /* A teardown means the application is going away. Leaving a stale count
       behind would leave the next mount holding a lock it can never release. */
    const teardown = scroll.initSmoothScroll();

    scroll.lockScroll();
    scroll.lockScroll();
    expect(document.body.style.overflow).toBe('hidden');

    teardown();
    expect(document.body.style.overflow).toBe('');

    scroll.lockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    scroll.unlockScroll();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('initSmoothScroll() when motion is allowed', () => {
  let scroll;
  let realMatchMedia;
  let teardown;

  beforeEach(() => {
    jest.resetModules();
    document.body.style.overflow = '';
    realMatchMedia = window.matchMedia;
    pretendReducedMotion(false);
    scroll = require('@/lib/smooth-scroll');
  });

  afterEach(() => {
    if (teardown) teardown();
    teardown = null;
    window.matchMedia = realMatchMedia;
  });

  test('exactly one instance is constructed, however many times it is mounted', () => {
    /* Two instances write scrollTop on the same frame and fight for the same
       gesture. The singleton is the entire reason this is a module and not a
       hook. */
    const Lenis = require('lenis').default;
    Lenis.mockClear();

    teardown = scroll.initSmoothScroll();
    scroll.initSmoothScroll();
    scroll.initSmoothScroll();

    expect(Lenis).toHaveBeenCalledTimes(1);
  });

  test('locking stops the instance, not just the body overflow', () => {
    /* Lenis writes the scroll position directly and ignores overflow, so a
       dialog that sets overflow and nothing else scrolls the page behind it.
       That was a live defect in the search overlay. */
    const Lenis = require('lenis').default;
    Lenis.mockClear();

    teardown = scroll.initSmoothScroll();
    const instance = Lenis.mock.results[0].value;

    scroll.lockScroll();
    expect(instance.stop).toHaveBeenCalledTimes(1);

    scroll.unlockScroll();
    expect(instance.start).toHaveBeenCalledTimes(1);
  });

  test('a nested lock does not restart the instance when the inner surface closes', () => {
    const Lenis = require('lenis').default;
    Lenis.mockClear();

    teardown = scroll.initSmoothScroll();
    const instance = Lenis.mock.results[0].value;

    scroll.lockScroll();
    scroll.lockScroll();
    scroll.unlockScroll();

    expect(instance.start).not.toHaveBeenCalled();

    scroll.unlockScroll();
    expect(instance.start).toHaveBeenCalledTimes(1);
  });

  test('teardown destroys the instance so a remount builds a fresh one', () => {
    const Lenis = require('lenis').default;
    Lenis.mockClear();

    const stop = scroll.initSmoothScroll();
    const instance = Lenis.mock.results[0].value;

    stop();

    expect(instance.destroy).toHaveBeenCalled();
  });
});

/*
  CANARY. Un-skip this the moment craco.config.js stops letting CRA's default
  transformIgnorePatterns entry survive alongside the carve-out — see the note
  at the top of this file. While the carve-out is inert this throws

      SyntaxError: Unexpected token 'export'
      node_modules/lenis/dist/lenis.mjs

  which is the failure every real test touching smooth-scroll, Header, or any
  page that mounts them will hit. It is a configuration defect, not a test one,
  so it is recorded rather than worked around silently.
*/
describe('the ESM carve-out for lenis', () => {
  it('lets Jest load the real package instead of choking on its export statement', () => {
    const actual = jest.requireActual('lenis');

    expect(typeof actual.default).toBe('function');
  });
});
