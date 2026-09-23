import React, { useCallback, useEffect, useMemo, useRef } from 'react';

/*
  FlickeringGrid — a canvas of small squares that individually change opacity.

  PORTED FROM THE SUPPLIED flickering-grid.tsx. Types removed and "use client"
  dropped, as with the other ported components. Four behavioural fixes, all of
  which the original would have shipped silently:

  1. isInView WAS AN EFFECT DEPENDENCY, so the entire setup re-ran every time
     the grid scrolled in or out of view — re-measuring the container,
     re-allocating the Float32Array and re-randomising every square. Visually
     that means the pattern jumps the instant it becomes visible, which is the
     one moment anyone is looking at it. It is a ref now, read by the animation
     loop, so visibility starts and stops the loop without touching the state.

  2. canvasSize WAS REACT STATE that nothing rendered — it was written on every
     resize and read only to set two inline styles the setup function already
     sets. Every resize therefore forced a re-render to change nothing. Gone.

  3. THE FIRST FRAME RANDOMISED EVERYTHING. lastTime started at 0, so the first
     deltaTime was the page's entire uptime in seconds — and the flicker test
     is `random() < chance * deltaTime`, which at a delta of several thousand
     passes for every square. The grid visibly reshuffled once on load. lastTime
     now initialises from the first frame, and delta is clamped so returning to
     a backgrounded tab does not do the same thing.

  4. NO REDUCED-MOTION HANDLING. A field of independently flickering squares is
     exactly what that setting exists to stop. It now paints one static frame
     and never starts the loop — and it keeps watching the query rather than
     sampling it once at setup, so turning the preference on mid-session stops
     this grid within a frame instead of at the next remount, which on a hero
     component never comes.

  ---------------------------------------------------------------------------
  COST, BECAUSE IT IS NOT FREE
  ---------------------------------------------------------------------------
  This fills every square every frame — there is no dirty-rect tracking. At the
  default 4px square on a 6px gap that is one square per 10px in each axis, so a
  1900x800 hero is about 15,000 fillRect calls at 60fps. Workable, but it is the
  reason the call site uses a coarser grid than the demo's defaults, and the
  reason it stops dead when scrolled out of view.

  THE FILLS ARE CHEAP; THE COLOURS WERE NOT. The original assigned a freshly
  built `rgba(r, g, b, 0.1734…)` template string to ctx.fillStyle before every
  single fillRect, which makes the canvas re-run the CSS colour parser once per
  square. On the hardware hero — squareSize 3 on a gridGap 9, so a 12px step
  across roughly 1900x800 — that is ~10,400 colour parses per frame and ~625,000
  per second, and it dwarfed the drawing itself. Opacity is quantised into
  OPACITY_LEVELS steps now and the squares are drawn in bucket order, so
  fillStyle is assigned at most OPACITY_LEVELS times per frame instead of once
  per square. See drawGrid for the ordering pass.
*/

/*
  How many distinct alpha values the field is allowed to use.

  The squares still hold continuous opacities; this only decides how finely the
  draw pass groups them. 32 steps across a maxOpacity of 0.22 is an alpha
  granularity of ~0.007 on a 3px square, which is below the threshold at which
  two adjacent squares can be told apart — the field is visually continuous and
  the colour parser runs 32 times a frame rather than ten thousand.
*/
const OPACITY_LEVELS = 32;

export function FlickeringGrid({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = 'rgb(0, 0, 0)',
  width,
  height,
  className,
  maxOpacity = 0.3,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const inViewRef = useRef(false);

  /* READ THROUGH REFS, NOT AS DEPENDENCIES. Both of these were dependencies of
     the setup effect, so a caller that recomputed either — a theme change, a
     prop that arrives a tick late — tore the whole grid down: new canvas
     backing store, new Float32Array, every square re-randomised. That is a
     visible reshuffle in response to a value that only ever feeds the next
     frame's arithmetic. The animation loop reads the current value each frame
     instead, so a change takes effect on the following frame and disturbs
     nothing. */
  const flickerChanceRef = useRef(flickerChance);
  flickerChanceRef.current = flickerChance;
  const maxOpacityRef = useRef(maxOpacity);
  maxOpacityRef.current = maxOpacity;

  /* The colour strings for the quantised alpha steps, rebuilt only when the
     colour or maxOpacity actually changes rather than per square per frame. */
  const paletteRef = useRef({ prefix: null, max: -1, colors: null });

  /* Resolve any CSS colour to an "rgba(r, g, b," prefix by letting the canvas
     parse it. Kept from the original — it is the one reliable way to accept
     a named colour, a hex or an rgb() without writing a parser.

     CUSTOM PROPERTIES ARE RESOLVED FIRST, and they have to be. A canvas 2D
     context parses CSS COLOURS, not CSS values: assigning `var(--amber)` to
     fillStyle is invalid, and the spec says an invalid assignment is IGNORED
     rather than throwing. fillStyle therefore keeps its previous value —
     #000000 on a fresh context — and the grid silently draws black dots while
     the call site says amber. Nothing errors and nothing warns.

     getComputedStyle on the root resolves the token to the literal the
     stylesheet holds, which the canvas can then parse. Callers can pass a
     token, a hex or a name and all three work. */
  const rgbaPrefix = useMemo(() => {
    if (typeof document === 'undefined') return 'rgba(0, 0, 0,';

    let resolved = color;
    const token = typeof color === 'string' && color.trim().match(/^var\(\s*(--[\w-]+)/);
    if (token) {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(token[1])
        .trim();
      /* An undeclared token computes to an empty string. Falling through to
         the original value would put us straight back into the silent-black
         case, so it is better to keep whatever was passed and let the canvas
         reject it visibly than to pretend it resolved. */
      if (v) resolved = v;
    }

    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext('2d');
    if (!ctx) return 'rgba(0, 0, 0,';
    ctx.fillStyle = resolved;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
    return `rgba(${r}, ${g}, ${b},`;
  }, [color]);

  /* Re-measure and re-allocate.

     PREVIOUS OPACITIES SURVIVE WHERE THE GRID ONLY GREW. Re-rolling every
     square on every resize is what made a drag-resize expensive, but it is also
     wrong on its own terms: widening a window should extend the field, not
     replace it. Squares that existed before keep their value, and only the
     newly exposed columns and rows are randomised. The index maths has to be
     explicit because the array is column-major over `rows`, so a change in
     height moves every element. */
  const setupCanvas = useCallback(
    (canvas, w, h, prev) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const cols = Math.floor(w / (squareSize + gridGap));
      const rows = Math.floor(h / (squareSize + gridGap));
      const count = Math.max(0, cols * rows);
      const squares = new Float32Array(count);
      const maxOp = maxOpacityRef.current;
      const prevCols = prev ? prev.cols : 0;
      const prevRows = prev ? prev.rows : 0;
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rows; j += 1) {
          squares[i * rows + j] = i < prevCols && j < prevRows
            ? prev.squares[i * prevRows + j]
            : Math.random() * maxOp;
        }
      }
      return {
        w,
        h,
        cols,
        rows,
        squares,
        dpr,
        /* Scratch buffers for the bucket ordering in drawGrid. Allocated with
           the grid so the draw pass allocates nothing per frame. */
        bucket: new Uint8Array(count),
        order: new Int32Array(count),
        counts: new Int32Array(OPACITY_LEVELS + 1),
      };
    },
    [squareSize, gridGap],
  );

  /*
    ONE fillStyle ASSIGNMENT PER ALPHA BUCKET, NOT ONE PER SQUARE.

    Squares are counting-sorted by quantised opacity into `order`, then drawn in
    that order, so fillStyle changes at most OPACITY_LEVELS times per frame. The
    sort is three linear passes over the field with no allocation, which is far
    less work than the ~10,400 CSS colour parses it replaces.

    REORDERING THE DRAW IS SAFE because the squares never overlap — the step is
    squareSize + gridGap and gridGap is always positive — so the painter's
    algorithm has nothing to decide and the output is identical bit for bit up
    to the alpha quantisation.

    Bucket 0 is skipped outright: it is alpha 0 on a cleared canvas, so those
    fills produced no pixels and only cost time.
  */
  const drawGrid = useCallback(
    (ctx, canvas, params) => {
      const { rows, squares, dpr, bucket, order, counts } = params;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const count = squares.length;
      const maxOp = maxOpacityRef.current;
      if (!count || !maxOp) return;

      let palette = paletteRef.current;
      if (palette.prefix !== rgbaPrefix || palette.max !== maxOp) {
        const colors = new Array(OPACITY_LEVELS);
        for (let b = 0; b < OPACITY_LEVELS; b += 1) {
          colors[b] = `${rgbaPrefix}${(b / (OPACITY_LEVELS - 1)) * maxOp})`;
        }
        palette = { prefix: rgbaPrefix, max: maxOp, colors };
        paletteRef.current = palette;
      }
      const { colors } = palette;

      const scale = (OPACITY_LEVELS - 1) / maxOp;
      counts.fill(0);
      for (let i = 0; i < count; i += 1) {
        let b = (squares[i] * scale + 0.5) | 0;
        if (b < 0) b = 0;
        else if (b >= OPACITY_LEVELS) b = OPACITY_LEVELS - 1;
        bucket[i] = b;
        counts[b + 1] += 1;
      }
      for (let b = 0; b < OPACITY_LEVELS; b += 1) counts[b + 1] += counts[b];
      /* counts[b] is the write cursor for bucket b and is consumed as it fills;
         after this pass `order` is grouped by bucket in ascending order. */
      for (let i = 0; i < count; i += 1) {
        order[counts[bucket[i]]] = i;
        counts[bucket[i]] += 1;
      }

      const step = (squareSize + gridGap) * dpr;
      const size = squareSize * dpr;
      let current = -1;
      for (let k = 0; k < count; k += 1) {
        const index = order[k];
        const b = bucket[index];
        if (b === 0) continue;
        if (b !== current) {
          current = b;
          ctx.fillStyle = colors[b];
        }
        const col = (index / rows) | 0;
        ctx.fillRect(col * step, (index - col * rows) * step, size, size);
      }
    },
    [rgbaPrefix, squareSize, gridGap],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let raf = 0;
    let params = null;
    let lastTime = 0;
    let resizeTimer = 0;

    const resize = () => {
      const w = width || container.clientWidth;
      const h = height || container.clientHeight;
      if (!w || !h) return;
      /* ResizeObserver fires for changes that do not change our measurement —
         a sub-pixel reflow, a scrollbar appearing on the other axis — and the
         work below is the most expensive thing this component does. */
      if (params && params.w === w && params.h === h) return;
      params = setupCanvas(canvas, w, h, params);
      drawGrid(ctx, canvas, params);
    };

    resize();

    /*
      WATCHED, NOT SAMPLED ONCE. This was read a single time at setup, so a
      visitor who turned reduced motion ON while the page was open kept a 60fps
      canvas until something happened to remount the component — which, on a
      hero, is never. The preference is a live query; treating it as a constant
      means the one user who asked for the animation to stop is the one user it
      does not stop for.

      Same shape as lib/smooth-scroll.js, including the deprecated addListener
      fallback for older Safari, which never shipped addEventListener on
      MediaQueryList. Unlike that module this one is not a singleton — several
      grids can be mounted at once — so the query and its handler live inside
      the effect and are torn down with it.
    */
    const motionQuery = window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    let reduced = motionQuery ? motionQuery.matches : false;

    const animate = (time) => {
      if (!inViewRef.current || !params) { raf = 0; return; }
      /* Clamped. A tab restored after a minute in the background delivers one
         enormous delta, and the flicker test is proportional to it — unclamped,
         every square would re-roll at once and the grid would visibly snap. */
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      lastTime = time;

      const { squares } = params;
      const chance = flickerChanceRef.current * delta;
      const maxOp = maxOpacityRef.current;
      for (let i = 0; i < squares.length; i += 1) {
        if (Math.random() < chance) squares[i] = Math.random() * maxOp;
      }
      drawGrid(ctx, canvas, params);
      raf = requestAnimationFrame(animate);
    };

    const start = () => {
      if (reduced || raf) return;
      lastTime = 0;
      raf = requestAnimationFrame(animate);
    };

    /* raf MUST be zeroed, not merely cancelled. start() treats a non-zero raf
       as "already running" and returns, so a stop that cancels the frame and
       leaves the handle behind makes the restart path permanently dead — a
       worse bug than the one this replaces, and an invisible one, because the
       grid looks exactly like a grid that is correctly holding still. */
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    /* No clear and no redraw: the last painted frame stays on the canvas. A
       field of squares at their current opacities is a legitimate static
       image, and blanking it would remove the element rather than its motion,
       which is not what the preference asks for. Coming back, start() resets
       lastTime, so the first delta is 0 and nothing re-rolls in one jump. */
    const onMotionPreferenceChange = (event) => {
      reduced = event.matches;
      if (reduced) stop();
      else if (inViewRef.current) start();
    };

    if (motionQuery) {
      if (motionQuery.addEventListener) {
        motionQuery.addEventListener('change', onMotionPreferenceChange);
      } else if (motionQuery.addListener) {
        motionQuery.addListener(onMotionPreferenceChange);
      }
    }

    /* DEBOUNCED, because ResizeObserver fires once per frame for the whole of a
       drag-resize and `resize` re-allocates the field. Undebounced, dragging a
       window edge cost a fresh Float32Array plus a full redraw every frame on
       top of the browser's own reflow. The canvas holds its last size until the
       drag settles; at 120ms that is below the point where the lag reads as
       anything, and it is the only moment the trade is visible at all. */
    const ro = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 120);
    });
    ro.observe(container);

    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) start();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    return () => {
      stop();
      if (resizeTimer) clearTimeout(resizeTimer);
      ro.disconnect();
      io.disconnect();
      if (motionQuery) {
        if (motionQuery.removeEventListener) {
          motionQuery.removeEventListener('change', onMotionPreferenceChange);
        } else if (motionQuery.removeListener) {
          motionQuery.removeListener(onMotionPreferenceChange);
        }
      }
    };
  }, [setupCanvas, drawGrid, width, height]);

  return (
    <div ref={containerRef} className={className} aria-hidden="true">
      <canvas ref={canvasRef} className="pointer-events-none block" />
    </div>
  );
}

export default FlickeringGrid;
