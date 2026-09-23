import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid';
import { FlowButton } from '@/components/ui/flow-button';
import {
  ArchitectureFlow, CommandPath,
} from '@/components/drishtikon/Diagrams';
import { band, DARK_BAND, LIGHT_BAND } from '@/lib/bands';
import EnquiryNote, { EnquiryAddress } from '@/components/EnquiryNote';
import {
  HERO, PLATFORM, PRODUCT_GUIDE, GLANCE, ARCHITECTURE, COMMAND,
  MODULAR, FIELD, GUIDE, MEDIA,
} from '@/data/drishtikon';
import { ProductHero } from '@/components/ui/product-hero';
import {
  IconLayers, IconAutonomy, IconISR, IconCPU, IconShield, IconGlobe,
} from '@/components/Icon';

/* The capability cards' glyphs. The data file names a key; the mapping to a
   component lives here, with the rest of the presentation — the same split
   home.js and Home.js use. */
const PLATFORM_ICONS = {
  layers: IconLayers,
  autonomy: IconAutonomy,
  isr: IconISR,
  cpu: IconCPU,
  shield: IconShield,
  globe: IconGlobe,
};


/*
  /software/drishtikon — the product page.

  ---------------------------------------------------------------------------
  WHAT THIS PAGE IS FOR
  ---------------------------------------------------------------------------
  A decision-maker should know what DRISHTIKON is, why it matters and what it
  does inside a minute. An engineer should reach the download without reading
  anything. Those are the only two jobs.

  The page it replaces ran fourteen sections including a capability table and a
  specification block — documentation on a marketing page. Both are now in the
  product guide, which is where a reader who wants them is already going.

  ---------------------------------------------------------------------------
  SEVEN BANDS, NOT EIGHT
  ---------------------------------------------------------------------------
  The brief lists eight sections and asks that the closing call to action be
  dark. lib/bands.js alternates strictly from a dark hero, so with eight
  sections the call to action lands on a light band.

  Rather than break the alternation — the one thing that module exists to
  prevent — integration, the guide and the product statement share the final
  dark band, separated by rules and space. They are one movement: where to go
  next. The count stays inside the brief's own "6–8 sections maximum".

    0  hero              dark
    1  one glance        light
    2  architecture      dark
    3  command           light
    4  modular           dark
    5  field             light
    6  next steps        dark   — integration · guide · statement

  ---------------------------------------------------------------------------
  ONE IDEA PER SECTION
  ---------------------------------------------------------------------------
  Each band carries a headline, at most three sentences, and one visual that
  does the explaining. Where a section wanted a fourth sentence, that sentence
  went into the guide. If a future edit adds a paragraph here, check first
  whether it is answering "how exactly does it work" — that question belongs
  to the download.

  Copy is in data/drishtikon.js with the rules that constrain it.
*/

/* The ICONS registry is gone with the row it served. It mapped the `icon` key
   on each GLANCE block to a 19px glyph; those four blocks are now schematic
   cells in the capability grid, and a schematic that draws the capability does
   not also need an icon standing for it.

   GLANCE.blocks still carries its `icon` key in data/drishtikon.js. Left
   alone deliberately — the data describes what a block is, and nothing is
   gained by editing four content records to remove a field the page happens
   not to read this month. */

/*
  The accent, resolved for the band it sits on.

  THE REASON THIS FUNCTION WAS WRITTEN NO LONGER HOLDS. It was written when the
  site had one amber, #FF6A00, which measures 2.52:1 on --white; the rule then
  was to keep amber off light bands entirely rather than introduce a second
  value, so the light branch dropped the accent and took the heading colour.

  index.css reversed that on 3 September 2026. There are now two values and the
  band decides: LIGHT_BAND.accent is --amber-text #B24700 at 4.87:1 on --white,
  DARK_BAND.accent is --amber at 6.52:1 on --ink. `tone.accent` is readable on
  either band and this function is no longer a contrast measure.

  It is kept as a VISUAL decision: on a light band these section labels read as
  structure rather than as an accent, which is what the page's quieter light
  sections want. If that is ever revisited, `return tone.accent` is the whole
  change and it is safe on both bands. components/drishtikon/Diagrams.jsx
  carries the same function and the same note; change both or neither.
*/
function markOn(tone) {
  return tone.tone === 'dark' ? tone.accent : tone.heading;
}


/* Section eyebrow: number, label, and a rule to the edge. The page's only
   recurring ornament. */
function Label({ n, children, tone }) {
  return (
    <div className="flex items-center gap-5 mb-10">
      <span className="meta" style={{ color: tone.body }}>{n}</span>
      <span className="meta" style={{ color: markOn(tone) }}>{children}</span>
      <div className="flex-1 h-px" style={{ background: tone.rule }} />
    </div>
  );
}

/* A headline set as one line per string, so a two-line statement breaks where
   it was written to break rather than wherever the column happens to end. */
function Headline({ lines, tone, className = 'fs-h2' }) {
  return (
    <h2 className={`h-display ${className} m-0`} style={{ color: tone.heading }}>
      {lines.map((l, i) => (
        <span key={l} className="block" style={i === lines.length - 1 ? undefined : { opacity: 0.55 }}>
          {l}
        </span>
      ))}
    </h2>
  );
}

/*
  The guide call to action, shown only once the file exists.

  The unpublished state used to route to /contact so a reader could ask for the
  guide. That route is gone and there is no enquiry surface left to send them
  to, so the button renders nothing rather than offering an action that cannot
  be completed. Setting `published` true in data/drishtikon.js restores it as a
  direct download.
*/
function GuideButton({ variant = 'light', className }) {
  if (!PRODUCT_GUIDE.published) return null;
  return (
    <FlowButton
      text={PRODUCT_GUIDE.labelWhenPublished}
      href={PRODUCT_GUIDE.href}
      variant={variant}
      className={className}
      download
    />
  );
}

export default function Drishtikon() {
  /*
    BANDS, WRITTEN OUT.

    Splitting section 01 in two — the architecture figure on paper, the
    capabilities on ink — is what gives this page its rhythm back: before the
    split the figure, the claim and six cards all sat on one light expanse and
    the page read as a single sheet.

      0  hero            the light product plate (ProductHero draws it)
      1  the product     LIGHT  — figure and caption
      2  capabilities    DARK   — the claim and the six cards
      3  architecture    light
      4  command         DARK
      5  modular         light
      6  field           DARK
      7  next            DARK   — runs into the dark footer as one surface
  */
  const B = [band(0), LIGHT_BAND, DARK_BAND, LIGHT_BAND, DARK_BAND, LIGHT_BAND, DARK_BAND, DARK_BAND];

  /*
    THE PAGE TAKES THE BRAND SCOPE, which is what "follow the home page
    template" means in practice.

    .landing redefines --ink, --white, --amber and the two type stacks — see
    the block in index.css. Without it this page resolved --amber to #FFA500
    and --font-display to Space Grotesk, so it was running the site's older
    system while the home page ran the brand sheet. Two pages, two palettes,
    no rule for which is right.

    Adding it here is one class and no other edit: every section below already
    reads those token names, so the orange, the Gilroy/Outfit headings and the
    Manrope body arrive without a single call site changing.

    THE HERO IS UNAFFECTED. .dk-hero states its own colours as literals
    precisely because it is the one light plate on the site and must not follow
    a band token.
  */
  return (
    <div className="landing">
      <Header />
      <main id="main-content" tabIndex={-1}>

        {/* ══ 00 · HERO ═══════════════════════════════════════════════ */}
        {/* The light product plate. Content is in data/drishtikon.js as HERO;
            the reasoning for the treatment — why it is the one light plate on
            the site, why the wordmark is sans — is on the component, which the
            other three product pages share. */}
        <ProductHero {...HERO} />

        {/* The dark band that sat here carried a labelled placeholder, not
            artwork. Removed by direction: an empty frame between the wordmark
            and the first section is a promise the page does not keep. */}

        {/*
          ══ 01 · THE PRODUCT ═════════════════════════════════════════
          One section, not two. "One glance" carried a photograph of the
          console and "The platform" carried a diagram of the architecture;
          both answered the same question — what the product is — and a reader
          had to cross a band boundary to get the second half of the answer.

          THE ARCHITECTURE DRAWING IS NOW THE ONLY FIGURE. It contains the
          console, so the separate console plate is gone rather than shown
          twice on one page.

          THE CLAIM SITS ACROSS THE TOP and the six capabilities run beneath
          it as a grid, so the section reads top to bottom in one column of
          attention rather than as two columns competing for it.
        */}
        <section id="glance" style={{ background: B[1].bg, color: B[1].fg, scrollMarginTop: 88 }}>
          <div className="container-x section-y">
            <Label n="01" tone={B[1]}>The product</Label>

            <Reveal><Headline lines={GLANCE.heading} tone={B[1]} /></Reveal>

            {/* The architecture figure: platforms on the left, the operating
                layer in the middle, what the operator gets on the right. The
                file is transparent, so the band shows through and the drawing
                merges with the page — no frame, no ground of its own. */}
            <Reveal delay={0.08}>
              <figure className="dk-arch">
                <img
                  src={PLATFORM.figure.image}
                  alt={PLATFORM.figure.alt}
                  width="2560"
                  height="1240"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </Reveal>

            {/* The caption. Separated by rules rather than punctuation so it
                reads as a set of terms and not as a sentence; the terms take
                the band's heading colour and the rules its accent. Both are
                set on the item rather than inherited, because .meta carries
                its own `color` in index.css. */}
            <Reveal delay={0.12}>
              <div className="dk-arch__cap flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                {MEDIA.picture.caption.map((t, i) => (
                  <React.Fragment key={t}>
                    {i > 0 && (
                      <span aria-hidden="true" className="meta" style={{ color: B[1].accent }}>|</span>
                    )}
                    <span className="meta" style={{ color: B[1].heading }}>{t}</span>
                  </React.Fragment>
                ))}
              </div>
            </Reveal>

          </div>
        </section>

        {/* ══ 01b · THE CAPABILITIES ═══════════════════════════════════
            On ink, directly under the figure it qualifies. The figure needs
            paper — its own ground is transparent and the drawing is line work
            — and the cards need to stop the page reading as one sheet, so the
            split falls between them. */}
        <section style={{ background: B[2].bg, color: B[2].fg }} className="on-dark">
          <div className="container-x section-y">
            {/* THE CLAIM AND ITS QUALIFIER, one row, not a column beside a
                list. The heading takes five columns and the lead seven, both
                sitting on the same baseline, so the section opens as one
                sentence rather than as a narrow paragraph in a well.

                The lead is ragged-right here, not justified: at this measure
                justification was hyphenating ordinary words mid-column
                ("com-mon"), which is what happens when a justified line has
                too few words to distribute. */}
            <div className="dk-platform">
              <Reveal><h2 className="dk-platform__heading" style={{ color: B[2].heading }}>{PLATFORM.heading}</h2></Reveal>
              <Reveal delay={0.06}>
                <p className="dk-platform__lead" style={{ color: B[2].body }}>{PLATFORM.lead}</p>
              </Reveal>
            </div>

            {/* THE SIX CAPABILITIES AS AN UNEQUAL GRID.

                Four columns; the first and last card take two of them, so the
                two rows do not repeat the same shape six times. That is the
                difference between a grid of facts and a table with rounded
                corners — and the wide cards carry the two broadest claims,
                so the shape follows the content rather than decorating it.

                The component is in components/ui/bento-grid.jsx, written in
                this codebase's idiom: plain JSX, this site's icon set, and
                index.css tokens. */}
            <BentoGrid tone="dark" className="mt-[clamp(40px,4.4vw,72px)]">
              {PLATFORM.items.map((it, i) => {
                const Ic = PLATFORM_ICONS[it.icon];
                return (
                  <BentoCard
                    key={it.t}
                    n={String(i + 1).padStart(2, '0')}
                    title={it.t}
                    description={it.d}
                    colSpan={it.wide ? 2 : 1}
                    icon={Ic ? <Ic width={22} height={22} /> : null}
                  />
                );
              })}
            </BentoGrid>

            {/* The closing line, centred under the grid it summarises. Set in
                --amber-text (#B24700, 4.87:1 on paper) rather than on an
                orange fill: the fill was a block of colour the width of a
                sentence sitting under one column, which read as a stray
                button rather than as the section's last word. */}
            <Reveal delay={0.1}>
              <p className="dk-platform__closing" style={{ color: B[2].accent }}>{PLATFORM.closing}</p>
            </Reveal>
          </div>
        </section>

        {/* ══ 02 · ARCHITECTURE ═══════════════════════════════════════ */}
        <section style={{ background: B[3].bg, color: B[3].fg }}>
          <div className="container-x section-y">
            <Label n="02" tone={B[3]}>Architecture</Label>

            <div className="grid lg:grid-cols-12 gap-x-16 gap-y-10">
              <div className="lg:col-span-5">
                <Reveal><Headline lines={ARCHITECTURE.heading} tone={B[3]} /></Reveal>
                <Reveal delay={0.08}>
                  <p className="copy-body" style={{ color: B[3].body, marginTop: 24, maxWidth: '44ch' }}>
                    {ARCHITECTURE.lead}
                  </p>
                </Reveal>
              </div>
              <div className="lg:col-span-7">
                <ArchitectureFlow stages={ARCHITECTURE.stages} tone={B[3]} />
              </div>
            </div>
          </div>
        </section>

        {/* ══ 03 · COMMAND ════════════════════════════════════════════ */}
        <section style={{ background: B[4].bg, color: B[4].fg }}>
          <div className="container-x section-y">
            <Label n="03" tone={B[4]}>Command</Label>

            <div className="grid lg:grid-cols-12 gap-x-16 gap-y-6 items-end">
              <div className="lg:col-span-6">
                <Reveal><Headline lines={COMMAND.heading} tone={B[4]} /></Reveal>
              </div>
              <div className="lg:col-span-6">
                <Reveal delay={0.08}>
                  <p className="copy-body m-0" style={{ color: B[4].body }}>{COMMAND.lead}</p>
                </Reveal>
              </div>
            </div>

            <div className="mt-14">
              <CommandPath steps={COMMAND.chain} tone={B[4]} />
            </div>

            <Reveal delay={0.1}>
              <p className="meta mt-8 m-0" style={{ color: B[4].body }}>{COMMAND.footnote}</p>
            </Reveal>
          </div>
        </section>

        {/*
          ══ 04 · MODULARITY ══════════════════════════════════════════
          The core across the top, the modules attached beneath it.

          It was a two-column row: heading and lead on the left, a vertical
          tree on the right. Both halves were the wrong shape. The left column
          held four lines of text in a half-page well and the rest of it was
          empty; the tree ran down the right edge with its descriptions pushed
          into the far margin, so the section read as two unrelated blocks with
          a hole between them.

          A module attaches to the core. Drawing the core as a full-width bar
          with the modules hanging off it says that in the layout itself, and
          it uses the width the section already has.
        */}
        <section style={{ background: B[5].bg, color: B[5].fg }}>
          <div className="container-x section-y">
            <Label n="04" tone={B[5]}>Modularity</Label>

            <div className="grid lg:grid-cols-12 gap-x-16 gap-y-6 items-end">
              <div className="lg:col-span-5">
                <Reveal><Headline lines={MODULAR.heading} tone={B[5]} /></Reveal>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <Reveal delay={0.08}>
                  <p className="copy-body m-0" style={{ color: B[5].body, maxWidth: '54ch' }}>
                    {MODULAR.lead}
                  </p>
                </Reveal>
              </div>
            </div>

            {/* The diagram reads bottom-up: five modules sitting on a solid
                core bar, each dropping a riser onto it. The bar is the only
                filled shape here — the modules are type and a line, because
                they are what varies and it is what does not. */}
            <div className="dk-mod">
              <div className="dk-mod__grid">
                {MODULAR.modules.map((m, i) => (
                  <Reveal key={m.t} delay={0.06 + i * 0.06} className="h-full">
                    <div className="dk-mod__cell">
                      <span className="dk-mod__n">{String(i + 1).padStart(2, '0')}</span>
                      <h3 className="dk-mod__t">{m.t}</h3>
                      <p className="dk-mod__d">{m.d}</p>
                      <span className="dk-mod__riser" aria-hidden="true" />
                    </div>
                  </Reveal>
                ))}
              </div>

              {/* The core, last: named on the left, qualified on the right —
                  what they attach to, and that it does not change. */}
              <Reveal delay={0.36}>
                <div className="dk-mod__core">
                  <span className="dk-mod__core-t">{MODULAR.core.name}</span>
                  <span className="dk-mod__core-s">{MODULAR.core.note}</span>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ══ 05 · FIELD ══════════════════════════════════════════════ */}
        <section style={{ background: B[6].bg, color: B[6].fg }}>
          <div className="container-x section-y">
            <Label n="05" tone={B[6]}>Operations</Label>

            <Reveal><Headline lines={FIELD.heading} tone={B[6]} /></Reveal>

            <div className="grid md:grid-cols-3 gap-px mt-14" style={{ background: B[6].rule }}>
              {FIELD.cards.map((c, i) => (
                <Reveal key={c.t} delay={i * 0.07}>
                  <div className="h-full" style={{ background: B[6].bg, padding: 'clamp(24px, 2.4vw, 36px)' }}>
                    <div className="meta" style={{ color: markOn(B[6]) }}>{String(i + 1).padStart(2, '0')}</div>
                    <h3 className="font-display font-semibold m-0" style={{ color: B[6].heading, fontSize: 17, marginTop: 18 }}>{c.t}</h3>
                    <p className="copy-body m-0" style={{ color: B[6].body, marginTop: 10 }}>{c.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* The operations figure. Three DRISHTIKON views — the asset
                list, a vehicle's own page and the live mission map — as one
                object. The file is transparent, like the architecture drawing
                in section 01, so the band shows through and there is no plate
                edge to align: the figure merges with the ink it sits on. */}
            <Reveal delay={0.1}>
              <figure className="dk-arch mt-14">
                <img
                  src={MEDIA.operations.image}
                  alt={MEDIA.operations.alt}
                  width="2000"
                  height="1415"
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            </Reveal>
          </div>
        </section>

        {/* ══ 06 · NEXT — the guide ══════════════════════════════════
            The integration block that opened this band — a headline, a lead
            and a strip of protocol names — is removed by direction. /integration
            is its own page and says all of it properly; a four-line summary
            here was a second front door to one destination, which is the
            duplication the navigation note in Header.js argues against.

            What remains is the page's strongest call to action, running into
            the dark footer as one surface. */}
        <section className="relative overflow-hidden" style={{ background: B[7].bg, color: B[7].fg }}>
          <div className="absolute inset-0 grid-fine-dark opacity-25" aria-hidden="true" />

          {/* — the guide: the page's strongest call to action — */}
          <div className="container-x relative" style={{ paddingTop: 'clamp(40px, 4.5vw, 72px)', paddingBottom: 'clamp(56px, 6vw, 96px)' }}>
            <div style={{ borderTop: `1px solid ${B[7].rule}`, paddingTop: 'clamp(48px, 5vw, 84px)' }}>
              <div className="text-center mx-auto" style={{ maxWidth: '58ch' }}>
                <Reveal>
                  <h2 className="h-display fs-hero-sm m-0" style={{ color: B[7].heading }}>{GUIDE.heading}</h2>
                </Reveal>
                <Reveal delay={0.08}>
                  <p className="copy-body mt-6 m-0 mx-auto" style={{ color: B[7].body, maxWidth: '52ch' }}>{GUIDE.lead}</p>
                </Reveal>
                {/*
                  CONDITIONAL, NOT HOLLOW.

                  This was a flex container holding GuideButton above an email
                  sentence. GuideButton returns null while the guide is
                  unpublished, so what actually rendered was an empty box with a
                  margin and then a line of text — the button layout with a
                  sentence dropped where the button used to be.

                  The two states are now exclusive. Unpublished: the enquiry
                  note is the action. Published: the download is the action and
                  the note goes, because two actions in one centred stack is the
                  doubled call-to-action this band already had once.
                */}
                <Reveal delay={0.14}>
                  <div className="mt-10">
                    {PRODUCT_GUIDE.published ? (
                      <div className="flex flex-wrap justify-center gap-3">
                        <GuideButton variant="dark" />
                      </div>
                    ) : (
                      <EnquiryNote band={B[7]} label="PRODUCT GUIDE" align="center">
                        To request the full product guide, write to{' '}
                        <EnquiryAddress band={B[7]} />.
                      </EnquiryNote>
                    )}
                  </div>
                </Reveal>
              </div>
            </div>
          </div>

        </section>

      </main>
      <Footer variant="dark" />
    </div>
  );
}
