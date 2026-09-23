import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import LogoCarousel from '@/components/LogoCarousel';
import { FlowButton } from '@/components/ui/flow-button';
import { LoopingWords } from '@/components/ui/looping-words';
import { HoverRevealCards } from '@/components/ui/hover-reveal-cards';
import {
  IconAir, IconGround, IconMaritime, IconISR, IconCounter, IconAutonomy, IconComms,
} from '@/components/Icon';
import {
  ECOSYSTEM, WHY_VIKASANA, CAPABILITIES, PARTNER_LOGOS,
} from '@/data/home';

/* Two page tones, named once. Every section below picks one of these rather
   than restating a hex, so the alternation can be re-ordered without hunting
   for colour literals. */
const DARK = 'var(--ink)';
const LIGHT = 'var(--white)';

/* The hero statement, as an ordered sequence rather than a set of words.

   DECLARED ONCE AND SHARED. The cycling headline and the legend beneath it are
   two renderings of the same thing; if they were written out separately, an
   edit to one would silently put them out of step — the big word would say one
   thing while the legend highlighted another, which is a worse failure than
   either being wrong on its own.

   The ORDER is the content. These are stages, not options. */
const HERO_FLOW = ['Connect', 'Coordinate', 'Operate'];

/*
  Hero scrim.

  The stop values are measured rather than judged by eye, and the measurement
  is repeatable: scripts/check-hero-contrast.py parses these two strings,
  composites them over every pixel of the plate that sits under type, and
  reports the worst case for each colour the hero uses. Editing a stop without
  re-running it is how a hero ends up unreadable on one screen in ten.

  BOTH ARE VERTICAL, because this plate has no dark side to exploit. Measured
  on the file, mean column luminance runs 96, 103, 107, 120, 116, 113, 104, 93,
  95, 95 from left to right — a spread of 27 points across the whole frame,
  which is flat. A directional wash needs a dark end to hide in; on a flat
  photograph it is just a rectangle of shade with a visible diagonal.

  The variation this plate does have is vertical, and it is large: rows run 178
  and 187 across the top two tenths, then drop to around 100 and stay there.
  That top band is open sky, which is both the brightest thing in the frame and
  the least interesting, so a top-heavy gradient covers exactly what can afford
  to be covered.

  IT ALSO CARRIES THE MASTHEAD. The docked navigation bar is transparent over
  this hero, so the first stop is not sized for the headline — it is sized for
  the nav labels over open sky, the highest number anywhere on the plate.

  THE WHOLE THING CAME UP BY ABOUT TWENTY POINTS, and the reason is a change of
  palette rather than a change of nerve. The binding colour used to be a 12px
  #FFA500 button label sitting directly on the photograph, which needed the
  plate at 73/255 or darker underneath it — so the scrim ran 0.76 to 0.88 and
  the hero read as a photograph behind a grey sheet. The brand sheet's buttons
  are filled, so their labels sit on their own colour and ask nothing of the
  plate at all. What is left over the photograph is #F1F0F0 at body size, which
  needs 107 — and #FFFFFF at display size, which needs 152. Both are far easier
  than what they replaced, and the stops below are what those numbers allow
  with a margin, not a guess at what looks bright enough.

  This is the general shape of the thing: the scrim is a consequence of the
  lightest small text on the plate. To brighten a hero, move that text onto a
  fill rather than pushing the wash down and hoping.

  IT CAME UP AGAIN, BY ANOTHER EIGHT POINTS, when the statement became the word
  cycle. The subtitle went with the old headline, so the last body-sized text
  over the photograph was gone and with it the 107 ceiling it imposed. What
  remains on the plate is #FFFFFF at display size, which only needs 152, and
  the nav labels across the top, which need 107 over the brightest band in the
  frame. The masthead is therefore the binding constraint now, and it is the
  reason the first stop is still the heaviest one.

  There is not much left after this. The nav labels measure 5.46:1 against a
  4.5 floor at these values; roughly four more points of alpha and the masthead
  fails. Past that the honest lever is the palette, not the wash — a lighter
  nav label would buy the whole plate several points more.

  Below 900px the phone crop is taken from x 593-1345, a slice with the same
  bright sky across its top, so mobile uses the same shape a little heavier.

  Each value is the opacity at which the worst pixel in that band still clears
  WCAG AA: 4.5:1 for body-sized text, 3:1 for display type. The margin is a few
  points. Darker buys nothing and costs the image.

  THE BUTTON LABEL SETS THE FLOOR, not the headline. #D9B07A is a muted amber
  at body size, so it needs 4.5:1 where the headline — near-white and ~31px —
  only needs 3:1. The headline measures 11.4:1 against the button label's 4.8:1
  at the same stops: nine tenths of this wash exists for two short lines of
  small amber type. Lightening the labels toward cream is the lever that would
  let the whole plate come up.

  Top to bottom, not on an angle: contrast was measured along that axis, and a
  tilted gradient would put a different opacity over the type than the one that
  was checked.
*/
const HERO_SCRIM = {
  desktop:
    'linear-gradient(to bottom, rgba(18,18,18,0.58) 0%, rgba(18,18,18,0.54) 14%, rgba(18,18,18,0.50) 34%, rgba(18,18,18,0.52) 60%, rgba(18,18,18,0.50) 82%, rgba(18,18,18,0.46) 100%)',
  mobile:
    'linear-gradient(to bottom, rgba(18,18,18,0.62) 0%, rgba(18,18,18,0.58) 20%, rgba(18,18,18,0.56) 50%, rgba(18,18,18,0.54) 100%)',
};

/*
  The floor gradient, as values rather than as a literal in the JSX.

  It exists to seat the bottom edge of the plate against the dark band below
  it. It was also the single heaviest thing on the image: 0.80 over the bottom
  38%, which is exactly where the ground mesh network sits. The plate's whole
  subject is that network, so a wash that erases it defeats the photograph.

  check-hero-contrast.py carries the same two numbers as FLOOR_PEAK and
  FLOOR_START. They are duplicated, not shared, because the script reads the
  file as text rather than importing it — so if either moves here, move it
  there in the same commit or the check silently measures a hero that no
  longer exists.
*/
const HERO_FLOOR = {
  /* Where the fade begins, as a fraction down the section. */
  start: 0.74,
  /* Alpha at each step, measured as a fraction UP from the bottom edge. The
     first pair is the one that matters: 1.00 at position 0 means the plate is
     fully --ink at its own bottom edge, which is the same colour as the band
     below it. Anything less leaves a visible horizontal join.

     It was previously a two-stop ramp peaking at 0.42, which composited with
     the scrim's 0.30 tail to 0.594 — so the plate ended at 59% ink against a
     section at 100%, a step of 0.41. That is the seam.

     The intermediate stops are an ease rather than a straight line. A linear
     ramp to full ink over this distance reads as a grey band with two edges of
     its own, which trades one visible join for two. */
  stops: [
    [0.00, 1.00],
    [0.10, 0.92],
    [0.25, 0.70],
    [0.45, 0.42],
    [0.68, 0.18],
    [1.00, 0.00],
  ],
};

/* The stop list above, rendered as the CSS gradient. Generated rather than
   written out twice so the numbers cannot drift from the ones the contrast
   check reads. */
const HERO_FLOOR_CSS = `linear-gradient(to top, ${HERO_FLOOR.stops
  .map(([pos, a]) => `rgba(13,15,16,${a}) ${(pos * 100).toFixed(1)}%`)
  .join(', ')})`;

/* Capability icon registry. The data file stores a key; the mapping to a
   component lives here, with the rest of the presentation. */
const CAP_ICONS = {
  air: IconAir,
  ground: IconGround,
  maritime: IconMaritime,
  isr: IconISR,
  counter: IconCounter,
  autonomy: IconAutonomy,
  comms: IconComms,
};


/*
  Home — the entry page.

  Structure, in order: hero, our ecosystem, why VIKASANA, operating across
  domains, trusted integrations, contact. Light and dark bands alternate; the
  two tones are named once at the top of this file.

  Sections set aside when the page was rebuilt to the approved mockups —
  challenges, the offer carousel, application areas, values, and the inline
  contact form — are NOT deleted. Their content is still in data/home.js and
  their components are still in components/home/, so restoring any of them is
  a matter of adding a JSX block back rather than rewriting anything.

  Content lives in data/home.js. Nothing on this page states a capability
  beyond current integration state, and the company is introduced before any
  product name appears (MASTER_CONTEXT §21).
*/

/* --------------------------------------------------------------------------
   HeroActions — the page's call to action.

   ONE CALL SITE: the foot of the hero. It was briefly rendered at the foot of
   the architecture section as well, and that is gone — the same destination
   offered twice within a screen and a half is not twice the invitation.

   Still exported rather than local. It was exported originally so that nothing
   pruned it while it sat unrendered; the reason now is that a single call site
   is one edit away from none, and a component that is obviously offered by this
   module survives that better than a private function does.

   IF IT MOVES OR GAINS A SECOND BUTTON, re-point the BUTTONS region in
   scripts/check-hero-contrast.py. That region describes where the label sits on
   the photograph, and a region aimed at a band nothing occupies reports a pass
   that means nothing. It has been wrong twice already for exactly this reason.
-------------------------------------------------------------------------- */
/*
  ONE BUTTON, IN THE OUTLINE TREATMENT.

  It has been through three shapes, and each removal was deliberate rather than
  a simplification for its own sake:

    a filled #FF6A00 primary beside an outlined secondary — the conventional
      pair. The fill was the heaviest object on the plate by a wide margin and
      sat over the photograph's subject.
    two identical outlines — quieter, but with the ranking gone. Two equal
      buttons are two equal offers, and their order was the only thing left
      saying which mattered.
    one. Nothing to rank.

  What it costs is a second route off the first screen, which is a
  deliberate trade for a single clear action.

  THE NAME IS STILL PLURAL, and left that way on purpose: this is the hero's
  action area rather than a wrapper for one specific button, and a section that
  wants a second action should add it here rather than inventing a parallel
  component beside it.
*/
const HERO_ACTION_STYLE = {
  '--fb-edge': 'rgba(241,240,240,0.5)',
  '--fb-ink': 'var(--text-on-dark)',
  '--fb-fill': 'var(--text-on-dark)',
  '--fb-on-fill': 'var(--ink)',
};

function HeroActions({ className = 'stack-cta flex flex-wrap gap-4', style }) {
  return (
    <div className={className} style={style}>
      <FlowButton to="/software/drishtikon" text="Explore DRISHTIKON" variant="light" style={HERO_ACTION_STYLE} />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Hero. A photographic plate holding the full first screen, with the statement
   set over it.

   The hero was previously a white drafting ground with the statement on the
   left and a cutout render of the system on the right. The render and the
   photograph show the same thing — a UAV, a ground vehicle and a sensor mast
   deployed together — so keeping both would have been the same sentence said
   twice, with the two illustrations competing for the same screen. The
   photograph replaces the render rather than joining it.

   Legibility is engineered, not hoped for. The plate carries a scrim: a strong
   left-to-right gradient under the text column and a floor gradient along the
   bottom edge. Contrast is therefore a property of the composition and does not
   depend on which part of the sky happens to sit behind a given line of type.

   The screen holds two things and nothing else: a two-line headline and the two
   actions. An eyebrow, a third headline line, a supporting sentence, an amber
   rule, a scroll cue, a measured grid and a set of registration marks have each
   been removed — the notes at their former positions record what went and why.
   A first screen is the one place on a site where the cost of a line is paid by
   every visitor, so a line that is merely true is not good enough; it has to be
   worth more than the attention it takes from what follows it.

   Motion is scroll-linked rather than autoplaying: the plate drifts slowly and
   stays behind, the content lifts faster and recedes. All of it collapses under
   prefers-reduced-motion.
-------------------------------------------------------------------------- */
function Hero() {
  const ref = useRef(null);
  const reduce = useReducedMotion();

  /* Which stage the legend highlights. This is the one piece of the animation
     that is React state rather than a ref: the legend is rendered by React and
     has to re-render to move the highlight. It changes once every three
     seconds, which is not a render budget worth optimising, and it does not
     touch the animated list — GSAP keeps its own index in a ref and never
     reads this. */
  const [flowStep, setFlowStep] = React.useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  /*
    Tell the masthead it is standing on a photograph.

    The docked navigation bar paints solid black by default, which on this page
    was a hard strip cut across the top of the plate. data-nav-plate makes it
    paint nothing while this hero is mounted, so the image runs unbroken to the
    top of the window — see the note at the rule in index.css.

    ON THE HERO, NOT ON THE PAGE, because the hero is what makes the claim
    true. If the first screen is ever changed to something light, this comes off
    with it in the same edit rather than being left behind on a wrapper as a
    lie the navigation quietly believes.

    Cleaned up on unmount. It is set on <html>, which outlives every route, so
    without the teardown the first visit to the home page would leave every
    later page with a transparent masthead over its own light first screen.
  */
  useEffect(() => {
    document.documentElement.dataset.navPlate = 'true';
    return () => { delete document.documentElement.dataset.navPlate; };
  }, []);

  const contentY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const sceneY = useTransform(scrollYProgress, [0, 1], [0, -30]);

  const rise = (delay) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
  });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden hero-plate"
      /*
        An explicit dark background, not merely a dark image. The Header probes
        the luminance of the section beneath it to decide whether to render its
        light or dark bar; an unpainted section would report white and the bar
        would invert to dark type over a dark photograph. It also holds the
        colour for the moment before the image decodes.

        The HEIGHT is declared here, on the section itself, and that is load
        bearing. Every child of this section — the plate, both scrims, the
        floor gradient and the statement — is absolutely positioned, so none of
        them contributes any height at all. The section used to take its size
        from a .hero-full wrapper around the statement; when the statement was
        positioned to the mockup that wrapper went, and with it the only
        element holding the hero open. The result was a section of zero height:
        the photograph, the type and all of it, collapsed and invisible.

        100svh, with 100vh under it as the fallback, for the same reason
        .hero-full used them: vh measures the viewport with mobile browser
        chrome retracted, which makes the hero taller than what is actually on
        screen.
      */
      style={{ background: 'var(--ink)', color: 'var(--text-on-dark)' }}
    >
      {/* The plate. Drifts a little slower than the content above it, so the
          scene recedes rather than travelling with the type. */}
      <motion.div className="absolute inset-0" style={{ y: reduce ? 0 : sceneY }} aria-hidden="true">
        <picture>
          <source media="(max-width: 767px)" srcSet="/assets/img/hero-field-mobile.webp" />
          <img
            src="/assets/img/hero-field.webp"
            alt=""
            className="w-full h-full"
            style={{ objectFit: 'cover', objectPosition: 'center 55%' }}
            /* The plate's true intrinsic size. These are not decoration: the
               browser reserves the box from this ratio before the image
               decodes, and a stale pair is a layout shift on the LCP element.
               Update them whenever the file is replaced. */
            width={1672}
            height={941}
            /* Lowercase on purpose. React 18 forwards unknown lowercase
               attributes untouched; the camelCase spelling is a React 19
               feature and warns on this version. This is the page's LCP
               element, so the hint is worth having. */
            fetchpriority="high"
            decoding="async"
          />
        </picture>
      </motion.div>

      {/* Scrim. Two of them, because the two layouts expose different parts of
          the plate to type — see the note above HERO_SCRIM. */}
      <div
        className="absolute inset-0 pointer-events-none hidden md:block"
        aria-hidden="true"
        style={{ background: HERO_SCRIM.desktop }}
      />
      <div
        className="absolute inset-0 pointer-events-none md:hidden"
        aria-hidden="true"
        style={{ background: HERO_SCRIM.mobile }}
      />
      {/* The floor. Dissolves the plate into the band below rather than
          stopping it, so the hero has no bottom edge of its own. z-20 puts it
          over the statement as well as the photograph — the block is centred
          well above this, so nothing readable is touched, and a fade that ran
          under the text would leave the text floating on the join. */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
        aria-hidden="true"
        style={{
          height: `${(1 - HERO_FLOOR.start) * 100}%`,
          background: HERO_FLOOR_CSS,
        }}
      />

      {/*
        No grid and no registration marks over the plate.

        Both were drawn from the drafting-sheet language the hero used when it
        was type on a white ground, where a measured grid and corner ticks
        described the surface the composition was set on. Over a photograph
        there is no sheet to describe — the surface is a landscape — so the
        grid read as a scratch across the sky and the corner marks as a frame
        around a frame. The photograph is the ground now, and it does not need
        annotating.

        The hero was the only thing on this page using either, so the HeroTicks
        component and the GridPattern import went with them rather than being
        left behind as dead code. GridPattern had no other caller and has since
        been deleted too; the .grid-fine / .grid-pattern utilities in index.css
        are unrelated and still live.
      */}

      {/*
        The statement block.

        LEFT-ANCHORED, AND THE PHOTOGRAPH DECIDED THAT. The previous block was
        centred to a mockup built on a different plate — one whose darkness ran
        along the top of the frame, which is what made a centred caption over a
        vertical wash work. This plate is dark down its left edge instead
        (6.7 mean luminance across the first quarter, still 12.7 at 30%), and
        its subject — the ground vehicle, the two soldiers, the aircraft — is
        distributed across the right two thirds. Centring type on this frame
        would put it directly over the vehicle and the kneeling figure. So the
        type takes the empty side and the photograph keeps its subject.

        IT USES container-x, not a percentage offset. The old block was
        positioned in percentages of the section because it was transcribing
        a mockup. Left-aligned, it should instead line up with the masthead
        and with every section heading below it, and container-x is what all
        of those already use. One class, and the hero cannot drift out of
        alignment with the rest of the page when the gutter is retuned.

        THE TYPE IS THE SITE'S, NOT THE HERO'S OWN. h-display + fs-hero is the
        pairing behind every other page hero on this site — Space Grotesk at
        -0.045em, sentence case. What was here before was Chakra Petch set
        uppercase at 0.195em tracking, a figure reverse-engineered from the
        mockup's line width and true only of that one line at that one size.
        It made the front page the single screen set in a face and a rhythm
        that appear nowhere else. measure-hero caps the line at 58% on desktop,
        which on this plate also keeps the headline clear of the aircraft.
      */}
      <motion.div
        className="absolute inset-0 z-10 flex items-center"
        style={{ y: reduce ? 0 : contentY }}
      >
        <div className="container-x w-full">
          <div className="hero-statement">
            {/* The orange rule that used to sit here is gone. Centred, it
                landed directly under the top edge of the selector brackets and
                read as a stray fifth mark inside them rather than as the
                kicker it was when the statement was left-anchored. */}

            {/*
              THE STATEMENT IS THREE WORDS ON A LOOP.

              The headline and the supporting paragraph are gone by direction.
              What replaces them is the sequence itself — CONNECT, INTEGRATE,
              OPERATE — cycling one word at a time inside a three-row window,
              with the selected word bracketed.

              THE WORDS ARE AN ORDER, NOT A LIST, which is why they are written
              here in that order and not sorted or configured. They describe the
              same progression the page below argues for: connect what is in the
              field, integrate it into one picture, operate from that picture.

              An <h1> still, and still readable with the animation stopped. The
              three words are real DOM text in sequence, so a screen reader gets
              "CONNECT INTEGRATE OPERATE" and a search engine indexes it — the
              looping is presentation. Under prefers-reduced-motion the
              component holds on the first word rather than cycling.
            */}
            <motion.h1 className="hero-loop" style={{ margin: 0 }} {...rise(0.06)}>
              <LoopingWords words={HERO_FLOW} onWordChange={setFlowStep} />
            </motion.h1>

            {/*
              THE LEGEND EXISTS BECAUSE THE ANIMATION LOSES THE ORDER.

              A cycling word shows one thing at a time, so a visitor arriving
              mid-cycle sees "OPERATE" and has no way to know it is the third of
              three, or that anything precedes it. Worse, whichever word they
              happen to land on reads as the claim — and the claim is the
              sequence, not any word in it.

              So the whole sequence is stated once, small, permanently, in
              order: numbered, and joined by arrows that point. Numbers give the
              order, arrows give the direction, the highlight gives the position.
              A reader can arrive at any moment and still get "connect, then
              integrate, then operate" rather than a single shouted verb.

              aria-hidden, because the <h1> above already contains all three
              words in order — this is the same content restated for the eye,
              and announcing it twice helps nobody.
            */}
            <ol className="hero-flow" aria-hidden="true">
              {HERO_FLOW.map((word, i) => (
                <li key={word} className={i === flowStep ? 'is--active' : undefined}>
                  <span className="hero-flow__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="hero-flow__w">{word}</span>
                </li>
              ))}
            </ol>

          </div>
        </div>
      </motion.div>

      {/*
        THE ACTIONS, ANCHORED TO THE FOOT OF THE PLATE.

        Not inside the statement block above. That block is vertically centred,
        so anything added to it pushes the word cycle upward — the buttons would
        have moved the headline to make room for themselves. Anchored to the
        bottom instead, the statement keeps the centre of the screen and the
        actions take the edge, and neither position depends on the other's
        height.

        z-30, WHICH IS HIGHER THAN THE FLOOR GRADIENT. That gradient sits at
        z-20 and covers the bottom 26% of the section, ramping to solid ink at
        the very edge — exactly the band these now occupy. Underneath it the
        buttons would have been dimmed by up to half, and increasingly so
        towards the bottom of the screen. Above it they stay crisp, and the
        gradient still does its job of dissolving the plate into the section
        below.

        NO PARALLAX. The statement drifts on scroll; these do not. A
        bottom-anchored element that travels reads as coming loose from the
        edge it is anchored to, and the entrance animation already gives them
        their arrival.

        HeroActions is rendered rather than re-typed — the same component the
        architecture section further down uses, so the site's two actions are
        defined in one place and cannot drift apart.
      */}
      <motion.div className="hero-cta-shell z-30" {...rise(0.42)}>
        <HeroActions className="hero-cta stack-cta flex flex-wrap justify-center gap-4" />
      </motion.div>

      {/*
        The scroll cue is gone.

        It was a word and an animated line telling a reader to do the thing
        every reader already does on every site. A hero that ends mid-image is
        its own cue — the photograph running off the bottom of the screen says
        there is more below more plainly than the label did.
      */}
    </section>
  );
}

export default function Home() {
  return (
    /*
      .landing carries the brand sheet for this page — see the block in
      index.css. It is on the outermost element on purpose: the header and the
      footer are inside it and take the palette with everything else, which is
      what makes the first impression whole rather than a branded strip between
      two pieces of the old site.

      The inline background stays as var(--white) rather than becoming a
      literal. Inside this scope that name now resolves to the sheet's #F1F0F0,
      which is the whole point of overriding tokens instead of adding new ones.
    */
    <div className="landing" style={{ background: 'var(--white)' }}>
      <Header />
      <main id="main-content" tabIndex={-1}>
        <Hero />

        {/* ================= MISSION — DARK =================
            The first thing after the plate, and the first thing on the page
            that is a sentence rather than a word.

            It exists because the hero no longer explains itself. CONNECT /
            COORDINATE / OPERATE is a stance, not a description — a visitor who
            reads only the first screen knows the shape of what VIKASANA does
            and none of the substance. This band is where the three words are
            cashed in for a claim and two supporting facts, immediately, before
            any product is named.

            DARK, AND THAT IS A CONTRAST DECISION RATHER THAN A DESIGN ONE.
            The headline is the brand orange, and #FF6A00 on the sheet's paper
            measures 2.52:1 against a 3.0 floor for display text — it fails, and
            not marginally. The same line on #121212 measures 6.52:1. The
            alternative was to keep the band light and set the headline in ink,
            which passes but is not the orange that was asked for.

            The cost is two dark bands running together, since the ecosystem
            section below is also dark. The join is carried by the hero's floor
            gradient above and by the change of scale here — a full-width line
            after a single centred word. */}
        <section id="mission" style={{ background: DARK, color: 'var(--text-on-dark)' }}>
          <div className="container-x section-y">
            {/*
              EVERYTHING IN THIS BAND SITS ON ONE TWELVE-COLUMN GRID.

              It did not before, and that is what was wrong with it. The chip
              was sized to its own content, the headline ran to whatever width
              it happened to need, and the two paragraphs were a separate
              two-column grid of their own. Every element was left-aligned to
              the same gutter, so the LEFT edges lined up and the layout still
              read as crooked — because the four elements produced four
              unrelated RIGHT edges, none of them on a shared line and none of
              them reaching the container.

              Alignment is not "everything starts in the same place". It is
              everything resolving to the same underlying structure. One grid,
              declared once, and each element states which columns it occupies.
            */}
            <div className="mission-band">
              <Reveal>
                <span className="mission-band__tag">Mission</span>
              </Reveal>

              <Reveal delay={0.08}>
                {/*
                  THE BREAK IS WRITTEN HERE, NOT LEFT TO THE BROWSER.

                  The size in index.css is solved so the FIRST line fills the
                  container, and that calculation needs to know how many
                  characters are on it. Left to wrap on its own the line count
                  changes with the viewport and the size stops meaning anything;
                  with text-wrap: balance it would split evenly, which is the
                  one thing a display headline should not do — two lines of
                  equal length read as a paragraph.

                  It breaks where the sense breaks: the claim, then the
                  qualifier.
                */}
                <h2 className="mission-band__lede">
                  <span>Connecting the battlefield</span>
                  <span>like never before</span>
                </h2>
              </Reveal>

              {/*
                THE TWO SENTENCES ARE TWO COLUMNS, which is what lets the body
                span the full width and stay readable. Set as one paragraph
                across 1360px a line of prose runs to about 160 characters —
                roughly twice the measure at which the eye reliably finds the
                start of the next line. On five columns each sits near 63.

                They divide where the meaning divides: the left column is what
                the company integrates, the right is what that produces. This is
                not a paragraph cut in half to fill a grid.

                BOTH COLUMNS NOW RUN TO TWO LINES, and the left one was rewritten
                to make that true rather than being forced with a break. It read
                "Integrating unmanned systems and autonomy across domains." — 57
                characters, which fitted on one line in a column that holds about
                65, so it sat as a single line beside a two-line neighbour and
                the pair looked lopsided.

                Splitting it into two sentences fixed the sense and the shape at
                once: it now mirrors the right column, which is also two
                sentences over two lines. NEITHER carries a forced break — both
                wrap naturally, so an editor can change the wording without
                having to know where a <br> was hidden.
              */}
              <Reveal delay={0.16}>
                <div className="mission-band__cols">
                  <p>Integrating unmanned systems. Connecting autonomy across domains.</p>
                  <p>Multi-vendor platforms. One mission. One unified control environment.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= HOW WE BUILD — LIGHT =================
            Statement left, evidence right. The headline is the one place on the
            page where the accent carries a whole line rather than a word. */}
        <section id="why" style={{ background: LIGHT }}>
          <div className="container-x section-y">
            <Reveal>
              <div className="meta mb-12" style={{ color: 'var(--amber-text)' }}>{'// HOW WE BUILD'}</div>
            </Reveal>

            <div className="grid md:grid-cols-2 gap-x-20 gap-y-14 items-start">
              <Reveal>
                {/* .why-h2, not .h-display: this section is set in the sans
                    face from the supplied reference rather than in the display
                    face. Size, measure and leading moved into the class with
                    it — see index.css, where the tracking and weight decisions
                    are argued. Still its own size rather than .fs-h2: this
                    heading has a full half of the row and four short lines to
                    fill it with, and at the shared h2 ceiling of 46px it left
                    most of the column empty. */}
                <h2 className="why-h2">
                  Software Defined.<br />
                  Hardware Enabled.<br />
                  <span className="text-amber">Mission Ready.</span>
                </h2>
              </Reveal>

              <div>
                {WHY_VIKASANA.map((w, i) => (
                  <Reveal key={w.n} delay={i * 0.07}>
                    <div
                      className="grid grid-cols-12 gap-5 items-start py-8"
                      style={{
                        borderTop: '1px solid var(--stone-100)',
                        borderBottom: i === WHY_VIKASANA.length - 1 ? '1px solid var(--stone-100)' : 'none',
                      }}
                    >
                      <span className="col-span-2 font-mono" style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--amber-text)' }}>
                        {w.n}
                      </span>
                      <div className="col-span-10">
                        {/* .why-title, not .font-display: the sans face from
                            the reference, same as the heading opposite and the
                            paragraph below. Still sized up from the 18/20px
                            these once were — against the heading opposite,
                            these four are the actual argument and were reading
                            as captions to their own body copy. */}
                        <div className="why-title">{w.t}</div>
                        {/* .copy-prose, not .copy-body: matched to the supplied
                            reference — Inter at default tracking, 16-19px,
                            1.55 leading, --stone-800. The three deltas and why
                            the class is scoped to this section rather than
                            applied to .copy-body are set out in index.css. */}
                        <p className="copy-prose" style={{ maxWidth: 'var(--measure)' }}>{w.d}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= ONE ARCHITECTURE — DARK =================
            The seven-domain band, restyled to the mockup: icon, a marker sitting
            on a rule that runs the width of the row, then label and description.
            Content and icons are unchanged from the capabilities section.

            The console visual stays beneath it, full-bleed and frameless — a
            device frame around a screenshot of a device reads as a mockup of a
            mockup. */}
        {/* overflow-x is clipped because the console band below bleeds to the
            full viewport width. Clip rather than hidden: hidden would make this
            a scroll container and change how anything inside it scrolls. */}
        <section
          id="capabilities"
          className="relative"
          style={{ background: DARK, color: 'var(--text-on-dark)', overflowX: 'clip' }}
        >
          <div className="absolute inset-0 grid-fine-dark opacity-40 pointer-events-none" />
          <div className="container-x section-y relative">
            <Reveal>
              <div className="meta mb-10" style={{ color: 'var(--amber)' }}>{'// ONE ARCHITECTURE'}</div>
              <div className="grid md:grid-cols-2 gap-11 items-end mb-14">
                <h2 className="h-display h-display-dark fs-h2">
                  Built for one mission.<br />Designed for every domain.
                </h2>
                <p className="copy-body measure-lead" style={{ color: 'var(--stone-400)' }}>
                  One architecture. Multiple domains. Integrate new platforms through modular
                  adapters &mdash; not new software.
                </p>
              </div>
            </Reveal>

            {/*
              THE THREE PRODUCTS, THEN THE SEVEN DOMAINS THEY RUN ACROSS.
            
              These were two sections. They were separated by a band change and
              two kickers, and both kickers said roughly the same generic thing —
              "OPERATIONAL ECOSYSTEM" above the products, "OPERATING ACROSS
              DOMAINS" above the strip. A reader had to work out that the second
              was about the first.
            
              Merged, the argument is in the order: here is what the system is,
              and here is everywhere the same architecture reaches. The bridge
              sentence was already written — "One architecture. Multiple domains."
              sat in the heading above and had nothing above it to refer back to.
            */}
            {/*
              Two lines per card — the product name and its tag — over the
              render. The sentence and the "EXPLORE …" label each card used to
              carry are gone; see the note on ECOSYSTEM in data/home.js.

              Hovering one card steps the other two back (dim, slight blur,
              slight shrink) so the row resolves to whichever card the pointer
              is on. Reveal wraps the whole grid rather than each card: the
              de-emphasis is driven by `group-hover` on the grid container, and
              a per-card wrapper would put a div between the group and the
              cards without changing what is animated.
            */}
            <Reveal>
              <HoverRevealCards
                items={ECOSYSTEM.map((e) => ({
                  id: e.id,
                  title: e.t,
                  subtitle: e.d,
                  imageUrl: e.image,
                  imageFit: e.fit,
                  to: e.to,
                }))}
              />
            </Reveal>

            {/*
              THE GAP IS THE JOIN BETWEEN THE TWO MERGED HALVES.

              Before the merge these were separate sections, and the space
              between them was the two sections' own section-y padding — about
              200px of it, contributed by neither and noticed by nobody. Merged,
              that padding is gone from the middle: the cards ended and the
              domain strip's hairlines began on the next pixel, so the two read
              as one broken grid rather than as two related blocks.

              The value is smaller than the section padding it replaces, and
              deliberately so. These halves are now one argument, and a gap as
              large as the one between sections would put them back to looking
              like two.
            */}
            <div className="architecture-domains grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
              {CAPABILITIES.map((c, i) => {
                const Ic = CAP_ICONS[c.icon];
                return (
                  /*
                    The column rule is drawn on the grid item and removed from
                    whichever item begins a row at the current breakpoint. It
                    used to key off `i === 0`, which is only correct in the
                    seven-column layout: at two and four columns the seven items
                    wrap, and every item that started a wrapped row carried a
                    stray hairline down the left edge of the section.

                    The three removal rules are scoped to mutually exclusive
                    width ranges, so no element is ever matched by two of them
                    and the result does not depend on the order Tailwind happens
                    to emit the utilities in.

                    min-w-0 lets the track shrink below the content's intrinsic
                    width; without it a grid item refuses to go narrower than
                    its longest word and pushes the whole grid wider than the
                    section.
                  */
                  <Reveal
                    key={c.label}
                    delay={i * 0.06}
                    className={
                      'min-w-0 border-l border-l-[color:var(--night-line)] ' +
                      'max-md:[&:nth-child(2n+1)]:border-l-0 ' +
                      'md:max-lg:[&:nth-child(4n+1)]:border-l-0 ' +
                      'lg:[&:nth-child(7n+1)]:border-l-0'
                    }
                  >
                    {/* Left-aligned column: icon, label, description. The only
                        separator is the vertical rule between columns — the
                        horizontal rule and its amber diamond were doing the same
                        job the dividers already do, twice. */}
                    <div
                      className="h-full pl-5 pr-5 md:pl-6 md:pr-6"
                      style={{ paddingTop: 4, paddingBottom: 4 }}
                    >
                      <Ic width={26} height={26} style={{ color: 'var(--white)', display: 'block' }} />

                      {/* Label set in the display face rather than .meta.
                          Seven mono captions stacked across a row read as
                          annotations; in the display face they read as seven
                          named domains, which is what they are.

                          It also solves the overflow this comment used to
                          describe: COMMUNICATIONS was fourteen characters of
                          uppercase mono at 0.18em tracking, wider than its own
                          cell at every tier. The copy now says CONNECTIVITY,
                          and sentence-case display type at near-zero tracking
                          is far narrower — but overflowWrap is kept, because
                          the longest label is still a single unbreakable word
                          and the cell is still narrow at the seven-column
                          tier. */}
                      <div
                        className="font-display"
                        style={{
                          color: 'var(--white)',
                          marginTop: 28,
                          fontSize: 'clamp(16px, 1.15vw, 19px)',
                          fontWeight: 600,
                          letterSpacing: '-0.015em',
                          lineHeight: 1.2,
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {c.label}
                      </div>

                      <div
                        className="text-[13px] leading-relaxed"
                        style={{ color: 'var(--stone-400)', marginTop: 10 }}
                      >
                        {c.d}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={0.2}>
              {/* Full-bleed band.

                  The bleed comes from negative inline margins on an auto width:
                  a block box in normal flow resolves its used width as
                  container - marginLeft - marginRight, so W - 2(0.5W - 50vw)
                  gives exactly 100vw with the box still centred on the column.
                  Width is deliberately left auto — declaring both a width and
                  both margins over-constrains the box, and CSS resolves that by
                  discarding one margin, which pushes the band off-centre instead
                  of widening it.

                  This replaces width:100vw with a translateX(-50%) trick. Both
                  measure the viewport, and a viewport unit includes the classic
                  scrollbar gutter, so the band is about a scrollbar wider than
                  the document and hangs half of that off each side. There is no
                  scrollbar-free viewport unit to swap in, so the section clips
                  its own horizontal overflow and the excess never reaches the
                  document. The artwork is object-fit:contain inside a padded
                  21:9 frame, so what gets clipped is empty ground. */}
              <div
                className="mt-16"
                style={{ position: 'relative', marginInline: 'calc(50% - 50vw)' }}
              >
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 1760,
                    margin: '0 auto',
                    aspectRatio: '21 / 9',
                    paddingLeft: 24,
                    paddingRight: 24,
                    /* Centres the artwork in the wider frame. This replaced
                       object-fit: contain, and the reason is the mask below:
                       under `contain` the element's box is the whole 21:9 frame
                       while the artwork occupies only the middle 64% of it, so
                       a mask on the element would feather at the frame's edges
                       rather than the artwork's. Sized this way the element box
                       and the artwork are the same rectangle, and the mask
                       needs to know nothing about either aspect ratio. */
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  {/*
                    1536x1024. A separate file from drishtikon-console.png,
                    which is 612x408 and still used in eight other places where
                    it renders small.

                    THE SEAM, AND WHY IT WAS THERE. The note that used to sit
                    here claimed the artwork's ground and the band behind it are
                    both --ink. They are not, and the difference is the visible
                    rectangle: the artwork's ground measures rgb(8,10,11) and
                    the band is --ink at rgb(13,15,16). Five levels per channel
                    is nothing as a colour and everything as an edge — the eye
                    finds a straight boundary across a large flat dark field
                    long before it can name the two shades either side of it.

                    Rather than repaint the asset to match a token it will drift
                    from again the next time it is re-exported, the edge is
                    dissolved. The mask fades the artwork's outer margin to
                    transparent, so the two grounds meet as a gradient over
                    ~50px instead of at a line. There is nothing to see at the
                    join even if the next export lands on a different black.

                    The feather is sized from the artwork, not guessed: content
                    starts 50px in on the left, 56px on the right, 50px from the
                    top and 60px from the bottom, so 4% and 5% fade bands sit
                    inside the empty margin and never touch a screen edge.

                    mask-composite: intersect combines the two gradients so the
                    corners fade on both axes. The -webkit- pair is the same
                    thing in the older syntax, for Safari.
                  */}
                  <img
                    src="/assets/img/drishtikon-console-hd.webp"
                    alt="DRISHTIKON: asset list, live tactical map with telemetry, and mission control panel"
                    width="1536"
                    height="1024"
                    loading="lazy"
                    decoding="async"
                    style={{
                      display: 'block',
                      height: '100%',
                      width: 'auto',
                      maxWidth: '100%',
                      WebkitMaskImage:
                        'linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 5%, #000 95%, transparent 100%)',
                      maskImage:
                        'linear-gradient(to right, transparent 0%, #000 4%, #000 96%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 5%, #000 95%, transparent 100%)',
                      WebkitMaskComposite: 'source-in',
                      maskComposite: 'intersect',
                    }}
                  />
                </div>
              </div>
            </Reveal>

            {/*
              NO CALL TO ACTION AT THE FOOT OF THIS SECTION.

              One was here briefly. It is gone by direction, and the reasoning
              holds up: the hero already carries the same single button, and the
              same destination offered twice on one screen-and-a-bit is not
              twice the invitation — it is a repeat that makes the first one look
              less deliberate.

              Each of the three cards above is already a route into the products
              in its own right. The section is not short of ways out.

              HeroActions still exists and is still rendered by the hero. If a
              call to action is ever wanted here again, render it — do not
              rebuild a button.
            */}
          </div>
        </section>

        {/* ================= TRUSTED INTEGRATIONS — LIGHT =================
            Kept on a light band: the logo files are dark marks and disappear
            against --ink. */}
        <section id="integrations" style={{ background: LIGHT }}>
          <div className="container-x section-y">
            <Reveal>
              <div className="meta mb-10" style={{ color: 'var(--amber-text)' }}>{'// TRUSTED INTEGRATIONS'}</div>
              <div className="grid md:grid-cols-2 gap-12 items-end mb-12">
                <h2 className="h-display fs-h3 m-0">Built to work with existing systems.</h2>
                {/* NO .measure, BY DIRECTION — THIS IS A CAPTION, NOT A PARAGRAPH.

                    One sentence set opposite a heading and baseline-aligned to
                    it by items-end. It needs 555px to set on one line at 14px;
                    .measure caps every block of prose on the site at 512px, so
                    the cap — and only the cap — was breaking it across two
                    lines and leaving the second line 43px short of the first.

                    The column here is 871px at 1920, so dropping the cap costs
                    nothing: the text is 555px and the line length is what the
                    sentence is, not what the column allows. A reading measure
                    exists to stop the eye losing its place returning to the
                    next line, and a single line has no next line to return to.
                    This is the case index.css means when it says a block that
                    genuinely cannot use the measure is a layout problem — the
                    layout gave it the room.

                    NO whitespace-nowrap, deliberately. It would not add a
                    thing above ~1240px, where the column already holds the
                    sentence, and below it the two-up grid narrows past 555px
                    and nowrap would push the line out of the section instead
                    of letting it fold. It folds to two lines between the md
                    breakpoint and ~1240px, and takes one line either side of
                    that — below 768 the grid stacks and the sentence gets the
                    whole container. */}
                <p className="text-[14px] m-0" style={{ color: 'var(--stone-600)' }}>
                  The platforms you already operate keep working, with interoperability added on top.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <LogoCarousel logos={PARTNER_LOGOS} height={34} />
            </Reveal>
          </div>
        </section>

      </main>
      <Footer variant="dark" />
    </div>
  );
}
