import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import FAQ from '@/components/FAQ';
import HeroPlate from '@/components/ui/hero-plate';
import Section from '@/components/about/Section';
import ProductIndex from '@/components/about/ProductIndex';
import SpecList from '@/components/about/SpecList';
import { GENERAL_FAQ } from '@/data/faqs';
import { FlowButton } from '@/components/ui/flow-button';
import EnquiryNote, { EnquiryAddress } from '@/components/EnquiryNote';
import { DARK_BAND } from '@/lib/bands';

/*
  About VIKASANA.

  ---------------------------------------------------------------------------
  COPY
  ---------------------------------------------------------------------------
  Unchanged from the approved ABOUT_PAGE.md draft, and unchanged again by the
  23 September 2026 pass: that pass removed three blocks by direction and
  replanned the bands, and did not alter a sentence that remains.

  BOTH SENTENCES THE SOURCE DOC MARKS AS LOAD-BEARING WERE ALREADY OFF THIS
  PAGE BEFORE THIS PASS, and this header used to imply otherwise. Recorded
  plainly so nobody spends an afternoon looking for them:

    - "Our role is not to replace platforms. It is to make compatible
      platforms operate together." — its argument is carried by the third
      paragraph of Our Mission, which says the same thing in the page's own
      words. The sentence itself is not set anywhere.
    - "We do not measure ourselves by demonstrations. We measure ourselves by
      whether our systems remain predictable when conditions are not." — this
      was in "What We Will Not Do", which was removed by direction in an
      earlier pass. It has no home on the page now.

  If either is required verbatim, it needs a block to live in, and that is a
  copy decision rather than a layout one.

  ---------------------------------------------------------------------------
  THE OPENING — TWO SCREENS, NOT ONE
  ---------------------------------------------------------------------------
    1. the image      a full-viewport plate held sticky while the page scrolls
                      past it, opening from an inset rectangle to the full
                      frame. No text on it.
    2. the statement  one full screen, headline across the whole container.

  The headline carries no measure and no column. A statement that has to
  compete with an image behind it gets set smaller and pushed to one side;
  given its own screen it can run the full width, which is the only reason to
  have a headline that size at all.

  ---------------------------------------------------------------------------
  LAYOUT — from the supplied design
  ---------------------------------------------------------------------------
  One 12-column grid, split 5 / 7, on every section below the opening:

    cols 1-5   `// SECTION` eyebrow, then the heading as short uppercase
               display type stacked into a block.
    cols 6-12  the reading column, capped at --measure.

  The consequence is that body copy begins at the same x-position from the
  first section to the last. Nothing on this page is positioned relative to
  itself; it is positioned relative to the page.

  ---------------------------------------------------------------------------
  BAND RHYTHM — REPLANNED 23 SEPTEMBER 2026
  ---------------------------------------------------------------------------
  Strict alternation, every band, end to end:

      image(D)  statement(L)  mission(D)  build(L)  where(D)  faq(L)  close(D)

  This reverses the previous arrangement, which ran the FAQ and the closing
  Careers & Contact band as two darks together on the theory that they and the
  Footer read as one closing plate. That theory was sound for an eight-section
  page: with enough bands above it, a deliberate doubling at the end reads as
  an ending. On a seven-band page where two of the seven are already dark by
  necessity — the photographic hero and the footer — a third doubling at the
  close leaves the reader with more black than paper and no rhythm to hold on
  to. One tone per band, alternating, and the page still ends dark and still
  hands off to a dark footer.

  Two things force the ends and everything between follows from them: the hero
  is a photographic plate and is dark, and the Footer is dark. Seven bands
  starting and ending dark alternate exactly once.

  WHERE WE ARE IS SET `tight`. It is four rows of registry data — legal entity,
  CIN, incorporation date, registered office. It is the only band on the page
  that makes no argument, and given .doc-section's full 64-112px rhythm it
  claimed the same vertical weight as Our Mission while saying a hundredth as
  much. .doc-section-tight is the rhythm for a section that is a continuation
  rather than a new argument, which is exactly what a registry is. It was
  written for the constraints list that has since been removed and had no
  caller until now.

  It is also dark now. The standing note against that was specific and is spent:
  the map plate that used to sit in this band is a cartographic drawing on cream
  paper, and on black it read as a lit panel stuck to the page. The plate has
  moved to /contact. With nothing in the band but type, the objection has
  nothing left to object to, and "Built in Mangaluru." can take the amber close
  that the other two dark headings on this page take.

  ---------------------------------------------------------------------------
  WHAT IS NOT HERE, AND WHY
  ---------------------------------------------------------------------------
  ADVISORS. The design has three advisor cards reading "Advisor Name" and
  "Short background line — replace with the advisor's real bio". That is the
  placeholder content the brief rules out, and inventing three advisors for a
  defence company is not a layout decision. Send names, roles and one line
  each and the section goes in as designed.

  ---------------------------------------------------------------------------
  REMOVED BY DIRECTION
  ---------------------------------------------------------------------------
  Earlier passes: the four-figure readout under the hero (with StatRow.js and
  its .stat-row / .stat-n rules), and the whole "What We Will Not Do" section
  with its four constraints (with CONSTRAINTS).

  23 September 2026, three more:

    THE MANGALURU MAP. Not deleted — moved. It is the plate on /contact now,
    in place of the animated LocationMap component that stood there. It is one
    drawing of one office and it was on two pages.

    THE DOCTRINE NOTE. "Our engineering doctrine is in preparation and will be
    linked here." A line whose entire content was that there is no line yet.
    It sat under the map, styled as muted body copy, and it was the last thing
    the band said. When the doctrine exists it goes back as a link with a
    destination, which is a different thing from a placeholder.

    HOW WE WORK. The section and the PRINCIPLES array behind it — six numbered
    engineering principles set as a RuleList. The import went with it, and this
    was RuleList's only caller, which left components/about/RuleList.js
    unreferenced along with components/ui/expand-map.jsx — the latter because
    the LocationMap it exported lost its one use when the map plate replaced it
    on /contact.

    Both have since been deleted, on the second decision this note asked for.
    The repository's own precedent — StatRow.js, which went out with the
    four-figure readout — is that an unreferenced component is a maintenance
    cost paid by everyone who greps the codebase. Their shared CSS survived the
    removal: .doc-list / .doc-row / .num-tag belong to ProductIndex and SpecList
    as well, and were checked against those callers before RuleList went.

  In every case the array went with the section rather than being left orphaned
  above it, and git history is the correct place to keep content that is not on
  the page. Reinstating a removed block means writing it again, which is five
  minutes, rather than finding it, which is the part nobody could do.

  ---------------------------------------------------------------------------
  ONE CONSTRAINT ON FUTURE EDITS
  ---------------------------------------------------------------------------
  The Header measures the luminance of whatever section sits beneath it and
  re-tints itself. Every band here is a <section> carrying an explicit
  background, so that probe works. A band added as a bare <div> breaks the
  navigation, not just the layout.
*/

/*
  The opening statement, as supplied. Three paragraphs, set as three columns
  so the section fits one screen — see the note at the call site. Held here
  rather than inline because the JSX is a map over them, and because a
  paragraph is content.
*/
const ABOUT_PARAGRAPHS = [
  'Every new platform, sensor and autonomous system increases capability—but it also increases operational complexity. Different manufacturers, different communication protocols and isolated software environments create fragmented operations where speed, clarity and coordination matter most. A capable force is not defined only by the systems it owns, but by how effectively those systems operate together.',
  'VIKASANA Systems develops mission software and mission computing that unify compatible defence systems into a single operational environment. UAVs, UGVs, USVs and fixed surveillance assets can be coordinated through one software-defined command architecture while preserving platform integrity, human authority and national control. We integrate existing systems through documented interfaces, allowing organisations to extend operational capability without replacing proven equipment.',
  'Software has become the decisive layer of modern defence capability. It determines how information is shared, how decisions are coordinated and how missions are executed across multiple domains. VIKASANA exists to engineer that layer—building open, modular mission infrastructure that enables connected, accountable and mission-ready operations for the forces that rely on it.',
];

/*
  Kickers reuse the site's existing product category labels — the source doc
  warns against letting product vocabulary drift across pages, so these are not
  new inventions.
*/
const PRODUCTS = [
  { kicker: 'COMMAND & CONTROL', name: 'DRISHTIKON', d: 'A unified command environment for compatible UAVs, UGVs, USVs and surveillance systems.', to: '/products/platform' },
  { kicker: 'EDGE INTELLIGENCE', name: 'GCS-X L', d: 'A rugged modular mission computer for field and command deployments.', to: '/products/field-station' },
  { kicker: 'MISSION INTELLIGENCE', name: 'GCS-X H', d: 'A rugged handheld mission controller for tactical operations at the edge.', to: '/products/handheld' },
];

const DOMAINS = ['Air', 'Ground', 'Maritime', 'Fixed Surveillance'];

const COMPANY_INFO = [
  ['Legal Entity', 'VIKASANA SYSTEMS PRIVATE LIMITED'],
  ['Corporate Identity Number (CIN)', 'U26515KA2026PTC226027'],
  ['Incorporated', '13 August 2026'],
  ['Registered Office', 'Mangaluru, Karnataka, India'],
];

/* PRINCIPLES lived here and is deleted with the How We Work section it fed;
   the four-figure readout and CONSTRAINTS went the same way in earlier passes.
   See REMOVED BY DIRECTION at the top of this file. */

export default function Company() {
  return (
    <div>
      <Header variant="light" />
      <main id="main-content" tabIndex={-1}>

        {/* ==================== 1. THE IMAGE — DARK ====================
            A full-viewport plate, shown. It carries no text: the headline is
            the next screen, not an overlay on this one, so neither has to
            compromise for the other.

            It used to be held sticky while the page scrolled past it, opening
            from an inset rectangle and zooming 1.7 to 1 across a 1200px
            spacer. That is gone by direction — see hero-plate.jsx — and with
            it the reason this band was 2145px tall to show one screen of
            image. The section is now exactly the plate.

            A <section> with an explicit background, like every other band, so
            the Header's luminance probe reads it and inverts the bar. */}
        <section style={{ background: 'var(--ink)' }}>
          <HeroPlate
            desktopImage="/assets/img/hero-company.webp"
            mobileImage="/assets/img/hero-company-mobile.webp"
          />
        </section>

        {/* ==================== 2. THE STATEMENT — LIGHT ====================
            One screen, and the headline has all of it. No measure, no column,
            no split — the h1 runs the full container and the supporting copy
            sits underneath it rather than beside it. The 5 / 7 grid starts at
            the first section below. */}
        <section style={{ background: 'var(--white)' }}>
          <div
            className="container-x doc-hero flex items-center"
            style={{ minHeight: '100vh' }}
          >
            <div className="w-full">
              <Reveal>
                <div className="meta mb-8" style={{ color: 'var(--stone-500)' }}>{'// About VIKASANA'}</div>
              </Reveal>

              <Reveal delay={0.05}>
                <h1 className="h-statement h-statement-hero">
                  Modern defence isn't limited by platforms.{' '}
                  <span className="text-amber">It's limited by coordination.</span>
                </h1>
              </Reveal>

              {/*
                Three paragraphs, three columns.

                Stacked in a single reading column these run past the fold and
                the section stops fitting the screen, which is the whole point
                of it. Set side by side each one is short enough to be read at
                a glance, and the three together are a shape rather than a
                block — the headline states the position, and the columns
                under it give the company, the systems and the problem in that
                order.

                Below md the three stack and the section grows past 100vh —
                min-height, not height, so a phone scrolls rather than clips.
              */}
              {/*
                RAGGED, with the rest of the site. This block carried
                .text-justified and was the last marketing copy on the site
                still set justified; the class and the rule behind it are gone
                — see the note on .legal-body in index.css.

                The argument it was removed against is kept here because it was
                a real one: three columns read as a set, and three ragged right
                edges put three uneven edges into a block the eye takes in at
                once. That is true, and it lost to the fact that the same rule
                also set the legal pages and the Drishtikon hero, so the site
                was running two settings for the same kind of prose and a
                reader met both. One setting everywhere beats the better
                setting in one place.
              */}
              <div className="grid md:grid-cols-3 gap-8 md:gap-12 mt-12 md:mt-16">
                {ABOUT_PARAGRAPHS.map((t, i) => (
                  <Reveal key={t.slice(0, 24)} delay={0.12 + i * 0.06}>
                    <p className="copy-body m-0" style={{ color: 'var(--text-tertiary)' }}>{t}</p>
                  </Reveal>
                ))}
              </div>

            </div>
          </div>
        </section>


        {/* ==================== 3. OUR MISSION — DARK ==================== */}
        <Section
          label="Our Mission"
          dark
          heading={<>Fragmented by manufacturer. Coordinated as <span className="text-amber on-dark">one force.</span></>}
        >
          {/*
            THE ARGUMENT AND ITS RESOLUTION, SIDE BY SIDE.

            These were stacked: three paragraphs, then a rule, then the closing
            statement underneath. That was written for a 1360px page, where the
            body track was about 640px and a single --measure column filled it.
            With the centred track gone the same track is ~1020px and the
            paragraphs still stopped at 512 — half the width empty down the
            right, and the statement block's rule running the full 1020 to
            point at it. Stacked, the section also ran 976px tall to carry
            about 400px of text.

            Two columns fix both. Each lands near 487px at 1920, which is
            --measure to within the rounding, so the reading column is the
            grid column now rather than a cap inside it — and the argument sits
            opposite the assertion it builds to. Three paragraphs on the left,
            three lines on the right: the problem, and what replaces it.

            1700px, NOT md. The split is a sub-division of a track that is
            itself 7 of 12, so the columns it makes are small fractions of the
            page and they run out of width long before the page does:

              viewport   container   7-track   sub-column
              768px        720px       400px      176px   ~22 characters
              1280px      1203px       682px      317px   ~41 characters
              1700px      1598px       912px      432px   ~56 characters
              1920px      1791px      1023px      487px   ~63 characters

            At md this setting would be unreadable — narrower than the heading
            beside it and half the site's own --measure-sm floor. The threshold
            is the width at which a sub-column first clears ~430px, and below
            it the two blocks stack and the argument takes the whole track,
            exactly as it did before. So this adds a layout at the widths that
            have room for it and changes nothing at the widths that do not.

            .measure stays on the prose. It is inert here (the column is
            narrower than 512) and becomes the ceiling again past ~2400px,
            where the sub-columns grow beyond the measure.

            NOT JUSTIFIED, unlike the three-up block in Our Story above. The
            note on .text-justified argues that columns earn justification, and
            they do at the width that block runs. At 487px with hyphenation on
            this copy — "organisations", "manufacturers", "accountability" —
            the same setting opens word spaces to the width of an em and puts
            rivers down every paragraph. Ragged right is the better setting at
            this measure; the two blocks differ because their measures do.
          */}
          <div className="grid grid-cols-1 min-[1700px]:grid-cols-2 gap-12">
            <Reveal>
              <div className="space-y-6 copy-body measure" style={{ color: 'var(--text-on-dark-2)' }}>
                <p className="m-0">
                  Modern defence organisations operate equipment acquired over many years from
                  multiple manufacturers. Each platform tends to arrive with its own software,
                  interfaces, workflows and operational assumptions.
                </p>
                <p className="m-0">
                  The result is fragmented operations, duplicated effort, slower decisions, and
                  complexity that grows with every system added.
                </p>
                <p className="m-0">
                  We connect compatible systems into one command environment instead of asking
                  organisations to replace capable assets simply because they were built by
                  different manufacturers.
                </p>
              </div>
            </Reveal>

            {/* The coda, and the long-term goal that used to be its own Vision
                section. Both are statements of the same thing the paragraphs
                beside them argue for, and a section of its own gave a
                two-sentence closing line the same weight as the argument it
                closes.

                The rule now sits INSIDE this column, between the three lines
                and the goal, and carries .measure so it ends where the text
                under it ends at every width — side by side the column is
                already narrower than the measure, and stacked the measure is
                what stops it. Spanning the full track it was drawing a 1020px
                line across half a page of nothing. */}
            <Reveal delay={0.12}>
              <div>
                <p className="h-display h-display-dark fs-h3 m-0">One operational picture.</p>
                <p className="h-display h-display-dark fs-h3 m-0 mt-2">Coordinated as one force.</p>
                <p className="h-display h-display-dark fs-h3 m-0 mt-2">Under human authority.</p>

                <div className="doc-statement-block doc-statement-block-dark measure">
                  <p className="copy-body measure m-0" style={{ color: 'var(--text-on-dark-2)' }}>
                    Our long-term goal is to build India's sovereign mission software
                    infrastructure for coordinated defence operations — reducing operational
                    complexity while improving coordination, accountability and mission
                    effectiveness.
                  </p>
                  <p className="doc-statement fs-sub measure mt-6 m-0" style={{ color: 'var(--text-on-dark)' }}>
                    Products will evolve. The engineering principles behind them will not.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </Section>

        {/* ==================== 4. WHAT WE BUILD — LIGHT ==================== */}
        <Section label="What We Build" heading={<>Three systems, one architecture.</>}>
          <ProductIndex items={PRODUCTS} />

          <Reveal delay={0.12}>
            <div className="grid md:grid-cols-7 gap-2 md:gap-12 pt-8">
              <div className="md:col-span-2 meta" style={{ color: 'var(--stone-500)' }}>
                Multi-Domain Operations
              </div>
              <div
                className="md:col-span-5 font-mono"
                style={{ color: 'var(--ink)', fontSize: '13px', letterSpacing: '0.14em' }}
              >
                {DOMAINS.join(' · ').toUpperCase()}
              </div>
            </div>
          </Reveal>
        </Section>

        {/* ==================== 5. WHERE WE ARE — DARK, TIGHT ====================
            Four rows of registry data and nothing else. It is the one band on
            the page that makes no argument, so it takes the continuation
            rhythm rather than the full section rhythm, and it is the shortest
            band on the page by design. See BAND RHYTHM at the top of the file
            for why it is dark and why `tight` — which had no caller before
            this — is the right control for it.

            The map plate and the doctrine note that used to close this band are
            both gone: the plate to /contact, the note entirely. */}
        <Section
          label="Where We Are"
          dark
          tight
          heading={<>Built in <span className="text-amber on-dark">Mangaluru.</span></>}
        >
          <Reveal>
            <SpecList rows={COMPANY_INFO} dark />
          </Reveal>
        </Section>

        {/* ==================== 6. FAQ — LIGHT ====================
            Light, which reverses the previous pass. See BAND RHYTHM above: the
            two-darks-at-the-close arrangement was written for a page with more
            bands above it than this one now has. */}
        <FAQ
          items={GENERAL_FAQ}
          label="FAQ"
          heading="About the company."
          variant="document"
        />

        {/* ==================== 7. CAREERS & CONTACT — DARK ====================
            The closing band, and the only dark one at the close now. It hands
            off to a dark Footer, so the page still ends on ink. */}
        <Section label="Careers & Contact" dark heading={<>Talk to the <span className="text-amber on-dark">team.</span></>}>
          {/*
            TWO LABELLED COLUMNS, NOT ONE PARAGRAPH.

            The band label already promises two things; it now delivers them as
            two visible objects. A candidate and a procurement officer land on
            the same band and neither is reading for the other — each finds
            their label in one saccade instead of parsing a paragraph that
            starts as a description of briefings and ends as an instruction to
            send email.

            What was here: one justified paragraph with "Write to us at …"
            welded onto the end of it, in the same type role and colour as the
            description, above a button about careers. Three jobs, no
            separation, and the reason this band read as randomly assembled.

            `text-justified` is gone with it — justification on a two-line
            instruction opens rivers.
          */}
          <div className="grid md:grid-cols-2 gap-12">
            <Reveal>
              <EnquiryNote band={DARK_BAND} label="CAREERS">
                Open engineering roles, and how to apply.
              </EnquiryNote>
              {/* Navigation, not a contact control — which is why it survives
                  the button removal. It sits under the label that explains it
                  now, rather than under a paragraph about email. */}
              <div className="mt-6">
                <FlowButton to="/careers" variant="light" text="View Careers" />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <EnquiryNote band={DARK_BAND} label="ENQUIRIES">
                Technical briefings for defence organisations, integrators, and government
                customers. Write to <EnquiryAddress band={DARK_BAND} /> — every enquiry is
                read by an engineer.
              </EnquiryNote>
            </Reveal>
          </div>
        </Section>

      </main>
      <Footer variant="dark" />
    </div>
  );
}
