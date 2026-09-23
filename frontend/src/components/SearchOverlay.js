import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { SEARCH_INDEX } from '@/data/searchIndex';
import { search, highlight, snippet, TYPE_LABEL } from '@/lib/search';
import { lockScroll, unlockScroll } from '@/lib/smooth-scroll';

/*
  Global search — presentation layer.

  The retrieval engine (lib/search.js), the corpus (data/searchIndex.js) and the
  keyboard model are unchanged. This file only decides how the experience looks:
  a quiet full-screen field with the input as the hero, popular searches before
  typing, and a short results list after.

  Shortcuts stay silent by design. Cmd/Ctrl+K, "/" and Escape all still work —
  the interface simply no longer advertises them, which is what separates a
  considered product from an internal tool.
*/

/* Presentation config, not search data — each chip runs a query rather than
   navigating, so the engine still decides what the answer is. */
const POPULAR = [
  'Command & Control',
  'DRISHTIKON',
  'Edge AI',
  'Autonomous Defence',
  'Sensor Fusion',
  'Knowledge Base',
  'Careers',
  'Mission Systems',
  'ISR',
  'Ground Control',
];

const RESULT_ID = (i) => `vk-search-result-${i}`;

/* Roughly six rows before the list begins to scroll. */
const VISIBLE_ROWS = 6;
const ROW_HEIGHT = 74;

export default function SearchOverlay({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  /* No ref on the close button. There was one — `closeRef` — and nothing ever
     read it: focus on open goes to the input, focus on close is restored to
     whatever opened the overlay, and Tab enumerates the panel's focusables at
     keypress time rather than from a cached pair. A ref that is written and
     never read reads as focus management that is happening somewhere. */
  const panelRef = useRef(null);
  const restoreFocusTo = useRef(null);
  const reduceMotion = useReducedMotion();

  const typing = query.trim().length >= 2;
  const results = useMemo(() => (typing ? search(SEARCH_INDEX, query) : []), [query, typing]);

  useEffect(() => {
    if (open) {
      restoreFocusTo.current = document.activeElement;
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
    restoreFocusTo.current?.focus?.();
  }, [open]);

  /*
    Scroll lock. Routed through the shared helper rather than setting body
    overflow here: Lenis writes the scroll position itself and ignores overflow,
    so a dialog that only sets overflow still lets the page scroll underneath it.
    The helper stops the instance as well, and reference-counts so that two
    overlapping surfaces cannot unlock each other's page.
  */
  useEffect(() => {
    if (!open) return undefined;
    lockScroll();
    return unlockScroll;
  }, [open]);

  useEffect(() => setActive(0), [query]);

  const go = useCallback(
    (item) => {
      if (!item) return;
      onClose();
      const [path, hash] = item.url.split('#');
      navigate(hash ? { pathname: path, hash: `#${hash}` } : path);
    },
    [navigate, onClose]
  );

  const runChip = (term) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const onKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    /*
      Tab is confined to the dialog, but it must reach everything focusable
      inside it. The previous implementation hard-cycled between the field and
      the close button only, which left the popular-search buttons — real,
      clickable controls — permanently unreachable by keyboard, and made
      Shift+Tab behave identically to Tab.

      Enumerating the focusable descendants at keypress time rather than caching
      them keeps this correct as the panel's contents change: the results list
      and the chips swap in and out as the query changes.
    */
    if (e.key === 'Tab') {
      const focusables = Array.from(
        panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!focusables.length) return;
      const i = focusables.indexOf(document.activeElement);
      const next = e.shiftKey
        ? focusables[(i <= 0 ? focusables.length : i) - 1]
        : focusables[(i + 1) % focusables.length];
      e.preventDefault();
      next?.focus();
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(results.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    }
  }, [onClose, results, active, go]);

  /*
    Bound to the document rather than the panel. A handler on the panel only
    sees events that originate from a descendant, and clicking any non-focusable
    region of the dialog moves activeElement to <body> — at which point Escape
    stopped closing the dialog and Tab walked out into the page behind it.

    THE DEPENDENCY ARRAY IS LOAD-BEARING. This effect had none, so React re-ran
    it after EVERY render: each keystroke removed a document-level keydown
    listener and added a fresh one, in the middle of the keydown sequence that
    caused the render. With [open, onKeyDown] and onKeyDown memoised above, the
    listener is replaced only when the handler's own inputs change — which is
    what a stale closure over `results` and `active` would otherwise cost, and
    the reason the handler cannot simply be hoisted out of the component.

    It has to be declared AFTER onKeyDown: a dependency array is evaluated
    during render, and reading a `const` arrow before its initialiser is a
    temporal-dead-zone throw, not an undefined.
  */
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => onKeyDown(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onKeyDown]);

  useEffect(() => {
    listRef.current?.querySelector(`#${RESULT_ID(active)}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const chips = (
    <div className="flex flex-wrap gap-2.5">
      {POPULAR.map((term) => (
        <button
          key={term}
          type="button"
          onClick={() => runChip(term)}
          className="vk-chip"
        >
          {term}
        </button>
      ))}
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" style={{ pointerEvents: 'none' }}>
          {/*
            Click-catcher only. Search is the same floating panel as the
            navigation dropdown, so the page behind stays visible rather than
            being buried under a near-opaque scrim; this layer exists to make
            "click anywhere else to dismiss" work, not to darken anything.
          */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.28)', pointerEvents: 'auto' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Same shell / surface / content layering as the nav panel. */}
          <div className="vk-panel-shell" style={{ zIndex: 1 }}>
            <div className="container-x vk-panel-track">
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Search VIKASANA"
                className="vk-panel vk-search-panel on-dark"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  type="button"
                  className="vk-panel-close"
                  onClick={onClose}
                  aria-label="Close search"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
                  </svg>
                </button>

                <motion.div
                  className="vk-panel-content"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, filter: 'blur(5px)' }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                >
              {/* The field is the hero. */}
              <div className="vk-search-field flex items-center gap-4" style={{ paddingRight: 44 }}>
                {/* --text-on-dark-3, not #5A5A5A. The glyph is the field's only
                    non-textual indication of what the field is for; at 2.72:1 on
                    the panel it was under the 3:1 floor for a meaningful graphic.
                    The token is 4.90:1. */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-on-dark-3)" strokeWidth="1.5" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  role="combobox"
                  aria-expanded={typing && results.length > 0}
                  aria-controls={results.length ? 'vk-search-listbox' : undefined}
                  aria-autocomplete="list"
                  aria-activedescendant={typing && results.length ? RESULT_ID(active) : undefined}
                  aria-label="Search products and knowledge base"
                  placeholder="Search products, knowledge…"
                  className="vk-search-input flex-1"
                />
              </div>

              <div className="vk-search-rule" />

              {/* Live region kept for assistive tech; visually silent. */}
              <div className="sr-only" role="status" aria-live="polite">
                {typing ? `${results.length} results for ${query}` : ''}
              </div>

              <div style={{ marginTop: 26 }}>
                <AnimatePresence mode="wait" initial={false}>
                  {!typing ? (
                    <motion.div
                      key="popular"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                    >
                      <div className="meta mb-4" style={{ color: 'var(--text-on-dark-3)' }}>POPULAR SEARCHES</div>
                      {chips}
                    </motion.div>
                  ) : results.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                    >
                      <div className="font-display" style={{ color: 'var(--off-white)', fontSize: 16 }}>
                        No matching results
                      </div>
                      <div className="meta mt-8 mb-4" style={{ color: 'var(--text-on-dark-3)' }}>POPULAR SEARCHES</div>
                      {chips}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                    >
                      <div
                        ref={listRef}
                        id="vk-search-listbox"
                        role="listbox"
                        aria-label="Search results"
                        style={{
                          maxHeight: VISIBLE_ROWS * ROW_HEIGHT,
                          overflowY: results.length > VISIBLE_ROWS ? 'auto' : 'visible',
                        }}
                        className="vk-search-scroll"
                      >
                        {results.map((item, i) => {
                          const selected = i === active;
                          return (
                            <div
                              key={item.id}
                              id={RESULT_ID(i)}
                              role="option"
                              aria-selected={selected}
                              tabIndex={-1}
                              onMouseEnter={() => setActive(i)}
                              onClick={() => go(item)}
                              className="vk-result"
                              data-selected={selected ? 'true' : 'false'}
                            >
                              <div className="vk-result-title font-display">
                                {highlight(item.title, query).map((r, k) =>
                                  r.hit ? (
                                    <mark key={k} style={{ background: 'transparent', color: 'var(--amber)' }}>{r.text}</mark>
                                  ) : (
                                    <span key={k}>{r.text}</span>
                                  )
                                )}
                              </div>
                              <div className="vk-result-type">{TYPE_LABEL[item.type] || 'Page'}</div>
                              <div className="vk-result-desc">{snippet(item, query, 96)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          <style>{`
            /*
              THE PANEL IS OPAQUE HERE, AND EVERY RATIO BELOW DEPENDS ON IT.

              .vk-panel in index.css is rgba(18,18,18,0.84) over a backdrop-filter
              blur. That is right for the navigation panel, which holds nothing
              below 15px and nothing dim. It is wrong for this one: search is a
              wall of small type — a 10px result type, a 13px description, an 11px
              section label — and 16% of whatever page is behind it bleeds through
              every one of them. On a dark route the measured ratio is the stated
              one; on Home's white bands the effective ground lifts toward #3B3B3B
              and every value below loses roughly a third of its contrast. A
              contrast figure that depends on which page the reader opened search
              from is not a figure at all.

              So this panel, and only this panel, opts out: opaque --ink, which is
              what the @supports fallback in index.css already resolves to for
              browsers without backdrop-filter. The blur goes with it — it has
              nothing left to blur, and it was costing a compositing layer per
              frame of the open animation to produce no visible result. The
              border, radius and shadow are untouched, so the panel still reads as
              the same floating surface.

              This <style> is injected into the body and therefore wins the
              source-order tiebreak against index.css at equal specificity — the
              same mechanism the focus-ring note below records, used deliberately
              this time.
            */
            /*
              THREE NAMES FOR THE PANEL'S OWN DARK CHROME.

              These were literals at their call sites. They are not text and
              carry no state, so no contrast floor applies to any of them, but
              an unexplained hex is a value nobody can safely change. They are
              declared here, on the panel, because that is the only subtree
              that uses them — none belongs in the global palette, where the
              night ramp is already --night through --night-line-strong and a
              fourth, fifth and sixth step would be six values doing the work
              of three.

              Every one is the exact literal it replaces. Nothing renders
              differently.

                --vk-search-rule  #1E1E1E  the divider under the field at rest,
                                           between --night-2 and --night-3, so
                                           it reads as a seam in the panel
                                           rather than a line drawn on it. It
                                           becomes --amber on focus, which is
                                           where the 3:1 indicator floor
                                           applies and is met at 6.52:1.
                --vk-search-thumb #2A2A2A  scrollbar thumb, one step under
                                           --night-line so the track reads
                                           quieter than the panel's borders.
                --vk-search-lift  #3A3A3A  the chip border on hover, one step
                                           over --night-line — the hover state
                                           is the lift, and it is duplicated by
                                           colour and background, so the border
                                           alone is not carrying it.
            */
            .vk-search-panel {
              --vk-search-rule: #1E1E1E;
              --vk-search-thumb: #2A2A2A;
              --vk-search-lift: #3A3A3A;
              background: var(--ink);
              -webkit-backdrop-filter: none;
              backdrop-filter: none;
            }

            .vk-search-input {
              background: transparent;
              border: none;
              padding: 0;
              color: var(--off-white);
              font-family: var(--font-display);
              font-size: clamp(21px, 2vw, 27px);
              font-weight: 500;
              letter-spacing: -0.025em;
            }
            /* --text-on-dark-3 (4.90:1 on --ink), not #4A4A4A (2.11:1). The
               placeholder is the only statement of what this field searches, so
               it is content, not decoration, and takes the 4.5:1 floor. */
            .vk-search-input::placeholder { color: var(--text-on-dark-3); font-weight: 400; }

            /*
              THE BLACK RECTANGLE, AND WHY HALF A SUPPRESSION IS WORSE THAN NONE.

              index.css paints the site's focus ring as TWO layers on
              *:focus-visible — an amber outline at 2px offset, and
              box-shadow: 0 0 0 4px var(--ink) behind it. The two are one
              indicator: the ink band covers light backgrounds, the amber band
              covers dark ones, and together they clear 3:1 on anything.

              This block used to say "outline: none" and nothing else. That is
              the same specificity as *:focus-visible (a pseudo-class counts as
              a class) and this <style> is injected after the stylesheet, so it
              won a source-order tiebreak and deleted the amber HALF of the
              indicator. The ink half survived, and a 4px slab of #121212 drawn
              around a full-width field on a near-black panel is not read as a
              focus ring at all — it is read as a black box that should not be
              there. Which is what it looked like.

              So both layers go, and the indicator moves to the rule under the
              field, below. Suppressing one layer of a two-layer ring is the
              trap index.css already records against .input; this is the second
              time it has been sprung.
            */
            .vk-search-input:focus,
            .vk-search-input:focus-visible {
              outline: none;
              box-shadow: none;
            }

            /*
              The rule under the field IS the focus indicator now.

              It is the right element for it: the input is the only control in
              the panel and is focused the moment the overlay opens, so the
              indicator answers "the field is live", not "which of these is
              selected" — a hairline under the field says that, a slab around
              it does not.

              Amber on this panel measures 6.52:1 — the figure is the flat one on
              --ink now that the panel is opaque, where it used to be 6.46:1
              against a translucent ground and a best case at that. Either way it
              clears the 3:1 that 1.4.11 asks of a non-text indicator; the point
              is that the number no longer depends on the page behind it. The
              second pixel arrives as a
              box-shadow rather than a height change so the divider does not
              move the panel by 1px when the field takes focus.
            */
            .vk-search-rule {
              height: 1px;
              background: var(--vk-search-rule);
              margin-top: 22px;
              transition: background .2s ease, box-shadow .2s ease;
            }
            .vk-search-field:focus-within + .vk-search-rule {
              background: var(--amber);
              box-shadow: 0 1px 0 var(--amber);
            }

            @media (prefers-reduced-motion: reduce) {
              .vk-search-rule { transition: none; }
            }

            .vk-chip {
              /* A chip is a label, and labels are JetBrains Mono per the sheet. */
              font-family: var(--font-mono);
              font-size: 12px;
              letter-spacing: 0.06em;
              /* --text-on-dark-2 is #A3ADAA — the same value this line always
                 carried, now named. 8.13:1 on --ink. */
              color: var(--text-on-dark-2);
              background: transparent;
              border: 1px solid var(--night-line);
              border-radius: 999px;
              padding: 7px 15px;
              cursor: pointer;
              transition: color .18s ease, border-color .18s ease, background .18s ease;
            }
            .vk-chip:hover {
              color: var(--off-white);
              border-color: var(--vk-search-lift);
              background: rgba(255,255,255,0.03);
            }

            .vk-result {
              position: relative;
              padding: 13px 16px 13px 18px;
              cursor: pointer;
              border-left: 2px solid transparent;
              transition: background .16s ease, border-color .16s ease;
            }
            .vk-result[data-selected="true"] {
              background: rgba(255,255,255,0.035);
              border-left-color: var(--amber);
            }
            .vk-result-title {
              color: var(--off-white);
              font-size: 15.5px;
              font-weight: 600;
              letter-spacing: -0.012em;
              line-height: 1.35;
            }
            /* --text-on-dark-3 (4.90:1), not #5A5A5A (2.72:1). This line is the
               only thing that says whether a hit is a product, an insight or a
               careers page, and it is set at 10px in uppercase mono with 0.16em
               tracking — the least legible setting on the site. It does not get
               to be the dimmest colour as well. */
            .vk-result-type {
              font-family: var(--font-mono);
              font-size: 10px;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              color: var(--text-on-dark-3);
              margin-top: 5px;
            }
            /* --text-on-dark-3 (4.90:1), not #7A7A7A (4.36:1 at best, and worse
               in practice while the panel was translucent over a light page). */
            .vk-result-desc {
              font-family: var(--font-sans);
              font-size: 13px;
              color: var(--text-on-dark-3);
              margin-top: 5px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            /* The selected row lifts the snippet one step, which is the same
               gesture as before — #8F8F8F was a hand-mixed value for it. The two
               dark-surface text tokens ARE that pair, so the step is now named:
               --text-on-dark-3 at rest, --text-on-dark-2 (8.13:1) selected. */
            .vk-result[data-selected="true"] .vk-result-desc { color: var(--text-on-dark-2); }

            .vk-search-scroll { scrollbar-width: thin; scrollbar-color: var(--vk-search-thumb) transparent; }
            .vk-search-scroll::-webkit-scrollbar { width: 6px; }
            .vk-search-scroll::-webkit-scrollbar-thumb { background: var(--vk-search-thumb); border-radius: 3px; }
            .vk-search-scroll::-webkit-scrollbar-track { background: transparent; }
          `}</style>
        </div>
      )}
    </AnimatePresence>
  );
}
