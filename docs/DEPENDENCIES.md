# Dependencies and advisory triage

Last reviewed: 23 September 2026.

This document exists because a defence customer's security assessor will ask two
questions — *what is in the artefact you shipped*, and *what did you do about the
advisories* — and the answer should already be written down rather than
reconstructed under time pressure.

---

## The shipped artefact

Eight runtime dependencies. All pinned to exact versions; no ranges.
Requires Node 20 or newer (`engines.node`), raised from 18.18 on 23 September
2026 because `serialize-javascript` 7.x — the first release carrying the fix for
GHSA-5c6j-r48x-rmvq — declares `node >=20`, and a manifest should not claim
support for a runtime its own build chain cannot start on.

| Package            | Version  | What it does here                                              |
| ------------------ | -------- | -------------------------------------------------------------- |
| `react`            | 18.3.1   | —                                                               |
| `react-dom`        | 18.3.1   | —                                                               |
| `react-router-dom` | 7.18.2   | Client routing                                                  |
| `framer-motion`    | 11.18.0  | All motion except the hero word cycle                           |
| `gsap`             | 3.15.0   | The hero word cycle only (`ui/looping-words.jsx`)               |
| `lenis`            | 1.3.26   | Smooth scroll, single instance (`lib/smooth-scroll.js`)         |
| `clsx`             | 2.1.1    | `cn()` in `lib/utils.js`                                        |
| `tailwind-merge`   | 3.2.0    | `cn()` in `lib/utils.js`                                        |

```
npm audit --omit=dev  →  found 0 vulnerabilities
```

**Ranges are not used.** A caret in a manifest that ships to a defence customer
means the artefact is not reproducible from the manifest alone, and the lockfile
becomes the only record of what actually shipped. `gsap` carried the project's
last caret and has been pinned.

**Nothing is loaded from a third-party origin at runtime** except Google Fonts,
which the Content-Security-Policy permits explicitly and narrowly:
`style-src … https://fonts.googleapis.com` and `font-src … https://fonts.gstatic.com`.
There is no analytics, no tag manager, no CDN script, no embedded map, no chat
widget and no tracking pixel. `connect-src 'self'` means the running page cannot
originate a request to anywhere else even if one were introduced by accident.

---

## The build toolchain

```
npm audit               ->  found 0 vulnerabilities
npm audit --omit=dev    ->  found 0 vulnerabilities
```

Both trees are clean, and both are gated in CI at `--audit-level=low`.

### What this section used to say, and why it was wrong

Until 23 September 2026 this document reported 39 advisories in the build chain
and argued they were acceptable because none of them reaches the shipped bundle.
The second half of that argument still holds and is worth restating precisely:

- A runtime advisory is a vulnerability in code that executes in a visitor's
  browser. There have never been any.
- A build-time advisory is a vulnerability in code that executes on a build
  machine, on input the build machine already controls. It is a supply-chain and
  CI-integrity concern rather than a visitor-facing one — but it is not nothing,
  because build-time code runs with full privileges and writes the artefact.

The first half was wrong. This document asserted that the advisories "cannot be
lifted from inside CRA", and the `overrides` block was described as the furthest
the tree could be pinned forward. Both claims were retired by measurement: the
real count at the start of the pass was **133** (2 low, 11 moderate, 120 high),
not 39, and **all 133 were cleared without leaving Create React App.**

### Root cause of the 120 highs

The `overrides` block was pinning `nanoid` at 3.3.11 while `postcss` 8.5.26 —
the version this project pins deliberately — declares `nanoid ^3.3.17`. The
override was holding a package **below the floor its own consumer requires**.
Roughly a hundred of the highs were `postcss` and its ninety-odd plugin packages
cascading from that single line.

The lesson generalises, and is the reason this section now exists at all: **a
pinned override rots silently.** It is written once against the advisory
database of that day, nothing re-tests it, and it goes on reading as "handled"
long after it has stopped handling anything. The full-tree `npm audit` gate in
CI exists to make that failure loud.

### What is in place now

`package.json` carries an `overrides` block force-resolving 38 transitive
packages to patched versions. It is honoured; an earlier `resolutions` block was
**not** — that is a Yarn field, silently ignored by npm, and this project uses
`package-lock.json`. Verified at the time: `svgo` was pulling `nth-check@1.0.2`
(ReDoS, GHSA-rp65-9cf3-cjxr) despite a `resolutions` entry claiming 2.0.1.

Two pins cross a major version and override a declared range. Both were checked
against the actual call site rather than assumed compatible:

- **`uuid` 11.1.1** — `sockjs` calls only `require('uuid').v4()` with no
  arguments, and uuid 11 exports `v4` from its CJS build.
- **`@tootallnate/once` 2.0.1** — v2 sets `__esModule` and `exports.default`,
  which is exactly what `http-proxy-agent`'s `__importDefault` expects.

`js-yaml` uses npm's **scoped** override form: 4.3.2 globally, but 3.15.2 under
`@istanbuljs/load-nyc-config`, which calls `yaml.safeLoad` — removed in js-yaml
4. A flat pin would have cleared the advisory and broken coverage runs in the
same edit.

`react-scripts` itself was moved from `dependencies` to `devDependencies` in an
earlier pass. It is a build tool and contributes nothing to the bundle; having it
declared as a runtime dependency made `npm audit --omit=dev` report the entire
webpack-4 tree as production surface. The `installCommand` in `vercel.json` is a
plain `npm ci`, which installs devDependencies, so the build is unaffected.

### The real fix, and when to take it

Migrate off Create React App to Vite.

`react-scripts@5.0.1` has had no release since December 2021 and the React team
has formally deprecated Create React App. Clearing 133 advisories by hand is
evidence that the tree CAN be held clean from inside CRA, not evidence that
doing so indefinitely is wise: every pin is a line somebody has to re-test, and
the next hundred-package cascade is one stale override away.

Migration clears the class rather than the instances, and it gets cheaper the
sooner it happens: the application is a small set of static routes with no data
layer, no server rendering and no framework-specific API surface, so it is a
build-configuration change rather than a rewrite. It is the first item on the
post-launch roadmap.

Until then, the position is: both trees clean and provably so, and both gated in
CI on every pull request at `--audit-level=low`. Neither audit is informational
any more — the full-tree step lost its `|| true` in the same pass that cleared
the tree, because a step that tolerates everything reports nothing.

---

## Removed in the 3 September 2026 hardening pass

| Package                    | Why                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dotenv`                   | `craco.config.js` called `require("dotenv").config()` to re-read a `.env` file that Create React App has already loaded through its own `config/env.js` before craco is read. The call had no unique effect.                                                  |
| `eslint-plugin-jsx-a11y`   | Already a dependency of `eslint-config-react-app`.                                                                                                                                                                                                          |
| `eslint-plugin-react-hooks`| Same — and declared here at 5.2.0 against a config that accepts `^4.3.0`, which forced npm to install a second nested copy. Two copies of one plugin resolved by different paths is what makes ESLint abort with `Plugin "react-hooks" was conflicted between…`. |

The `@emergentbase/visual-edits` integration in `craco.config.js` was also
deleted: the package was never in `package.json`, and the `require` was wrapped
in a `try/catch` that swallowed `MODULE_NOT_FOUND` and printed a warning on
every dev start.

A FastAPI + MongoDB backend (`backend/`) was deleted in the same pass. It was
platform scaffolding — a "status check" endpoint nothing called — and it carried
28 unaudited Python dependencies plus a `CORSMiddleware` configured with
`allow_origins=['*']` and `allow_credentials=True`. It was not deployed by
`vercel.json`, so it was never a live exposure; it was a misconfiguration one
deployment decision away from being one.

---

## Reviewing this document

Re-run the triage and update the date whenever any of the following happens:

- `npm audit --omit=dev` stops reporting zero. **That is a release blocker**, not
  a note to file — it means something entered the artefact.
- A runtime dependency is added, removed or changed.
- The migration off Create React App lands, at which point most of this document
  should be deletable.
