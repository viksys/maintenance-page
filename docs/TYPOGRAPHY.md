# TYPOGRAPHY — VIKASANA Systems

**Read this before changing any font, size, weight or tracking anywhere in the
codebase. Then change the token, not the call site.**

This document is the authority on type. `frontend/src/index.css` implements it;
`frontend/public/index.html` loads it. If the three ever disagree, this file is
what was decided and the other two are the bug.

---

## 1. The system — two families, three roles

| Role | Family | Weight | Size | Case | Tracking | Token |
|---|---|---|---|---|---|---|
| **Display** | Inter | 700 | fluid, 28–72px | upper or sentence | `-0.02` to `-0.025em` | `--font-display` |
| **Body / UI** | Inter | 400–600 | 14–19px | sentence | default (do not declare) | `--font-sans` |
| **Label** | JetBrains Mono | 500 | 11–12.5px | UPPER | `+0.2em` | `--font-mono` |

Two families. Not three, not six. Everything with a sentence in it is Inter;
labels are JetBrains Mono.

`--font-display` is an **alias for `--font-sans`**, not a second family. It
exists because roughly 250 call sites read `.h-display` / `.font-display`, and
because if a display face is ever licensed, that alias is the single line that
introduces it site-wide.

---

## 2. Why one sans for both headings and body

Surveyed, August 2026:

| Company | Heading face | Category |
|---|---|---|
| Anduril | Helvetica Now | neutral grotesque |
| Palantir | Univers / Neue Haas–style | neutral grotesque |
| Stripe | Söhne (Klim) | neutral grotesque |
| Linear | Inter / Inter Display | neutral grotesque |
| Vercel | Geist Sans | neutral grotesque |
| OpenAI | OpenAI Sans (was Söhne) | neutral grotesque |

Six companies, six neutral grotesques, and in every case the headline and the
body are **the same family**. Where they ship a monospace at all — Geist Mono,
Anthropic Mono — it is the companion face for code and labels, never the
headline.

The conclusion this site is built on: **hierarchy comes from weight, size, case
and tracking, not from a second typeface.** A neutral face set heavy, uppercase
and tight reads as authority. A characterful face set the same way reads as a
costume.

Inter specifically, because it is the closest widely-available equivalent to the
Helvetica Now that the nearest peer uses, it has real weights across the range,
and it was already the site's body face.

---

## 3. Where monospace is allowed

JetBrains Mono is correct in exactly two situations.

**Labels at 11–12.5px** — `.eyebrow`, `.meta`, `.nav-link`, `.num-tag`,
`.mission-band__tag`, `.hero-flow`, button labels, the skip link. At this size a
fixed advance produces an even rhythm, and that rhythm *is* the effect. It is
what makes the interface read as instrumentation.

**The hero word cycle** — `.looping-words`, at `clamp(44px, 9vw, 150px)`. One
word at a time inside a bracketed fixed-width window. The fixed advance is
load-bearing here, not decorative: the selector brackets are sized from
character count, and `.looping-words` documents the arithmetic. Do not change
this face without re-deriving the size cap.

**Everywhere else it is wrong, and the reason is structural.** A monospace gives
every character the same advance, so at display size the gaps around `I`, `T`,
`.` and word spaces open to the width of a `W` and a sentence reads as ASCII
art. This has been tried twice on this site and reverted twice — once on
`.why-h2` and once on `.mission-band__lede`. Do not try it a third time.

---

## 4. Tracking rules — the sign flips with the face

This trips people up, so it is stated explicitly.

- **Proportional (Inter): negative, and more negative as it grows.** Capitals
  are drawn with generous sidebearings for use in running text; set as a solid
  display block they must be closed up. Roughly `-0.02em` at 30px,
  `-0.025em` at 60px+.
- **Monospace (JetBrains Mono) at label size: strongly positive, `+0.2em`.** The
  face already carries air in the advance; opening it further is what makes a
  label read as a label rather than as small body copy.
- **Body copy: do not declare tracking at all.** Inter's default is correct at
  body size. An undeclared value is the design intent, not an omission.

---

## 5. Confirmed body specification

Approved by the client, and the reference standard for supporting prose:

```
font-family: var(--font-sans);          /* Inter */
font-size:   clamp(16px, 1.2vw, 19px);
font-weight: 400;
line-height: 1.55;
color:       var(--stone-800);
/* no letter-spacing declaration */
```

The floor is 16px rather than a flat 19px because item titles above these
paragraphs bottom out at 21px; held at 19 everywhere, the two would sit two
points apart on a phone and the hierarchy would flatten.

Implemented as `.why-body`. `.copy-body` (14.5–15.5px, `--stone-600`) is the
older, quieter setting still used across ~30 files; migrating it is a separate,
deliberate job — do not change it as a side effect of something else.

---

## 6. History — three failures worth not repeating

Each of these shipped, was rejected on sight, and cost a round trip.

1. **Space Grotesk** — quirky letterforms; read as a design-studio brand rather
   than a defence institution.
2. **Outfit, reached silently via Gilroy** — `--font-display` on `.landing` was
   `'Gilroy', 'Outfit', …`, and Gilroy is a commercial licence that was never in
   the font link. Every Home-page heading therefore set in the fallback while
   the stylesheet appeared to say otherwise. Outfit is geometric — round,
   friendly, generic — which is what made the page read like a journal.
3. **JetBrains Mono at display size** — see §3.

There was also a fourth defect with no visual tell: `.landing` overrode
`--font-sans` to Manrope, so the Home page set its body in Manrope while every
other page set it in Inter. The body typeface changed as a visitor moved between
pages, and nothing in the code said so.

**The lesson underneath all four:** a face named in `index.css` but absent from
`index.html` fails silently to the next name in the stack. It does not error, it
does not warn, and it looks deliberate. Never name a family that is not loaded.

---

## 7. Rules for changing type

1. **Change the token, never the call site.** `--font-sans`, `--font-display`
   and `--font-mono` in `:root` are the only places a typeface may be named.
   There are ~250 `.h-display` / `.font-display` usages; none of them should
   ever need editing.
2. **Never scope a font token to a page or a section.** That is what produced
   two type systems on one site. If a rule is right for one page it is right for
   all of them; if it is not, it is not a font decision.
3. **Adding a family requires all three:** the `<link>` in `index.html`, a token
   in `index.css`, and a row in the table in §1. Miss the first and it fails
   silently.
4. **Deleting a family requires checking consumers first** —
   `grep -r "var(--font-NAME)" src/`. `--font-headline` was carried for a while
   with zero consumers, downloading Chakra Petch for nothing.
5. **Re-derive size caps when heading text changes.** Several headings carry
   arithmetic, not taste: `.looping-words`, `.mission-band__lede` and `.why-h2`
   all document the longest-line calculation that sets their ceiling. One extra
   character can wrap a line and turn a three-line block into four.
6. **Weight, size, case and tracking are the levers.** If a heading is not
   landing, reach for those before reaching for a new typeface. Three of the
   four failures above were solved by changing a face when the real problem was
   a value.

---

## 8. Current load

```
Inter           300, 400, 500, 600, 700, 800
JetBrains Mono  400, 500, 700
```

Nine weight files, two families. (800 is there for .dk-hero__title, the
product-hero wordmark on DRISHTIKON and the three hardware pages. It asked for
800 while only 300-700 were loaded, so the browser was synthesising a fake bold
— a smeared outline rather than a drawn weight.) Down from nineteen files and six families
(Chakra Petch, Inter, JetBrains Mono, Manrope, Outfit, Space Grotesk).

Requested via `<link>` in `index.html` rather than `@import` in the stylesheet
on purpose: an `@import` serialises the request chain — the browser must
download and parse the app CSS before it discovers the font URL — whereas a
`<link>` in the head is found by the preload scanner on the first pass.
