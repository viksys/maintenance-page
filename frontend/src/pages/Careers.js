import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import FAQ from '@/components/FAQ';
import JobAccordion from '@/components/careers/JobAccordion';
import { CAREERS_FAQ } from '@/data/faqs';
import { jobs } from '@/data/jobs';
import { FlowButton } from '@/components/ui/flow-button';
import EnquiryNote, { EnquiryAddress } from '@/components/EnquiryNote';
import { LIGHT_BAND } from '@/lib/bands';
/*
  ═══════════════════════════════════════════════════════════════════════════
  CAREERS — REPLANNED 23 SEPTEMBER 2026
  ═══════════════════════════════════════════════════════════════════════════

  The page was eight sections and roughly 750 rendered words, and it was the
  longest page on the site for the smallest amount of information: one open
  role. It is four sections now, and about a quarter of the words.

  WHAT WAS CUT, AND WHY

  1. THREE SECTIONS WERE MAKING ONE ARGUMENT. Origin, Regional Commitment and
     Back to Ooru ran consecutively and each said that Coastal Karnataka
     produces engineers, that they have had to leave for deep-technology work,
     and that we are building here so they do not have to. A reader met that
     claim three times in three registers — four numbered points, five
     commitment cards, and two long paragraphs — and learned nothing new on the
     second or third pass. They are one section now: a headline, two sentences,
     and four commitments. The OriginStory component they came from carried no
     other caller and was deleted with them.

  2. SIX CULTURE PILLARS WERE FOUR IDEAS. "Mission-driven engineering" and
     "Real-world defence technology" were the same claim, and so were "Small,
     high-impact team" and "Build from first principles" once their descriptions
     were read rather than skimmed. Four pillars, one line each. (Superseded:
     the culture band was removed outright later the same day — see the note
     below this one.)

  3. THE APPLY SECTION IS GONE. It was a dark band whose whole content was
     "send us a note" and two buttons — the same two buttons the hero already
     carries, below a role list where every row has its own Apply control. The
     one thing it said that nothing else did — that applications are read
     whether or not a role is listed — is now a single line under the roles
     heading, which is where a candidate is actually looking when they need it.

  ORDER: the job comes before the story. A candidate wants to know what is open
  and where it is based long before they want the company's view of regional
  development, so Open Positions sits directly under the culture band and the
  Mangaluru argument follows it for anyone still reading.

  BANDS: light, dark, light, dark, light. Strict alternation, which the page
  did not have before — it ran two whites in a row where Benefits met Open
  Positions, and a third grey band under Back to Ooru that belonged to no tone.

  ───────────────────────────────────────────────────────────────────────────
  ENGINEERING CULTURE — REMOVED BY DIRECTION, 23 SEPTEMBER 2026
  ───────────────────────────────────────────────────────────────────────────

  The four-pillar culture band that opened the page under the hero is gone, and
  PILLARS went with it rather than being left orphaned above. Three sections
  remain and the numbering is 01/03 · 02/03 · 03/03.

  The band rhythm survives the cut unchanged. Culture was the dark band under a
  dark photographic hero — the one place the page had two dark surfaces meeting
  — so removing it leaves hero(D) roles(L) Mangaluru(D) faq(L), which is the
  strict alternation the note above was arguing for and did not quite have.

  What the page lost in substance it did not lose in argument: "Why Mangaluru"
  still states the ownership and first-principles claims, and the role's own
  brief in JobAccordion carries the engineering detail a candidate was reading
  the pillars for.
*/

/*
  What we owe the region. FOUR, not five — five cells never divide evenly into
  the two- and three-column grids this row uses, and the odd one out read as a
  card that had failed to load rather than as the end of a list. The dropped
  entry, "a deeper coastal tech sector", was the weakest of the five and the
  hardest to distinguish from "an engineering destination".
*/
const COMMITMENTS = [
  { t: 'High-value engineering jobs', d: 'Created and held in the region.' },
  { t: 'Developed locally', d: 'Designed and integrated here, not elsewhere.' },
  { t: 'Indigenous capability', d: 'Adding to India’s sovereign defence base.' },
  { t: 'An engineering destination', d: 'A place engineers move toward, not away from.' },
];

export default function Careers() {
  return (
    <div>
      <Header variant="dark" />
      <main id="main-content" tabIndex={-1}>

        {/* ══ HERO — THE MANGALURU PLATE ═══════════════════════════
            Full-bleed photograph, built to a supplied composition. The CSS
            block in index.css carries the reasoning for the wash and the rail;
            what matters here is that everything in the rail is DECORATION —
            position, four words, a strap — and none of it is load-bearing, so
            it is aria-hidden and it disappears below 1000px rather than being
            stacked under the copy where it would read as content.

            The header is seeded dark. Its luminance sampler would arrive at
            the same answer a frame later, but a light bar over a black plate
            on first paint is a flash nobody needs to see. */}
        <section className="ch-hero">
          {/* No aria-hidden on <picture> — it is not an element that takes
                ARIA, and the empty alt on the <img> already removes the
                plate from the accessibility tree. */}
          <picture className="ch-hero__bg">
            <source media="(max-width: 767px)" srcSet="/assets/img/hero-careers-mobile.webp" />
            {/* Empty alt and aria-hidden: the plate says nothing the headline
                over it does not, and a description of a coastline read aloud
                before the page's own first sentence is noise. */}
            <img src="/assets/img/hero-careers.webp" alt="" width="1920" height="1081" fetchpriority="high" decoding="async" />
          </picture>
          <div className="ch-hero__wash" aria-hidden="true" />

          <div className="ch-hero__marks" aria-hidden="true">
            <svg viewBox="0 0 1440 900" preserveAspectRatio="none" fill="none" stroke="rgba(241,240,240,0.30)" strokeWidth="1" vectorEffect="non-scaling-stroke">
              {/* Two long hairlines, four corner brackets and one crosshair.
                  preserveAspectRatio="none" would smear a diagonal, so every
                  stroke here is axis-aligned by construction. */}
              <path d="M492 0 V900" strokeOpacity="0.16" />
              <path d="M1330 0 V900" strokeOpacity="0.16" />
              <path d="M612 190 h36 M612 190 v-34" />
              <path d="M1150 190 h-36 M1150 190 v-34" />
              <path d="M612 712 h36 M612 712 v34" />
              <path d="M1150 712 h-36 M1150 712 v34" />
              <path d="M878 92 v26 M865 105 h26" strokeOpacity="0.5" />
              <path d="M1222 78 h48" stroke="rgba(241,240,240,0.5)" />
            </svg>
          </div>

          <div className="container-x ch-hero__inner">
            <div className="ch-hero__main">
              <Reveal>
                <div className="meta ch-hero__eyebrow"><span>{'//'}</span>Mangaluru</div>
              </Reveal>
              <Reveal delay={0.1}>
                <h1 className="font-display ch-hero__title">
                  Build serious software for <span>autonomous defence.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.18}>
                {/* Two short sentences. The version this replaced ran to
                    twenty-five words and said "from first principles, from
                    Mangaluru" directly under an eyebrow reading Mangaluru. */}
                <p className="copy-body ch-hero__lead">
                  Indigenous defence technology, engineered from first principles. Small team, real systems.
                </p>
              </Reveal>
              <Reveal delay={0.26}>
                <div className="ch-hero__cta flex flex-wrap gap-3">
                  <FlowButton href="#roles" variant="light" text="View Open Roles" />
                </div>
              </Reveal>
            </div>

            <div className="ch-hero__rail" aria-hidden="true">
              <div className="meta ch-hero__coords">12.9141&deg; N<br />74.8560&deg; E</div>
              <div>
                <i className="ch-hero__tick" />
                <div className="meta ch-hero__words">Coastline<br />People<br />Innovation<br />Defence</div>
              </div>
              <div>
                <i className="ch-hero__tick" />
                <div className="meta ch-hero__strap">Defence technology<br />for a safer tomorrow.</div>
              </div>
            </div>
          </div>

          <div className="container-x ch-hero__foot" aria-hidden="true">
            <i />
            <div className="meta">Built in Bharat. Engineered in <b>Mangaluru</b>.</div>
          </div>
        </section>

        {/* ══ 01 · OPEN POSITIONS — LIGHT ═══════════════════════════ */}
        <section id="roles" style={{ background: 'var(--white)' }}>
          <div className="container-x section-y">
            <Reveal>
              <SectionLabel number="01 / 03" label="Open Positions" amber className="mb-10" />
              {/* An h2, like every other section heading on this page. The
                  roles beneath it are h3 and have to nest under something.

                  IT STANDS ALONE. It used to sit at col-span-5 of a 12-column
                  grid with a paragraph beside it carrying three unrelated jobs:
                  a reassurance, a location fact, and the apply address. That
                  paragraph is gone — the location was already on the row's own
                  tags and twice more in the panel's Details column, and the
                  other two have moved to the coda below the list. The earlier
                  rationale for putting the address here, "beside the list,
                  before they conclude there is nothing here for them", is
                  superseded: with one role the reader reaches the bottom of the
                  list immediately, so a coda under it is certain to be seen. */}
              <h2 className="h-display fs-h3 m-0 mb-10">Currently hiring.</h2>
            </Reveal>
            {/* Expand a role in place for the full brief. Each brief carries the
                address to send an application to; there is no form. */}
            <JobAccordion jobs={jobs} />

            {/*
              THE UNLISTED ROUTE.

              The address appears twice on this page, deliberately, because it
              serves two readers who never meet. The panel's HOW TO APPLY is for
              someone applying to a listed role and carries the subject-line
              convention. This is for someone no listed role fits, who will
              never open a panel — so it cannot live inside one. Each names its
              audience, which is what stopped them reading as a duplication.

              --text-body, not --text-tertiary: this is a working instruction,
              and the old paragraph was set in the least prominent text role
              while carrying the band's only accent — whispering and pointing at
              itself at once. No rule above it; the list's own closing hairline
              does that work.
            */}
            <Reveal>
              <div className="mt-12">
                {/* This block was the pattern's first instance, written out by
                    hand. It is the component now — same markup, same tokens, no
                    visual change — so the four other surfaces could adopt it
                    without each re-deriving it and drifting. LIGHT_BAND because
                    this section is white: the component takes the accent and
                    the text roles from the band rather than naming them. */}
                <EnquiryNote band={LIGHT_BAND} label="UNLISTED ROLES">
                  If no listed role fits, write to <EnquiryAddress band={LIGHT_BAND} /> with a
                  note on what you want to build. Every application is read by an engineer.
                </EnquiryNote>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ 02 · MANGALURU — DARK ═════════════════════════════════
            Origin, Regional Commitment and Back to Ooru, as one section. See
            note 1 at the top of the file. */}
        <section style={{ background: 'var(--ink)', color: 'var(--text-on-dark)' }}>
          <div className="container-x section-y">
            <Reveal>
              <SectionLabel number="02 / 03" label="Why Mangaluru" dark className="mb-10" />
              {/*
                STACKED, NOT SPLIT — AND THE ARGUMENT HAS ITS MIDDLE TERM BACK.

                This was a 5/7 grid with the headline left and the sentence
                right, the same shape Open Positions above it used, so the two
                sections read as one template run twice. It is one column now.
                Section 01 is transactional and stays quiet and asymmetric;
                this one is argumentative and stacks. That is the difference
                that stops them rhyming.

                The second sentence is new, and it is the hinge. The section
                ran headline (you should not have to leave) → premise (for
                decades, people had to) → "What we owe the region", and never
                said the thing that connects them: that we are building the
                work here. That sentence lived in the three sections this one
                replaced and did not survive the consolidation, which is why
                the commitments below read as a non sequitur.

                Claim → why the claim was needed → what we do about it →
                what that obliges us to. The eyebrow that said
                "Mangaluru · Bengaluru · Remote" is still gone; the role's own
                tags carry it.
              */}
              <h2 className="h-display h-display-dark fs-h2 m-0 measure-hero">
                You should not have to leave home to build <span className="text-amber on-dark">something serious.</span>
              </h2>
              <p className="stack-lead copy-lead measure-lead m-0" style={{ color: 'var(--text-on-dark-2)' }}>
                Coastal Karnataka has produced engineers for decades without offering them work worth staying
                for. We are building that work here.
              </p>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="meta mt-16 mb-8" style={{ color: 'var(--text-on-dark-3)' }}>What we owe the region</div>
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-11">
              {COMMITMENTS.map((c, i) => (
                <Reveal key={c.t} delay={i * 0.07} className="h-full">
                  <div className="h-full pt-7 pb-8" style={{ borderTop: '1px solid var(--night-line)' }}>
                    <div className="num-tag num-tag-dark mb-5">{String(i + 1).padStart(2, '0')}</div>
                    <h3 className="font-display font-semibold fs-sub m-0">{c.t}</h3>
                    <p className="copy-body m-0" style={{ color: 'var(--text-on-dark-2)', marginTop: 8 }}>{c.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══ 03 · FAQ — LIGHT ══════════════════════════════════════ */}
        <FAQ items={CAREERS_FAQ} number="03 / 03" label="FAQ" heading="Working here." />
      </main>
      <Footer variant="dark" />
    </div>
  );
}
