import React from 'react';
import Reveal from '@/components/Reveal';
import { FlickeringGrid } from '@/components/ui/flickering-grid';

/*
  ProductHero — the light plate every product page opens on.

  EXTRACTED FROM THE DRISHTIKON PAGE, not copied to three more. Four pages now
  want this treatment; four copies of a hero is four places to fix the next
  time the dot density or the column split changes, and the fourth copy always
  drifts. The CSS is unchanged and still lives under .dk-hero — the class names
  were kept rather than renamed so the extraction is a move rather than a
  rewrite, and the stylesheet's notes stay attached to what they describe.

  ---------------------------------------------------------------------------
  PROPS
  ---------------------------------------------------------------------------
    eyebrow    small label above the wordmark        "MISSION SOFTWARE"
    title      the product name, set as the plate    "DRISHTIKON"
    kicker     the category, lower left              "COMMAND AND CONTROL"
    subtitle   what it is, one line under the kicker
    body       array of paragraphs, lower right
    lifecycle  optional array of words, set as a middot rule under the body

  ---------------------------------------------------------------------------
  WHY THE PLATE IS LIGHT
  ---------------------------------------------------------------------------
  Every other page on the site opens on a photograph or on --ink. These four
  open on near-white with the product name in black, which is deliberate: a
  light plate reads as a DOCUMENT — a datasheet, a specification — where a dark
  photographic plate reads as a FIELD. On a product page the subject is the
  system, not the terrain it is used in.

  It is also the reason the body copy is justified here and ragged everywhere
  else. See the note on .dk-hero__body in index.css.

  ---------------------------------------------------------------------------
  THE TITLE IS SIZED BY ITS OWN LENGTH
  ---------------------------------------------------------------------------
  .dk-hero__title clamps at 9.2vw, which was solved for "DRISHTIKON" — ten
  characters landing at about two thirds of the plate, leaving the right third
  empty on purpose. "VIKASANA CONTROL" is sixteen characters INCLUDING A SPACE,
  so at the same setting it would run past the gutter.

  `titleScale` therefore exists rather than every caller inventing a font size:
  it multiplies the shared clamp through a custom property, so the relationship
  between the four titles stays visible in one place. A two-word product name
  also wants to break after the first word — that is what `title` accepting an
  array is for.
*/

export function ProductHero({
  eyebrow,
  title,
  kicker,
  subtitle,
  body = [],
  lifecycle,
  titleScale,
}) {
  const lines = Array.isArray(title) ? title : [title];

  return (
    <section className="relative overflow-hidden dk-hero">
      <FlickeringGrid
        className="absolute inset-0 z-0"
        squareSize={3}
        gridGap={9}
        color="rgb(24, 24, 24)"
        maxOpacity={0.22}
        flickerChance={0.12}
      />

      {/*
        THE ACCENT, AND WHY IT IS IN THE DOT FIELD RATHER THAN ON THE TYPE.

        --amber is #FF6A00 and this plate is #EDEDEA: 2.45:1. That is under the
        4.5:1 floor for body text AND under the 3:1 allowed for large display
        type, so the accent cannot legally colour the eyebrow, the kicker, or
        any part of the wordmark on this plate. index.css records the same
        finding on .meta-kicker, which resolves to amber on a dark band and to
        grey on a light one for exactly this reason.

        That holds for --amber and only for --amber: --amber-text (#B24700)
        measures 4.72:1 here and would be legal on the type. The composition
        below is a deliberate choice not to use it, not a contrast bar.

        A dot field carries no information, so no contrast floor applies to it.
        This is a second canvas of the same lattice in amber, over the ink one
        — the colour arrives as a tint in the negative space rather than as
        coloured text, which is the one way this palette can put orange on a
        near-white plate without failing an audit.

        MASKED OFF THE COPY. .dk-hero__accent fades it out before it reaches
        the wordmark or either text column, and concentrates it in the upper
        right — the part of the composition that is deliberately empty. A flat
        amber field would tint the paper under the type and cost the headline
        contrast it has none to spare.

        Slower and sparser than the ink layer on purpose: two fields flickering
        at the same rate read as one noisy surface rather than as a texture
        with an accent in it.
      */}
      <FlickeringGrid
        className="dk-hero__accent absolute inset-0 z-0"
        squareSize={3}
        gridGap={9}
        color="var(--amber)"
        maxOpacity={0.55}
        flickerChance={0.07}
      />

      {/* Fades the dot field out from under the type. The texture's job is the
          empty part of the plate — the top and the right. */}
      <div className="dk-hero__wash" aria-hidden="true" />

      <div
        className="relative z-[1] dk-hero__inner"
        style={titleScale ? { '--dk-title-scale': titleScale } : undefined}
      >
        <div>
          <Reveal>
            {/* .amber-tick — the site's existing 8px accent square. Being
                decorative it can carry the colour the eyebrow text cannot, and
                it is the same mark used beside headings elsewhere. */}
            <div className="dk-hero__eyebrow">
              <span className="amber-tick" aria-hidden="true" />
              {eyebrow}
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="dk-hero__title">
              {lines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </h1>
          </Reveal>
        </div>

        <div className="dk-hero__foot">
          <div>
            <Reveal delay={0.12}>
              <div className="dk-hero__kicker">{kicker}</div>
              <p className="dk-hero__sub">{subtitle}</p>
            </Reveal>
          </div>

          <div>
            {/* Spaced by the wrapper rather than by each paragraph's margin.
                Each <p> sits inside its own Reveal, so no two are siblings and
                a :last-of-type rule would match every one of them — which is
                exactly the bug that cost this hero its paragraph gap once. */}
            <div className="dk-hero__paras">
              {body.map((para, i) => (
                <Reveal key={para.slice(0, 24)} delay={0.16 + i * 0.06}>
                  <p className="dk-hero__body">{para}</p>
                </Reveal>
              ))}
            </div>

            {lifecycle && lifecycle.length ? (
              <Reveal delay={0.3}>
                <div className="dk-hero__cycle">
                  {lifecycle.map((w, i) => (
                    <React.Fragment key={w}>
                      {i > 0 ? <span aria-hidden="true" className="dk-hero__dot">·</span> : null}
                      <span>{w}</span>
                    </React.Fragment>
                  ))}
                </div>
              </Reveal>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductHero;
