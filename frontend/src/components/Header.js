import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { scrollToTop, lockScroll, unlockScroll } from '@/lib/smooth-scroll';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import SearchOverlay from './SearchOverlay';

/*
  Anduril-style permanent-dark header with a full-width mega-menu that slides
  down on hover, or from the disclosure button beside each nav label for anyone
  without a hovering pointer. Hovered nav label turns muted and a trailing "—"
  appears next to it while the panel is open.
*/

/*
  NAVIGATION INFORMATION ARCHITECTURE

  Two levels, never three. Opening a menu shows only its categories; the items
  inside a category appear when the cursor moves onto it. A menu therefore
  presents two or three words at rest instead of twenty links.

  Each destination has exactly one home. Products lists what is actually
  delivered.
*/
const nav = [
  {
    key: 'products',
    label: 'Products',
    to: '/products/platform',
    mega: {
      /*
        Flat, like Company. Products now holds seven entries across three
        columns — few enough to read at a glance, and a buyer scanning for
        "which hardware do they make" should see all three answers at once
        rather than hovering to find out.
      */
      flat: true,
      groups: [
        {
          heading: 'PLATFORMS',
          links: [
            { label: 'VIKASANA Control', sub: 'Universal Command & Control', to: '/products/platform' },
            { label: 'VIKASANA Edge', sub: 'Tactical Edge Computing', to: '/products/field-station' },
            { label: 'VIKASANA Core', sub: 'Mission Management & Intelligence', to: '/products/handheld' },
          ],
        },
        {
          /*
            One software product and three hardware products. Everything that
            previously sat here — the plugin catalogue, the SDK entry, and four
            speculative hardware entries — described modules and concepts, not
            things a customer can be shown. Those pages remain live and
            reachable through search; they simply stop being
            listed as products.
          */
          heading: 'SOFTWARE',
          links: [
            { label: 'DRISHTIKON', sub: 'Universal Ground Control & Interoperability', to: '/software/drishtikon' },
          ],
        },
        {
          heading: 'HARDWARE',
          links: [
            { label: 'Rugged Mission PC', sub: 'Portable operator console · GCS-X-L', to: '/hardware/gcs-x-l' },
            { label: 'Tactical Tablet', sub: 'Rugged handheld · GCS-X-H', to: '/hardware/gcs-x-h' },
            { label: 'Edge Compute Module', sub: 'Headless compute node · ECM-X', to: '/hardware/ecm-x' },
          ],
        },
      ],
    },
  },
];

const rightNav = [
  {
    key: 'company',
    label: 'Company',
    to: '/company',
    mega: {
      /*
        Company is the one menu shown flat. Its entries are utility
        destinations — Careers, Contact — that people arrive looking for by
        name. Making someone hover a category to find "Careers" adds a step to
        the shortest journey on the site. Everywhere else the two-level
        browser still applies, because those menus carry 16-19 entries and
        genuinely need thinning.

        A removal, by direction:

        TALK TO SALES. Two adjacent links that both mean "get in touch" is a
        choice the reader has to make before they know which of the two they
        want. Contact Us is the one door.

        That note used to end "and /talk-to-sales still exists as a route,
        reachable from the pages that link to it directly — this removes it
        from the navigation, not from the site." It no longer does: the route
        and its page are both deleted, along with /contact. Corrected rather
        than left standing, because it contradicted the note fifteen lines
        below it and a reader had no way to tell which of the two was current.
      */
      flat: true,
      /* The legal name, by direction, not the wordmark. .meta uppercases it, so
         the source casing here is only what a reader of this file sees. It is
         24 characters against the 8 it replaced and the slot is 3 of 12
         columns, so it sets on two lines — intended: a label that names the
         company in full is worth a second line, and the body beneath it starts
         from the same baseline either way. */
      description: {
        title: 'VIKASANA SYSTEMS PVT LTD',
        body: 'Vikasana is an Indian defence technology company specializing in sovereign mission software, interoperability, and mission computing for modern defence operations.',
      },
      groups: [
        {
          heading: 'COMPANY',
          links: [
            { label: 'About Us', to: '/company' },
            /* CONTACT US, not Locations, and the same page underneath.

               /contact and /talk-to-sales are both gone. This route is the
               only door left on the site that answers "how do I reach these
               people", and a reader looking for that does not open a menu item
               called Locations. The label names the job the page does; it kept
               its URL because renaming a live route is a redirect and a sitemap
               question rather than a navigation one. */
            { label: 'Contact Us', to: '/contact' },
          ],
        },
        {
          heading: 'WORK WITH US',
          links: [
            { label: 'Careers', to: '/careers' },
          ],
        },
      ],
    },
  },
];
const allNav = [...nav, ...rightNav];

/*
  Relative luminance (WCAG) of the first opaque background behind an element.
  Walks up through transparent ancestors, because a section's colour is often
  set on the section while its children are transparent.
*/
function bgLuminance(el) {
  for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
    const raw = window.getComputedStyle(node).backgroundColor || '';
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.%]+))?/.exec(raw);
    if (!m) continue;
    const alpha = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    if (alpha < 0.5) continue;                       // see-through, keep walking up
    const lin = (v) => {
      const c = parseInt(v, 10) / 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(m[1]) + 0.7152 * lin(m[2]) + 0.0722 * lin(m[3]);
  }
  return 0;                                          // nothing opaque found — assume dark
}

/*
  TWO PANEL INKS THAT ARE NOT IN THE PALETTE.

  Both were bare literals at their call sites. Neither has a token whose value
  it equals, and mapping either onto the nearest token would change what
  renders — so they are named here, in the only file that uses them, with the
  measured ratio recorded. Anything that does have a token now uses it.

    --off-white       is #E2E7E4 and MEGA_LINK_INK is not it: the link rows are
                      the panel's primary type and sit one step brighter.
    --text-on-dark-2  is #A3ADAA and PANEL_DESC_INK is not it: the flat panel's
                      description paragraph is a neutral grey, not the site's
                      green-cast one.
*/
const MEGA_LINK_INK = '#FAFAFA';    // 17.95:1 on --ink — mega-menu link rows
const PANEL_DESC_INK = '#A3A3A3';   // 7.43:1 on --ink — flat-panel description body

const MOBILE_MENU_ID = 'vk-mobile-menu';

/* 24×24 minimum target, glyph centred. Shared so the two mobile controls
   cannot drift apart. */
const MOBILE_ICON_BUTTON = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  color: 'inherit',
  minWidth: 24,
  minHeight: 24,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/*
  `variant` SEEDS THE THEME; IT DOES NOT OVERRIDE THE SAMPLER.

  Seventeen pages render <Header variant="light" />. The prop was accepted
  nowhere and silently discarded, and the theme came entirely from luminance
  sampling. It is honoured now, but as the value the bar starts at rather than
  as a permanent override — because a permanent override would be wrong on the
  very pages that pass it. Careers, Company, Contact and their siblings declare
  themselves light and then run dark --ink bands mid-page, and every one of them
  ends in the footer, which is dark on every route. A hard override would paint
  a light bar over those, which is the failure the sampler exists to prevent.

  What the seed buys is the first frame. Sampling now happens after paint (see
  the measurement effect below), so a page that knows its own tone can declare
  it and skip the frame of default-dark that deferral costs. From the first
  measurement onward the sampler owns the value, and pages that pass nothing are
  unaffected.
*/
export default function Header({ variant }) {
  const [openKey, setOpenKey] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pageTheme, setPageTheme] = useState(variant === 'light' ? 'light' : 'dark');
  const barRef = useRef(null);
  const closeTimer = useRef(null);
  const openTimer = useRef(null);
  const reduceMotion = useReducedMotion();
  const loc = useLocation();

  /* The open mega-panel, and the trigger that opened it. Escape has to put
     focus back where it came from, and the panel is not a DOM descendant of the
     trigger, so neither can be found by walking the tree at the time. */
  const panelRef = useRef(null);
  const openTriggerRef = useRef(null);
  const keyboardOpenRef = useRef(false);

  /* Mobile menu: the panel it focuses into, the toggle it returns focus to,
     and what had focus before it opened. */
  const mobilePanelRef = useRef(null);
  const mobileToggleRef = useRef(null);
  const mobileRestoreRef = useRef(null);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
  }, []);

  /* Navigation closes everything, and drops the keyboard bookkeeping with it —
     a pending "focus the panel" flag surviving a route change would steal focus
     into a panel the reader has already left. */
  useEffect(() => {
    setOpenKey(null);
    setMobile(false);
    keyboardOpenRef.current = false;
    openTriggerRef.current = null;
  }, [loc.pathname]);

  /*
    The bar is docked at the top of a page and lifts into a floating panel once
    the page moves — or as soon as it has to present a panel of its own, since a
    flush bar sitting above an inset dropdown reads as two different components.
    rAF-throttled and passive; scroll handlers are not a place to be careless.
  */
  /*
    The bar also adapts to whatever it is currently sitting on. Rather than
    keeping a hand-maintained list of "light pages" — which silently rots the
    moment someone adds a page — it measures the section under the bar and
    reads its background luminance. Pages stay ignorant of the header; the
    header does the work. New pages inherit the behaviour for free.
  */
  /*
    PERFORMANCE — this runs on every scroll frame, and Lenis drives scroll at
    60fps, so what it does per frame matters.

    It used to do all of this per frame: querySelectorAll over the document, a
    getBoundingClientRect on every section, and getComputedStyle walking up
    ancestors. That is a forced synchronous layout plus a style recalculation
    sixty times a second, on a page with seven sections. It was the reason
    scrolling felt stuck.

    Split in two instead. Section geometry and background luminance are static
    between layouts, so they are measured ONCE per route (and on resize) into a
    plain array of document-space offsets. The per-frame path then reads
    window.scrollY, walks that array, and touches the DOM not at all.
  */
  const sectionsRef = useRef([]);
  const barProbeRef = useRef(36);

  /*
    Scroll progress — the orange line along the bottom of the bar.

    TWO REFS, AND THE SPLIT IS THE WHOLE POINT. The scrollable RANGE is a DOM
    measurement, so it is taken in indexSections() alongside the section
    geometry — on mount, on load, on route change and on resize, which is every
    moment it can actually change. The per-frame handler then divides scrollY by
    a number it already has and touches nothing.

    Measuring the range inside the scroll handler instead would read
    scrollHeight on every frame, and scrollHeight forces a synchronous layout —
    which is precisely the cost the note above this block describes paying once
    and never repeating.
  */
  const scrollRangeRef = useRef(1);
  const progressRef = useRef(null);

  const indexSections = useCallback(() => {
    const y = window.scrollY;
    const out = [];
    for (const s of document.querySelectorAll('section, footer')) {
      const r = s.getBoundingClientRect();
      const top = r.top + y;
      out.push({ top, bottom: top + r.height, light: bgLuminance(s) > 0.5 });
    }
    sectionsRef.current = out;

    /* Guarded against zero. A page shorter than the viewport has no scrollable
       range, and dividing by it would make the bar NaN — which CSS discards, so
       the line would silently keep whatever width it last had. */
    scrollRangeRef.current = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );

    const bar = barRef.current;
    if (bar) {
      const b = bar.getBoundingClientRect();
      barProbeRef.current = (b.top + b.bottom) / 2;   // fixed element: viewport-space
    }
  }, []);

  const measure = useCallback(() => {
    const y = window.scrollY;
    /* Parenthesised deliberately. `p === y > 8` parses as `p === (y > 8)`,
       which is what was meant, but the precedence is not obvious on sight. */
    setScrolled((p) => (p === (y > 8) ? p : y > 8));

    /* Probe point in document space. Last match wins, so a nested section
       still beats its parent, exactly as before. */
    const probe = y + barProbeRef.current;
    let light = false;
    for (const s of sectionsRef.current) {
      if (s.top <= probe && s.bottom > probe) light = s.light;
    }
    const next = light ? 'light' : 'dark';
    setPageTheme((p) => (p === next ? p : next));

    /*
      The progress line, written straight to the node.

      NOT REACT STATE. This changes on every scroll frame, and a state update
      would re-render the entire header — five nav items, their dropdowns and
      the search control — sixty times a second to move one line. The value is
      pure presentation and nothing else reads it, which is exactly the case a
      ref exists for.

      scaleX, not width. A transform is composited; a width change is layout,
      inside a position:fixed element that sits above the whole page. The
      transform-origin in the stylesheet is what makes it grow from the left.
    */
    const fill = progressRef.current;
    if (fill) {
      const p = Math.min(1, Math.max(0, y / scrollRangeRef.current));
      fill.style.transform = `scaleX(${p})`;
    }
  }, []);

  /*
    Re-index on route change, and again once images and fonts have settled —
    both change section heights after first paint.

    NOT useLayoutEffect, AND NOT SYNCHRONOUSLY. This was a layout effect, which
    React flushes before the browser paints, so the first frame of every route
    waited on it. What it does is a full-document sweep: querySelectorAll over
    every section and footer, a getBoundingClientRect each, bgLuminance walking
    the ancestor chain through getComputedStyle until it finds an opaque
    background, then documentElement.scrollHeight — which forces layout again —
    and two setState calls. On the home page that is seven sections plus the
    footer, all resolved before the hero, which is the LCP element, could paint.

    None of it is needed before the first paint. The bar is dark while docked
    regardless of what is under it, and the page starts docked, so the only
    thing the pre-paint run could change is the theme of a bar that is already
    at the top of the page. It is deferred to the next frame instead. The cost
    is one frame of the default header theme on routes that do not declare one
    via `variant`; the saving is that the LCP element no longer queues behind a
    document-wide style and layout read.

    The rAF is cancelled on unmount, or a route change during that one frame
    would measure a document the header no longer belongs to.
  */
  useEffect(() => {
    let raf = requestAnimationFrame(() => { raf = 0; indexSections(); measure(); });
    const t = setTimeout(() => { indexSections(); measure(); }, 400);
    const onLoad = () => { indexSections(); measure(); };
    window.addEventListener('load', onLoad);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('load', onLoad);
    };
  }, [indexSections, measure, loc.pathname]);

  useEffect(() => {
    let raf = 0;
    /* Scroll: the cheap path — no DOM reads. */
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; measure(); });
    };
    /* Resize: geometry actually changed, so re-index first. Debounced, because
       a drag-resize fires this continuously and indexing is the expensive half. */
    let rt = 0;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => { indexSections(); measure(); }, 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(rt);
    };
  }, [measure, indexSections]);

  /*
    Published on <html> rather than held in the component: --vk-bar-top drives
    --vk-header-h, which the panels position against. One flag, one source of
    truth, and the bar and its panels can never disagree about where the bar is.
  */
  const presenting = !!openKey || searchOpen || mobile;
  const floating = scrolled || presenting;
  /*
    Theme rule, in priority order:
      docked      always dark. At the top of a page the bar is part of the
                  masthead and reads as a black band regardless of the hero
                  behind it — a white bar over a white hero has no presence.
      presenting  always dark, to match the panel it is carrying. A light bar
                  welded to a dark dropdown is the seam we are closing.
      floating    adaptive. Once the bar has lifted off and is passing over
                  page content, it takes the luminance of what is beneath it.
  */
  const navTheme = (!floating || presenting) ? 'dark' : pageTheme;

  useEffect(() => {
    const el = document.documentElement;
    el.dataset.navFloating = floating ? 'true' : 'false';
    el.dataset.navTheme = navTheme;
  }, [floating, navTheme]);
  useEffect(() => () => {
    delete document.documentElement.dataset.navFloating;
    delete document.documentElement.dataset.navTheme;
  }, []);

  /*
    Global shortcuts: Cmd/Ctrl+K anywhere, and bare "/" when the user is not
    already typing into a field. Both are the conventions people arrive with.
  */
  /*
    NOT WHILE A DIALOG IS OPEN.

    Both shortcuts were bound to window unconditionally and guarded only against
    the user typing into a field. Focus the "REMOVE" button inside the careers
    application modal, press "/", and the search overlay opened on top of it:
    two aria-modal surfaces stacked, each with its own document-level Escape
    handler, and one Escape dismissing whichever of them heard it first.

    The test is a DOM query rather than a piece of shared state, because the
    header has no business knowing that the careers modal exists. Anything that
    declares itself a dialog — this component's own mobile menu and search
    overlay included — suppresses the shortcut for as long as it is mounted.

    It is the LAST test, not the first. This handler sees every keystroke on the
    site, and an unmatched attribute selector walks the whole document before it
    can report nothing; running that per character typed into a contact form
    would be a worse defect than the one it fixes. The two cheap tests decide
    whether a shortcut is in play, and only then does the document get read.
  */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;

      const meta = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const slash = e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey;
      if (!meta && !slash) return;

      if (document.querySelector('[aria-modal="true"], [role="dialog"]')) return;

      e.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Close on route change so a result never leaves the overlay open. */

  /*
    Hover intent. Opening the panel costs the page a floating surface, so we
    wait ~100ms to be sure the cursor is resting on the item rather than
    travelling across it. Once a panel is already open the user has declared
    intent, so moving between top-level items switches instantly — the delay
    would otherwise read as lag.

    The 120ms close grace period is what lets the cursor cross the gap between
    the header and the detached panel without the panel closing underneath it.
  */
  const open = (key) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
    if (openKey) { setOpenKey(key); return; }
    openTimer.current = setTimeout(() => setOpenKey(key), 100);
  };
  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 120);
  };

  /*
    KEYBOARD OPEN AND CLOSE — a second path, alongside hover, not instead of it.

    Hover keeps both timers: the 100ms intent delay and the 120ms close grace
    period that lets the cursor cross the gap to the detached panel. A keypress
    is not an accident and needs neither, so these two clear both timers and
    act immediately. Nothing above this line changed.
  */
  const openNow = useCallback((key, trigger) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
    openTriggerRef.current = trigger || null;
    keyboardOpenRef.current = true;
    setOpenKey(key);
  }, []);

  const closeMega = useCallback((returnFocus) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
    keyboardOpenRef.current = false;
    setOpenKey(null);
    if (returnFocus) openTriggerRef.current?.focus?.();
    openTriggerRef.current = null;
  }, []);

  /*
    Moving focus into the panel is explicit, because the DOM cannot do it.

    In the APG disclosure-navigation pattern the panel is the trigger's next
    sibling, so Tab walks into it for free. Here the panel is a full-width
    floating surface rendered outside the bar entirely — Tab from the Products
    trigger reaches Company first, and only then
    the panel that Products opened. So opening from the keyboard hands focus to
    the panel's first control, and Escape hands it back. The panel is NOT a trap
    once focus is inside it: Tab walks its links in order and then out.
  */
  const focusPanel = useCallback(() => {
    const first = panelRef.current?.querySelector(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    first?.focus();
  }, []);

  useEffect(() => {
    if (!openKey || !keyboardOpenRef.current) return undefined;
    keyboardOpenRef.current = false;
    /* One tick, so the panel has mounted and its first row exists. */
    const t = setTimeout(focusPanel, 20);
    return () => clearTimeout(t);
  }, [openKey, focusPanel]);

  /*
    Escape closes the panel from anywhere inside it and returns focus to the
    trigger. Bound to the document rather than to the panel for the reason
    SearchOverlay records: clicking a non-focusable region of a panel moves
    activeElement to <body>, and a handler on the panel never hears the keypress
    that follows. Not bound while search is open — that overlay owns Escape.
  */
  useEffect(() => {
    if (!openKey || searchOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') closeMega(true); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openKey, searchOpen, closeMega]);

  /*
    Focus leaving the disclosure closes it.

    The check is on <header>, because <header> is the only element that contains
    BOTH halves of the disclosure — the trigger in the bar and the panel below
    it. A blur handler on the trigger alone would fire the moment focus moved
    into the panel, which is the one place it must not close.

    React's onBlur is a focusout and bubbles, so this sees focus leaving any
    descendant; relatedTarget is where focus is going. Inside the header, keep
    the panel open; outside it, or nowhere at all, close.
  */
  const onHeaderBlur = useCallback((e) => {
    if (!openKey) return;
    if (e.currentTarget.contains(e.relatedTarget)) return;
    closeMega(false);
  }, [openKey, closeMega]);

  /*
    MOBILE MENU — brought up to the standard the search overlay and the careers
    modal already meet. It was an unmanaged overlay: no role, no focus move-in,
    nothing keeping Tab inside it, no Escape, no focus restoration, and no
    scroll lock, so the page behind stayed both scrollable and focusable while
    it was open.

    Scroll lock goes through the shared helper rather than setting body overflow
    here. Lenis writes the scroll position itself and ignores overflow, and the
    helper is reference-counted so the menu and the search overlay cannot unlock
    each other's page if both are open.
  */
  useEffect(() => {
    if (!mobile) return undefined;
    lockScroll();
    return unlockScroll;
  }, [mobile]);

  useEffect(() => {
    if (mobile) {
      mobileRestoreRef.current = document.activeElement;
      const t = setTimeout(() => mobilePanelRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
    mobileRestoreRef.current?.focus?.();
    return undefined;
  }, [mobile]);

  const onMobileKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setMobile(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const panel = mobilePanelRef.current;
    if (!panel) return;
    /*
      The toggle is prepended by hand, and it is not an oversight that it sits
      outside the panel: the same button opens and closes the menu, its glyph
      becomes "×" while open, and it is the only close control there is. A cycle
      confined to the panel would make the menu impossible to dismiss with the
      keyboard. It goes first because it is first on screen.

      Enumerated at keypress time rather than cached, as in SearchOverlay — the
      list is long and the panel's contents are not fixed.
    */
    const focusables = [
      mobileToggleRef.current,
      ...panel.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((el) => el && (el.offsetParent !== null || el === document.activeElement));
    if (!focusables.length) return;
    const i = focusables.indexOf(document.activeElement);
    const next = e.shiftKey
      ? focusables[(i <= 0 ? focusables.length : i) - 1]
      : focusables[(i + 1) % focusables.length];
    e.preventDefault();
    next?.focus();
  }, []);

  /* Document-level, and the dependency array is load-bearing for the same
     reason SearchOverlay records: a missing one replaces the listener on every
     render, in the middle of the keydown that caused the render. */
  useEffect(() => {
    if (!mobile) return undefined;
    const handler = (e) => onMobileKeyDown(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobile, onMobileKeyDown]);

  const activeGroup = allNav.find((n) => n.key === openKey);
  const linkActive = (l) => l.to === loc.pathname;
  const isActive = (item) => {
    if (item.to === loc.pathname) return true;
    if (item.mega) {
      return item.mega.groups.some((g) => g.links.some(linkActive));
    }
    return false;
  };

  return (
    <>
      {/*
        Skip link. The mega-menu puts dozens of links between the top of the
        document and the page content, and a keyboard or screen-reader user
        previously had to traverse all of them on every single navigation.
        It is the first focusable element in the document by construction —
        it is rendered before anything else in the header.

        The target is the <main id="main-content"> that each page layout
        renders. Styling lives in index.css (.skip-link): off-viewport until
        focused, then pinned and visible.
      */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/*
        The bar floats: it is the same surface as the dropdown beneath it, inset
        to the same container track, so both share one left and right edge. The
        shell is pointer-transparent and carries no opacity or transform — it
        must not become a backdrop root or the bar's blur dies.
      */}
      <header
        className="vk-bar-shell z-50"
        onMouseLeave={scheduleClose}
        onBlur={onHeaderBlur}
      >
        <div className="vk-bar-track">
        {/* Placement only. Previously justify-between, which spread the three
            groups across the full width and left the nav floating in the
            middle. The bar now packs left and the nav cluster is pushed right
            with ml-auto, so logo and cluster sit at the two ends with one gap
            between them rather than two. No item changed. */}
        <div ref={barRef} className="vk-bar flex items-center">
          {/*
            The logo goes home, from anywhere, every time.

            It used to be a bare <Link to="/">, which failed in the one place a
            reader is most likely to try it: while already on the home page.
            React Router treats a navigation to the current path as a no-op — no
            location change, so the effect that closes the menus never runs and
            ScrollToTop never fires. Click the logo from halfway down the home
            page, or with a menu open, and nothing at all happened. From another
            page it worked, which is why it looked intermittent rather than
            broken.

            onClick handles both halves. The menus are closed synchronously,
            including their pending timers — scheduleClose only sets a timeout,
            and a timeout that fires after navigation can reopen what the
            navigation closed. Then, if we are already home, the default is
            prevented and the page is scrolled to the top instead, which is what
            "take me back to the start" means when there is nowhere to navigate
            to. Everywhere else the Link is left to do its job, and ScrollToTop
            puts the new page at its top.
          */}
          <Link
            to="/"
            className="flex items-center gap-2.5"
            aria-label="VIKASANA — home"
            onMouseEnter={scheduleClose}
            onClick={(e) => {
              if (closeTimer.current) clearTimeout(closeTimer.current);
              if (openTimer.current) clearTimeout(openTimer.current);
              setOpenKey(null);
              setMobile(false);
              setSearchOpen(false);

              if (loc.pathname === '/') {
                e.preventDefault();
                scrollToTop();
              }
            }}
          >
            <img
              /* logo-dark is the light mark, for dark surfaces — same pairing Footer.js uses. */
              src={navTheme === 'light' ? '/assets/img/logo.webp' : '/assets/img/logo-dark.webp'}
              /* Deliberately empty. The link already carries aria-label
                 "VIKASANA — home", which wins over the alt on every screen
                 reader; a non-empty alt here is a second accessible name for one
                 control, and some readers announce both. The image is the link's
                 presentation, so it is marked as such. */
              alt=""
              /* Intrinsic pair, read from the .webp headers. The masthead sets
                 the mark at a fixed 19px with width auto, so until the file
                 decoded the browser had no ratio to work from and reserved no
                 width — a small shift in the top-left corner of every page on
                 the site.

                 The height is a ternary because the two files are not the same
                 shape: logo.webp is 640x67 and logo-dark.webp is 640x70. They
                 already render at different widths once decoded, so a single
                 hard-coded pair would reserve the wrong box for one theme and
                 reintroduce the shift it is here to remove. */
              width={640}
              height={navTheme === 'light' ? 67 : 70}
              /* CSS HEIGHT IS A TERNARY TOO, AND IT IS A CAP-HEIGHT MATCH.

                 The two files are the SAME ARTWORK — measured off the pixels at
                 a common render height, they sit 1% apart on tracking (width
                 per cap height 12.34 against 12.47) and their ink density is
                 identical to two decimal places (31.93% against 31.94%). What
                 differs is the transparent padding baked into each file: 67
                 rows against 70 for the same letterforms.

                 A single CSS height therefore scales the LETTERS differently.
                 At height 19 for both, the mark measured 181px wide on a light
                 nav and 174px on a dark one — a 4% jump in the top-left corner
                 of the page every time the bar crossed a band, which is what
                 read as two different logos.

                 Matching the cap heights instead of the boxes: at a 200px
                 render the caps measure 153px in logo.webp and 145px in
                 logo-dark.webp, so the dark file needs 19 x 153/145 = 20.05px
                 of box to put the same size of letter on screen. At 19 and 20
                 the caps land within 0.2% and the widths within 1.4px.

                 RE-MEASURE IF EITHER FILE IS REPLACED. These two numbers encode
                 the padding of the current exports, not a design decision — a
                 re-export with matched padding makes both 19 again. */
              style={{ height: navTheme === 'light' ? 19 : 20, width: 'auto', display: 'block' }}
            />
          </Link>

          {/* The nav cluster, pushed to the right edge.
              Named, because NotFound.js renders a second <nav aria-label="Suggested
              pages"> and a page with one named and one unnamed navigation gives
              the reader "navigation" and "Suggested pages" to choose between. */}
          <nav aria-label="Main" className="hidden lg:flex items-center gap-10 ml-auto">
            {nav.map((n) => (
              <NavItem
                key={n.key}
                item={n}
                openKey={openKey}
                onOpen={open}
                onClose={scheduleClose}
                onOpenNow={openNow}
                onCloseNow={closeMega}
                onEnterPanel={focusPanel}
                isActive={isActive(n)}
              />
            ))}
          </nav>

          {/* Separator between the section nav and the utility pair, as in the
              reference. currentColor so it follows the bar's light/dark theme
              rather than needing its own value. */}
          <span
            aria-hidden="true"
            className="hidden lg:block"
            style={{ width: 1, height: 20, background: 'currentColor', opacity: 0.22, margin: '0 30px' }}
          />

          {/* Right nav */}
          <div className="hidden lg:flex items-center gap-8">
            <button
              className="anduril-link"
              onMouseEnter={scheduleClose}
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              aria-haspopup="dialog"
            >
              Search
            </button>
            {rightNav.map((n) => (
              <NavItem
                key={n.key}
                item={n}
                openKey={openKey}
                onOpen={open}
                onClose={scheduleClose}
                onOpenNow={openNow}
                onCloseNow={closeMega}
                onEnterPanel={focusPanel}
                isActive={isActive(n)}
              />
            ))}
          </div>

          {/* Mobile: search stays reachable without the keyboard shortcut */}
          <div className="lg:hidden flex items-center gap-4 ml-auto">
            {/*
              colour: inherit — the bar owns the theme colour, these follow it.

              TARGET SIZE. Both were padding:0 buttons wrapped around a 19px SVG
              and a 22px glyph, so the hit area was the glyph, on the surface a
              phone is held at arm's length and tapped with a thumb. The glyphs
              are unchanged; the buttons are now a 24px box centred on them,
              which is the 2.5.8 floor. Nothing moves — the row is centred and
              the extra pixels are distributed around the mark.
            */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              aria-haspopup="dialog"
              style={{ ...MOBILE_ICON_BUTTON }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
            {/*
              The toggle is the menu's only close control, so its name has to
              say which of the two it is about to do. "Menu" was static and told
              a screen-reader user nothing about the state of the thing it
              controlled — and there was no aria-expanded to fall back on.
            */}
            <button
              ref={mobileToggleRef}
              onClick={() => setMobile((m) => !m)}
              aria-label={mobile ? 'Close menu' : 'Open menu'}
              aria-expanded={mobile}
              aria-haspopup="dialog"
              aria-controls={mobile ? MOBILE_MENU_ID : undefined}
              style={{ ...MOBILE_ICON_BUTTON }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{mobile ? '×' : '≡'}</span>
            </button>
          </div>

          {/*
            SCROLL PROGRESS — how far down the page the reader is.

            INSIDE THE BAR, not pinned to the viewport. The bar morphs between
            two states: docked it is flush and edge to edge, floating it lifts
            and pulls in to a rounded pill. A line fixed to the top of the
            screen would stay put while the bar moved away from it, and the two
            would read as unrelated. As a child it travels with the bar, so it
            is the bar's bottom edge in both states.

            aria-hidden and decorative. It reports position, which a scrollbar
            already reports to anything that needs it programmatically; a
            progressbar role here would announce a percentage on every scroll
            frame, which is noise rather than help.

            The track is always visible, faintly. Without it the line has no
            length until the reader scrolls, so at the top of the page there is
            nothing to indicate the thing exists — and a progress indicator that
            only appears once you have made progress is telling you what you
            already know.
          */}
          <span className="vk-bar-progress" aria-hidden="true">
            <span ref={progressRef} className="vk-bar-progress__fill" />
          </span>
        </div>
        </div>

        {/*
          FLOATING PANEL

          The panel is a detached surface, not an extension of the header. The
          positioning wrapper carries the 20px gap as top padding and is
          pointer-transparent, so the page underneath stays fully interactive
          everywhere except the panel itself. Crossing that gap is covered by
          the 120ms close grace period rather than by an invisible hit area.

          Two motion layers: the surface arrives first (fade + 14px downward
          translate), the content follows ~80ms later with a short blur
          reduction. The blur lives on the content layer, never on the surface
          — a `filter` on the surface would create a new backdrop root and
          silently kill its `backdrop-filter`.
        */}
        <AnimatePresence>
          {activeGroup && activeGroup.mega && (
            <motion.div
              key={activeGroup.key}
              ref={panelRef}
              id={`vk-nav-panel-${activeGroup.key}`}
              className="vk-panel-shell"
              onMouseEnter={() => open(activeGroup.key)}
              onMouseLeave={scheduleClose}
            >
              <div className="container-x vk-panel-track">
              <motion.div
                className="vk-panel"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
              <motion.div
                className="vk-panel-content"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, filter: 'blur(5px)' }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <MegaBrowser mega={activeGroup.mega} />

                {/* Footer: contact.

                    The SOCIAL column that sat beside it is removed by
                    direction — see the note in Footer.js. It listed five
                    networks as inert text, two of which (IG, FB) had no icon
                    at all, for a company with no published presence on any of
                    them. */}
                <div className="grid grid-cols-12 gap-8 mt-16 pt-10" style={{ borderTop: '1px solid var(--stone-800)' }}>
                  <div className="col-span-12 md:col-span-4">
                    <div className="meta mb-3" style={{ color: 'var(--text-on-dark)' }}>CONTACT</div>
                    <a href="mailto:info@vikasanasystems.tech" className="text-[15px] hover:text-[color:var(--amber)] transition-colors" style={{ color: 'var(--off-white)' }}>
                      info@vikasanasystems.tech
                    </a>
                  </div>
                </div>
              </motion.div>
              </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Mobile menu — the same floating panel, just a different content set. */}
      <AnimatePresence>
        {mobile && (
          <motion.div className="lg:hidden vk-panel-shell" style={{ zIndex: 40 }}>
            <div className="container-x vk-panel-track">
            {/*
              A dialog, and named as one. Focus moves here on open so the label
              is announced before the list, Tab is held inside the menu and the
              bar's toggle, Escape closes it, and focus returns to the toggle.
              tabIndex -1 makes the surface itself a focus target without adding
              it to the tab order.
            */}
            <motion.div
              ref={mobilePanelRef}
              id={MOBILE_MENU_ID}
              role="dialog"
              aria-modal="true"
              aria-label="Site navigation"
              tabIndex={-1}
              className="vk-panel"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
            <div className="flex flex-col gap-5">
              {allNav.map((n) => (
                <div key={n.key}>
                  <Link to={n.to} className="text-[20px] font-display font-semibold text-white">{n.label}</Link>
                  {/* Mobile keeps the same hierarchy, grouped under its
                      categories rather than flattened into one long list. */}
                  {n.mega && (
                    <div className="mt-3 pl-4 space-y-4">
                      {n.mega.groups.map((g) => (
                        <div key={g.heading}>
                          <div className="meta mb-2" style={{ color: 'var(--text-on-dark-3)' }}>{g.heading}</div>
                          <div className="space-y-2">
                            {g.links.map((l) => (
                              <Link key={l.label} to={l.to} className="block text-[14px]" style={{ color: 'var(--text-on-dark-2)' }}>
                                + {l.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .anduril-link {
          /*
            Mono, uppercase, letterspaced — the same language as .nav-link in
            index.css, .meta, every eyebrow and every button on the site. The
            nav had been the one label-like element set in the body grotesque
            at sentence case, which is why it read as a generic web nav rather
            than as part of this interface.

            12px not 11px, per the note on .meta: 11px reads cramped at desktop
            distance. Tracking is 0.16em rather than 0.2em because five items
            plus Search have to share the bar.
          */
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: currentColor;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          position: relative;
          transition: color 0.25s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .anduril-link:hover { color: var(--text-on-dark-2); }
        .anduril-link.is-open { color: var(--text-on-dark-2); }
        /* On light sections the muted state has to go darker, not lighter. */
        html[data-nav-theme='light'] .anduril-link:hover,
        html[data-nav-theme='light'] .anduril-link.is-open { color: var(--stone-500); }
        html[data-nav-theme='light'] .anduril-link.is-active { color: var(--ink); }

        /*
          THE DISCLOSURE TRIGGER, AND WHY IT IS UNPAINTED FOR A MOUSE.

          The nav item is a link to a real page and a control that opens a
          40-destination panel. One element cannot be both without asking the
          reader to guess which of the two a click will do, so they are
          separate: the <Link> keeps the destination it always had, and this
          button — its own control, with its own accessible name — does the
          disclosure.

          It is absolutely positioned, so it takes no layout space and the bar is
          pixel-identical to what a mouse user saw before. It paints on
          :focus-visible, which is the moment a keyboard user needs it, and it
          paints permanently on any pointer that cannot hover: an iPad in
          landscape is over the lg breakpoint, so it gets the desktop nav and has
          no hover to open the panel with. It stays absolutely positioned there
          too — the nav's 40px gap has room for a 24px control beside the label —
          so the layout does not move on touch either.

          It is in the tab order and the accessibility tree at all times. Only
          its paint is conditional.
        */
        .vk-nav-disclosure {
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 4px;
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          padding: 0;
          color: currentColor;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .vk-nav-disclosure:focus-visible { opacity: 1; pointer-events: auto; }
        @media (hover: none) {
          .vk-nav-disclosure { opacity: 1; pointer-events: auto; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vk-nav-disclosure { transition: none; }
        }

        .anduril-link .dash {
          display: inline-block;
          overflow: hidden;
          max-width: 0;
          opacity: 0;
          transition: max-width 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.25s ease, margin-left 0.35s cubic-bezier(0.16,1,0.3,1);
          white-space: nowrap;
        }
        .anduril-link.is-open .dash {
          max-width: 20px;
          opacity: 1;
        }
        .anduril-link.is-active { color: var(--text-on-dark); }
      `}</style>
    </>
  );
}

/*
  Two-level browser. Column one lists categories and nothing else; column two
  stays empty until the cursor lands on a category. Nothing is preselected —
  a menu at rest is two or three words, and the panel is only as tall as that.

  Same visual language as before: the 17px display face, the amber "+" marker,
  and the existing fade-and-translate. No new motion, only less content.
*/
/* Shared link row, so the flat and browsing layouts cannot drift apart. */
function MegaLink({ l }) {
  return (
    <Link
      to={l.to}
      className="group flex items-start gap-3 text-[17px] font-display transition-colors"
      style={{ color: MEGA_LINK_INK }}
    >
      <span
        className="text-[color:var(--text-on-dark-3)] font-mono transition-colors group-hover:text-[color:var(--amber)]"
        style={{ fontSize: 15, lineHeight: 1.5 }}
      >
        +
      </span>
      <span>
        <span className="block transition-colors group-hover:text-[color:var(--amber)]">{l.label}</span>
        {l.sub && (
          <span
            className="block mt-1"
            style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-on-dark-3)' }}
          >
            {l.sub}
          </span>
        )}
      </span>
    </Link>
  );
}

function MegaBrowser({ mega }) {
  const groups = mega.groups;
  const hasDesc = !!mega.description;

  /* Every destination on screen at once: the menus are short and people
     arrive knowing the name of the page they want. */
  const span = hasDesc ? 'md:col-span-3' : 'md:col-span-4';
  return (
    <div className="vk-mega grid grid-cols-12 gap-8">
      {hasDesc && (
        <div className="col-span-12 md:col-span-3">
          <div className="meta mb-6" style={{ color: 'var(--white)', letterSpacing: '0.2em' }}>
            {mega.description.title}
          </div>
          <p className="text-[14px] leading-relaxed max-w-xs" style={{ color: PANEL_DESC_INK }}>
            {mega.description.body}
          </p>
        </div>
      )}
      {groups.map((g) => (
        <div key={g.heading} className={`col-span-6 ${span}`}>
          <div className="meta mb-6" style={{ color: 'var(--white)', letterSpacing: '0.2em' }}>{g.heading}</div>
          <ul className="space-y-3.5">
            {g.links.map((l) => (
              <li key={l.label}><MegaLink l={l} /></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/*
  A LINK AND A DISCLOSURE, NOT ONE CONTROL DOING BOTH.

  The item was a bare <Link> that opened its panel from onMouseEnter and from
  nothing else. A keyboard user who tabbed to Products got a link to
  /products/platform and no way at all to reach the forty-odd destinations
  behind it; the mobile menu is lg:hidden, so above 1024px there was no fallback
  — including on an iPad in landscape, which has the desktop nav and no hover.

  THE CHOICE. Two patterns were available. A single button that discloses, with
  the landing page demoted to the first row inside the panel, is defensible and
  is what a menu with no real section page would want. This site has real
  section pages — /products/platform, /company — and
  mouse users already reach them by clicking the label. Turning the label into a
  button would take that path away, and every fix here is meant to add a path
  rather than remove one.

  So: link plus adjacent disclosure button, which is also the more common of the
  two. The <Link> is untouched — same element, same class, same destination,
  same hover behaviour. The button beside it carries the entire disclosure
  contract (aria-haspopup, aria-expanded, aria-controls, an accessible name that
  says which menu and which direction) and costs the bar no layout, because
  .vk-nav-disclosure is absolutely positioned. See the note on that rule for why
  it is unpainted for a mouse and painted for a finger.

  Escape is not handled here. It is a document-level handler in Header, because
  it has to work from inside the panel too, and the panel is not a descendant of
  this component.
*/
function NavItem({ item, openKey, onOpen, onClose, onOpenNow, onCloseNow, onEnterPanel, isActive }) {
  const isOpen = openKey === item.key;
  return (
    <div
      className="relative"
      onMouseEnter={() => item.mega ? onOpen(item.key) : onClose()}
    >
      <Link
        to={item.to}
        className={`anduril-link ${isOpen ? 'is-open' : ''} ${isActive && !isOpen ? 'is-active' : ''}`}
      >
        <span>{item.label}</span>
        {item.mega && <span className="dash">&nbsp;&mdash;</span>}
      </Link>

      {item.mega && (
        <button
          type="button"
          className="vk-nav-disclosure"
          aria-haspopup="true"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `vk-nav-panel-${item.key}` : undefined}
          aria-label={`${isOpen ? 'Close' : 'Open'} ${item.label} menu`}
          /* Enter and Space arrive here as a click, which is what a button is
             for, and so does a tap on a device with no hover. A mouse never
             does: the rule keeps this pointer-events: none wherever hover
             exists, so the mouse path is still the label and the panel. */
          onClick={(e) => {
            if (isOpen) onCloseNow(true);
            else onOpenNow(item.key, e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowDown') return;
            e.preventDefault();
            if (isOpen) onEnterPanel();
            else onOpenNow(item.key, e.currentTarget);
          }}
        >
          <svg width="10" height="7" viewBox="0 0 10 7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M1 1.5L5 5.5L9 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
