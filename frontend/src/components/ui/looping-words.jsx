import React, { useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';

/*
  LoopingWords.

  A fixed window three rows tall, holding a vertical list that steps up by one
  row every three seconds. The middle row is the selected one and is bracketed
  by four corner marks that resize to the width of whatever word is in it.

  PORTED FROM THE SUPPLIED TSX. The changes are listed here rather than left to
  a diff, because each one is a decision:

    - .jsx, not .tsx. This codebase is JavaScript on CRA + craco; there is no
      TypeScript toolchain, so the interface and the type annotations are gone.
    - "use client" dropped. It is a Next.js App Router marker and inert here,
      the same call made in flow-button.jsx.
    - THE CREDITS BLOCK IS REMOVED, by direction.
    - The fade element is gone; see the note on masking in index.css.
    - <section className="cloneable"> is now a <div>. It renders inside the
      hero's own <section>, and a section nested in a section for layout is a
      landmark that describes nothing.

  TWO BUGS FIXED, both of which would have shown on this word list.

  1. currentIndex was a plain `let` in the component body, so every render made
     a new one while the useCallback kept a binding to the first. It worked by
     accident and would have desynchronised the moment anything re-rendered the
     component. It is a ref now, which is what "a mutable value that survives
     renders and does not cause them" actually means.

  2. The loop trick needs the list to be LONGER than the window, and the window
     is three rows. With exactly three words — which is what this hero passes —
     `currentIndex >= totalWords - 3` is true from the first step, and the row
     below the window is empty while the animation runs: a visible gap sliding
     up through the frame every cycle. So a short list is repeated until it is
     at least six items long. The caller passes three words and gets a seamless
     loop; nothing about the call site has to know this.

  TWO LIFECYCLE FIXES, ADDED LATER.

  3. THE TIMELINE RAN FOR THE LIFE OF THE PAGE. `repeat: -1` on the Home hero
     means a step every three seconds forever — two getBoundingClientRect reads
     inside the GSAP ticker and a setState that re-renders the hero — long
     after the reader has scrolled past it. An IntersectionObserver pauses and
     resumes the timeline instead. It drives GSAP directly rather than React
     state: a state-based viewport gate would re-render the hero to stop the
     thing whose re-renders are the cost.

  4. CLEANUP KILLED THE TIMELINE AND NOTHING ELSE. The two gsap.to tweens — the
     list slide and the bracket width — are created by callbacks, not by the
     timeline, so killing the timeline left any tween in flight writing to
     detached nodes after unmount. Everything is created inside a
     gsap.context() scoped to the component root now, and the context is
     reverted on cleanup, which kills whatever it collected regardless of what
     created it.
*/

/*
  HOW MANY ROWS THE WINDOW SHOWS. One: a single word at a time, replaced by the
  next, with no sight of what came before or what is coming.

  The supplied component was built for three, and that number was load bearing
  in two places that do not announce themselves — the row that counts as
  "selected", and the point at which the list reshuffles. Both are derived from
  this constant now, so the window can be resized by changing it here and the
  CSS height to match, rather than by finding the two magic 3s.
*/
const VISIBLE_ROWS = 1;

/* Which row of the window is the selected one. With one row it is the only
   row; with three it was the middle, which is where the original's `+ 1` came
   from. */
const CENTER_OFFSET = Math.floor(VISIBLE_ROWS / 2);

/* The loop works by moving the first item to the end mid-cycle, which needs
   spare list on both sides of the window: one row below so the incoming word
   is never blank, and enough above that the reshuffle has something to move.
   Six is comfortably past that for any ease, including one that overshoots. */
const MIN_ITEMS = 6;

export function LoopingWords({ words, onWordChange }) {
  const rootRef = useRef(null);
  const wordListRef = useRef(null);
  const edgeElementRef = useRef(null);
  const timelineRef = useRef(null);
  const ctxRef = useRef(null);
  const indexRef = useRef(0);

  const onWordChangeRef = useRef(onWordChange);
  onWordChangeRef.current = onWordChange;

  /* Create every tween inside the component's gsap.context.

     The two tweens below are made by callbacks — one from the timeline's
     onStart, one from an effect — so they are created long after the context
     function has returned and gsap has stopped collecting. ctx.add runs a
     function with the context active again, which is the only way a tween born
     in a ticker callback ends up on the list that ctx.revert() kills. Nesting
     one ctx.add inside another is safe: gsap restores the previous active
     context rather than assuming there was none. */
  const inContext = useCallback((fn) => {
    const ctx = ctxRef.current;
    if (ctx) ctx.add(fn);
    else fn();
  }, []);

  /* Repeat a short list rather than asking the caller to pad it. Kept out of
     render state deliberately: it is derived from props and never changes
     between renders for the same props. */
  const baseCount = words ? words.length : 0;
  const items = [];
  if (baseCount) {
    while (items.length < MIN_ITEMS) items.push(...words);
  }
  const totalWords = items.length;
  const wordHeight = totalWords ? 100 / totalWords : 0;

  /*
    Resize the corner brackets to the word now in the selected row.

    IT MEASURES THE <p>, NOT THE <li>, AND THAT IS THE FIX FOR A REAL BUG.

    The supplied component measured `wordList.children[i]` — the list item.
    A list item is block-level and stretches to the width of its container, so
    that measurement returns the width of the whole column no matter which word
    is in it. The ratio it computes is therefore always ~100%, and the brackets
    sit at the full width of the statement rather than around the word: on this
    hero that put the right-hand pair hundreds of pixels out in open desert,
    with nothing between them and the left pair.

    It only looked correct in the original demo because the layout there let the
    item shrink to its content. Measuring the paragraph is correct regardless of
    how the row is laid out, which is what makes it a fix rather than a
    different arrangement that also happens to work.
  */
  const updateEdgeWidth = useCallback(() => {
    const wordList = wordListRef.current;
    const edgeElement = edgeElementRef.current;
    if (!wordList || !edgeElement || !totalWords) return;

    const centerRow = wordList.children[(indexRef.current + CENTER_OFFSET) % totalWords];
    const centerWord = centerRow && centerRow.firstElementChild;
    if (!centerWord) return;

    /*
      REPORT THE SELECTION FROM THE ELEMENT ITSELF, not from a counter.

      This replaces a parallel index that advanced once per step and was
      supposed to stay level with the animation. It did not, and could not be
      relied on to: the loop REORDERS THE DOM as it runs, moving the first row
      to the back every cycle, so a number counting steps and the list it is
      meant to describe are two independent things that only agree while
      nothing interrupts either. A dropped step, a re-run effect, a remount in
      development — any of them and the legend below the hero names one stage
      while the headline shows another, silently and permanently.

      Reading data-word-index off the row that is actually selected removes the
      possibility. The attribute travels with the element through every
      reshuffle, and this is the same element the brackets are being sized to,
      so the legend, the brackets and the word cannot disagree — they are all
      derived from one lookup.
    */
    if (onWordChangeRef.current) {
      const reported = Number(centerRow.dataset.wordIndex);
      if (!Number.isNaN(reported)) onWordChangeRef.current(reported);
    }

    /* As a percentage of the list's width, because the selector is positioned
       against the same box the list fills. An absolute pixel width would be
       correct only at the viewport it was measured on. */
    const centerWordWidth = centerWord.getBoundingClientRect().width;
    const listWidth = wordList.getBoundingClientRect().width;
    if (!listWidth) return;

    /*
      STILL `width`, NOT scaleX, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT.

      A composited scaleX would be cheaper, and it cannot be used here: this
      element's only content is the four corner marks, and they are fixed-size
      children pinned to its edges. Scaling the box scales them with it, so the
      brackets would stretch horizontally by the same factor the selector grows
      — and their border weights are declared in em, so the two vertical strokes
      would thicken while the horizontals did not. Counter-scaling each mark
      means dividing by the live scale every frame from JS, and three of the
      four already carry a rotate(), so the counter-scale would have to be
      applied in a rotated frame. The width tween is the correct shape here.

      IT IS ALSO NOT AS EXPENSIVE AS IT LOOKS. The selector is absolutely
      positioned and pointer-events: none, so the only layout the tween dirties
      is its own box and its four empty children — nothing in flow moves, and
      it runs twice per cycle rather than per frame.
    */
    inContext(() => {
      gsap.to(edgeElement, {
        width: `${(centerWordWidth / listWidth) * 100}%`,
        duration: 0.5,
        ease: 'expo.out',
      });
    });
  }, [totalWords, inContext]);

  const moveWords = useCallback(() => {
    const wordList = wordListRef.current;
    if (!wordList || !totalWords || !baseCount) return;

    indexRef.current += 1;

    inContext(() => {
      gsap.to(wordList, {
        yPercent: -wordHeight * indexRef.current,
        /* NOT elastic.out, which is what the original used. Elastic overshoots
           its target and springs back — in a three-row window that reads as a
           bounce, but in a one-row window the overshoot drags the NEXT word
           into frame and back out again, which is precisely the glimpse this
           layout exists to remove. expo.out arrives fast and stops. */
        duration: 0.9,
        ease: 'expo.out',
        onStart: updateEdgeWidth,
        onComplete: () => {
          /* The seam. Once the window reaches the end of the list, move the
             first item to the back, step the index down to compensate, and snap
             the list to the position that leaves the frame looking identical.
             The reshuffle is invisible because the visible row is unchanged by
             it — only the items outside the window move. */
          if (indexRef.current >= totalWords - VISIBLE_ROWS) {
            wordList.appendChild(wordList.children[0]);
            indexRef.current -= 1;
            gsap.set(wordList, { yPercent: -wordHeight * indexRef.current });
          }
        },
      });
    });
  }, [wordHeight, updateEdgeWidth, totalWords, baseCount, inContext]);

  useEffect(() => {
    if (!totalWords) return undefined;

    /* Honour the OS setting. The rest of this hero collapses its motion under
       prefers-reduced-motion, and a word that changes on its own every three
       seconds is exactly the kind of thing that setting exists to stop. The
       component still renders and the brackets still size — it simply holds on
       the first word. */
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Scoped to the component root so everything gsap creates here — including
       the tweens the ticker callbacks create later, via inContext — is
       collected in one place and can be reverted as a unit. */
    const ctx = gsap.context(() => {}, rootRef.current || undefined);
    ctxRef.current = ctx;

    /* Sizes the brackets AND reports the starting word, so anything driven by
       the selection is in step from the first frame rather than only after the
       first change. Runs under reduced motion too — the cycle stops, the
       selection is still true. */
    ctx.add(() => { updateEdgeWidth(); });

    let io;
    if (!reduced) {
      ctx.add(() => {
        timelineRef.current = gsap.timeline({ repeat: -1, delay: 1 });
        timelineRef.current
          .call(moveWords)
          .to({}, { duration: 2 });
      });

      /* THE VIEWPORT GATE. An IntersectionObserver rather than a React hook:
         pausing the timeline must not itself re-render the hero, and the
         component has no other reason to know where it is on the page. GSAP
         resumes from where it paused, so a reader who scrolls back does not
         land mid-step. */
      const root = rootRef.current;
      if (root) {
        io = new IntersectionObserver(
          ([entry]) => {
            const tl = timelineRef.current;
            if (!tl) return;
            if (entry.isIntersecting) tl.resume();
            else tl.pause();
          },
          { threshold: 0 },
        );
        io.observe(root);
      }
    }

    return () => {
      if (io) io.disconnect();
      ctxRef.current = null;
      timelineRef.current = null;
      /* revert(), not kill(): it also strips the inline styles gsap wrote, so a
         remount starts from the stylesheet's state rather than from wherever
         the last cycle happened to stop. */
      ctx.revert();
    };
  }, [moveWords, updateEdgeWidth, totalWords]);

  if (!totalWords) return null;

  return (
    <div className="looping-words" ref={rootRef}>
      <div className="looping-words__containers">
        <ul className="looping-words__list" data-looping-words-list="" ref={wordListRef}>
          {items.map((word, index) => (
            /* The li carries the same class as the ul, as in the original
               markup. index is a legitimate key here: the list is derived from
               a constant, is never filtered or reordered by React, and the
               reshuffle above is done in the DOM rather than through state. */
            // eslint-disable-next-line react/no-array-index-key
            <li
              key={`${word}-${index}`}
              className="looping-words__list"
              /* Which of the caller's words this row is, surviving the padding
                 repeats and every reshuffle because it rides on the element.
                 This is what updateEdgeWidth reports back — see the note
                 there. */
              data-word-index={index % baseCount}
              /* THE PADDING REPEATS ARE HIDDEN FROM ASSISTIVE TECH. The list is
                 padded to MIN_ITEMS so the loop has spare rows, which means the
                 caller's three words are in the DOM twice. Left exposed, a
                 screen reader announces the heading as "Connect Integrate
                 Operate Connect Integrate Operate" — the padding is an
                 implementation detail of the animation and should not be read
                 aloud as content. The first pass through carries the meaning. */
              aria-hidden={index >= baseCount ? 'true' : undefined}
            >
              <p className="looping-words__p">{word}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* The selected row's corner marks. Width is animated; everything else
          is fixed by CSS. */}
      <div className="looping-words__selector" data-looping-words-selector="" ref={edgeElementRef} aria-hidden="true">
        <div className="looping-words__edge" />
        <div className="looping-words__edge is--2" />
        <div className="looping-words__edge is--3" />
        <div className="looping-words__edge is--4" />
      </div>
    </div>
  );
}

export default LoopingWords;
