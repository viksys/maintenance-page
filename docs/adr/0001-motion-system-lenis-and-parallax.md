# ADR 0001 — The motion system: Lenis smooth scrolling and the GSAP parallax layer

- **Status:** Accepted
- **Date:** 2026-08-15
- **Deciders:** VIKASANA Systems engineering
- **Supersedes:** nothing
- **Superseded by:** nothing

---

## Context

During the pre-deployment audit of August 2026, two modules were deleted from the working tree:

| File | What it was |
|---|---|
| `frontend/src/lib/smooth-scroll.js` | A Lenis singleton providing site-wide smooth scrolling, plus the `lockScroll` / `unlockScroll` helpers the modal surfaces depend on |
| `frontend/src/components/ui/parallax-scrolling.jsx` | A GSAP `ScrollTrigger` component driving the four-layer homepage hero plate |

**The deletion was not a decision.** It was a side effect of automated dead-code removal running
concurrently with a rewrite of the homepage hero. Neither file had ever been committed to git and
neither appears in `_backups/`, so no copy survives. The loss was discovered only when the
dependency audit noticed that `gsap` and `lenis` had become unreferenced.

That sequence is the actual problem this record exists to close out. A capability left the product
without anyone choosing to remove it, and the absence was very nearly ratified by silence — the site
still built, all routes still rendered, and nothing in CI would ever have flagged it.

Two further facts shaped the decision:

1. **The homepage hero had already been reimplemented.** `src/pages/Home.js` now drives its parallax
   with framer-motion's `useScroll` / `useTransform`. It works, honours `prefers-reduced-motion`, and
   is not affected by the loss of the GSAP component.

2. **Several audit findings were properties of the deleted Lenis integration**, not of the site:
   - The search overlay's scroll lock set `body { overflow: hidden }` only. Lenis writes the scroll
     position directly and ignores overflow, so the page scrolled underneath the open dialog.
   - `html { scroll-behavior: smooth }` was neutralised only by a class Lenis added on init — and
     Lenis deliberately did not init under reduced motion, so reduced-motion users still got animated
     anchor jumps.
   - The four parallax layers carried an unconditional `will-change: transform` that was never
     released, holding roughly 52 MB of GPU compositor texture for the lifetime of the page.
   - The Lenis teardown set `gsap.ticker.lagSmoothing(0)` globally and never restored it.

So the question was not simply "restore or not". It was whether each capability is worth having, and
if so, whether it should return in the form it had.

---

## Decision

**The two modules are treated separately, because they are separate capabilities that happened to
share a dependency.**

### 1. Lenis smooth scrolling — RESTORED, rebuilt

`src/lib/smooth-scroll.js` is recreated. It is a genuine site-wide capability with real consumers
that had no replacement: route-change scrolling in `App.js`, and the scroll lock in both
`ApplicationModal` and `SearchOverlay`.

It is rebuilt rather than reconstructed, with each of the defects above fixed at the source:

- **Reduced motion is a complete no-op.** Lenis is never constructed; every exported helper falls
  through to the native call, so no caller needs a branch. The preference is watched at runtime via
  `matchMedia`, so changing it in the OS tears down or builds the instance without a reload.
- **`lockScroll` / `unlockScroll` stop the Lenis instance as well as setting body overflow**, and are
  reference-counted so two overlapping surfaces cannot unlock each other's page. Both modals now call
  them instead of touching `document.body.style` themselves.
- **Driven by plain `requestAnimationFrame`, not `gsap.ticker`.** GSAP is no longer a dependency, the
  global `lagSmoothing` mutation is gone, and the raf loop owns its own lifecycle.
- **Teardown fully releases**: cancels the frame, destroys the instance, nulls the singleton, resets
  the lock counter and restores body style. Safe under React StrictMode's double-invoke.
- Touch is deliberately excluded. Mobile browsers implement momentum scrolling in the compositor, off
  the main thread; replacing it with a JS loop is slower and feels wrong to anyone used to the
  platform.

`lenis@1.3.26` returns to `package.json`.

### 2. GSAP parallax component — NOT RESTORED

`src/components/ui/parallax-scrolling.jsx` is not recreated, and `gsap` does not return as a
dependency.

The hero it existed to drive has been reimplemented in framer-motion — a library already in the
bundle for the other 218 animated elements on the site. Restoring the GSAP component would mean one
of two things, and neither is defensible:

- restoring it unused, which is precisely the dead code the audit removed; or
- reverting `Home.js` to consume it, which is a redesign of a working hero, reintroduces the
  unreleased `will-change` cost, and adds a second animation library to do a job the first one is
  already doing.

The capability is not lost. The homepage still has a scroll-linked parallax hero. It is driven by a
different library, with one less dependency and none of the GPU-retention cost.

---

## Consequences

### Positive

- Smooth scrolling is back, and correct under reduced motion for the first time.
- The search overlay's scroll lock genuinely locks — a live defect is closed as a side effect.
- `lockScroll` / `unlockScroll` are now the single owner of body-scroll state. Two components can no
  longer clobber each other's saved styles.
- One animation library instead of two. `gsap` (~70 KB min) does not return.
- No `will-change` is held for the page lifetime.
- The global `gsap.ticker.lagSmoothing` mutation is gone.

### Negative / accepted

- **Smooth scrolling is a JS scroll hijack, and that is a real cost.** It adds a dependency, takes
  main-thread time on every frame during scroll, and overrides a platform behaviour some users
  prefer untouched. It is accepted here because it is part of the site's intended feel, and because
  the reduced-motion path returns full control to anyone who asks for it. It is worth re-examining
  if scroll performance ever becomes a measured problem.
- The hero animation now lives in `Home.js` rather than in a reusable component. If a second page
  ever needs a parallax plate, that logic should be extracted then — not pre-emptively.
- `lenis` is a comparatively young dependency with a small maintainer base. The singleton is confined
  to one module with a narrow exported surface (five functions), so replacing it means rewriting one
  file, not auditing call sites.

### Follow-up actions

1. **Commit the untracked files under `frontend/src/`.** Both lost modules were uncommitted working
   files. `git status` still shows others in the same state. This is the root cause and it is not
   fixed by this ADR.
2. Add the route smoke test to CI (see `DEPLOYMENT_REPORT.md` §7.4). A test that loads each page
   would not have caught this particular loss — the site still rendered — but a bundle-composition
   or dependency-drift check would have.
3. If scroll performance is measured as a problem on low-end hardware, revisit the first negative
   consequence above rather than tuning Lenis parameters.

---

## Options considered and rejected

**Restore both modules exactly as they were.** Rejected: it would have reintroduced four known
defects (the overlay scroll lock, the reduced-motion anchor behaviour, the unreleased `will-change`,
and the unrestored `lagSmoothing`), and would have left two animation libraries doing one job.

**Restore neither, and accept native scrolling.** Tempting, and it was the de facto state for several
hours. Rejected because it makes a design decision by accident, which is exactly the failure this
record exists to prevent. Smooth scrolling is a deliberate part of the site's character and its
removal should be argued for on those terms, not inherited from a tooling mistake. Nothing here
prevents that argument being made later — it would supersede this ADR.

**Replace Lenis with CSS `scroll-behavior: smooth`.** Rejected: it only affects programmatic and
anchor scrolling, not wheel input, so it does not deliver the capability. It is retained for anchor
jumps, and is now correctly disabled under reduced motion.
