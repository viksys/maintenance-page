import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import { FlowButton } from '@/components/ui/flow-button';
import { SITE } from '@/data/seo';

/*
  ═══════════════════════════════════════════════════════════════════════════
  CONTACT US — /contact. REPLANNED 23 SEPTEMBER 2026
  ═══════════════════════════════════════════════════════════════════════════

  THE PAGE ANSWERS TWO QUESTIONS AND IS NAMED FOR THE ONE PEOPLE ASK.

The old /contact page and /talk-to-sales are both retired. This route is the
  only surface left that tells a reader how to reach the company, so the
  navigation, the site map and the metadata registry all call it Contact Us.

  AND SO DOES THE URL, since 23 September 2026. It was /locations, and an
  earlier pass left it there on the reasoning that renaming a live route is a
  redirect-and-sitemap decision rather than a navigation one. That reasoning
  was about cost, and it did not survive contact with the page: following a
  link labelled "Contact Us" and watching "locations" appear in the address bar
  is a mismatch a reader notices immediately and cannot explain, which is worse
  than the cost of the redirect. THE FILE IS STILL Locations.js — see the note
  in App.js for why the component was not renamed with the route.

  /locations still resolves. It is a client-side <Navigate> in App.js and a 308
  in vercel.json, both, because the edge redirect does not run in local dev.

  Order follows that name. The enquiry — one sentence and one button — is in
  the hero, above the fold, because it is what the page is for. Where we are
  follows it, because a reader who came for the address will scroll and a
  reader who came for the inbox should not have to.

  ONE ADDRESS, FROM ONE PLACE. lib/enquiry.js owned ENQUIRY_INBOX and is
  deleted. SITE.email in data/seo.js is what survives, it already feeds the
  Organization schema in the static head, and it is what this page and the
  Footer both read. Do not write the address out by hand in a third place —
  two copies is how the site ended up publishing a security@ inbox nobody
  watched.

  ONE PLACE, NAMED ONCE.

  The page listed three: a Mangaluru headquarters, a Bengaluru engineering
  office marked "(planned)", and a "Field / On-Site" card standing for deployed
  teams. Two of those were not locations. A planned office is an intention, and
  a card that reads "On-Site — Deployed teams" is a description of how trials
  work, not an address a reader can hold. Printed as three equal cards on a page
  headed "All Locations" they asserted a footprint the company does not have,
  which is the one claim a defence buyer checks first.

  The `locations` array is deleted with the section. Mangaluru is the whole
  answer, so the page states it once and stops.

  NOT "HEADQUARTERS". A headquarters implies the other offices it is the head
  of. With one place, the word overstates and the tag "HEADQUARTERS" on a page
  showing a single city reads as a gap where the rest of the list should be.
  We are BASED IN Mangaluru — the same fact, without the implied org chart.

  THE VISIT BAND IS GONE. A dark closing section headed "Come see the work" with
  two buttons, on a page whose remaining content already carries the address and
  the inbox. It invited visitors to a working engineering floor and then said
  visits are by appointment, which is an invitation and its own retraction in
  two consecutive sentences.

  THE MAP IS THE PLATE FROM /company, NOT THE LIVE COMPONENT. LocationMap drew
  an animated panel that resolved to the same city; the plate is a cartographic
  drawing of the registered office at its real coordinates, so it is content
  rather than motion. It moves here from the About page by direction. Note that
  it is 1200 × 647 — it sets its own height from its own aspect ratio, and the
  4:3 frame the live component needed is deliberately not around it.

  expand-map.jsx lost its only caller when the plate replaced the live map, and
  has since been deleted. The component and the decision to remove its one use
  were two separate calls; both have now been made.
*/

/*
  A bare mailto, with no subject and no body.

  The site used to compose these through lib/enquiry.js, which put a category
  tag in the subject line so an inbox list stayed legible. That module is
  deleted. Rather than hand-write half of a convention that no longer has
  anything to enforce it, this opens an empty message and lets the sender write
  their own subject — which is what the copy beside it asks them to do.
*/
const WRITE_TO_US = `mailto:${SITE.email}`;

export default function Locations() {
  return (
    <div>
      <Header variant="light" />
      <main id="main-content" tabIndex={-1}>
        <section className="relative" style={{ background: 'var(--white)' }}>
          <div className="absolute inset-0 grid-fine opacity-50" />
          <div className="container-x hero-x relative">
            <Reveal><div className="meta mb-6">{'// Contact Us'}</div></Reveal>
            <Reveal delay={0.1}>
              <h1 className="h-display fs-hero measure-hero">
                Built in India,<br />for <span className="text-amber">the mission.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="stack-lead measure-copy copy-lead" style={{ color: 'var(--text-tertiary)' }}>
                Indigenous engineering with hardware and software developed together, from Mangaluru on India&rsquo;s
                western coastline. Our teams work close to the bench and close to the field.
              </p>
            </Reveal>

            {/* THE ENQUIRY.

                One inbox, stated in words and then given a control. The address
                is set in --amber-text rather than the brand accent: this is an
                inline link on a paper band, where #FF6A00 measures 2.52:1 and
                cannot carry text. See the colour note in CLAUDE.md.

                `ink` is the filled primary on a light band — this is the only
                action on the page, so it takes the primary treatment rather
                than the outline. */}
            <Reveal delay={0.28}>
              <p className="copy-body measure-copy mt-8 m-0" style={{ color: 'var(--ink)' }}>
                For all queries and for information, write to us at{' '}
                <a
                  href={WRITE_TO_US}
                  style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                >
                  {SITE.email}
                </a>
                .
              </p>
            </Reveal>
            <Reveal delay={0.34}>
              <div className="mt-7">
                <FlowButton href={WRITE_TO_US} variant="ink" text="Write to Us" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* One section, so no "01 / 02" counter in front of the label. The
            number was counting a list that no longer has a second entry. */}
        {/* .on-stone: --amber-display is calibrated against --white and drops to
            2.81:1 on this ground, which fails even the large-text floor. The class
            maps it to --amber-text for this section. See index.css. */}
        <section className="on-stone" style={{ background: 'var(--stone-50)' }}>
          <div className="container-x section-y-sm">
            <Reveal>
              {/* items-start, not items-center.

                  The column on the left runs a label, a heading, two
                  paragraphs and two rows — call it 450px. The plate beside it
                  is 1200 x 647, so in a ~576px column it renders about 311px
                  tall. LocationMap filled a 4:3 frame and roughly matched the
                  column's height, which is why centring was right for it and
                  is wrong for this: a short plate centred against a tall column
                  floats, with unequal air above and below and its top edge
                  aligned to nothing. Aligned to the top it starts on the same
                  line as the section label, which is the alignment every other
                  grid on this site keeps. */}
              <div className="grid md:grid-cols-2 gap-12 items-start">
                <div>
                  <SectionLabel label="Where We Are" className="mb-8" />
                  <h2 className="h-display fs-h2 mb-6">Based in Mangaluru, <span className="text-amber">Karnataka.</span></h2>
                  <p className="text-[14px] leading-relaxed mb-4 measure" style={{ color: 'var(--text-tertiary)' }}>
                    We are based in Mangaluru, with engineering, integration, and operations together — hardware
                    bench, software, and systems in the same building.
                  </p>
                  <p className="text-[14px] leading-relaxed mb-10 measure" style={{ color: 'var(--text-tertiary)' }}>
                    Mangaluru is a deliberate choice. We are among the early indigenous defence technology
                    companies emerging from the region, and part of the growing Silicon Beach ecosystem working to
                    turn Coastal Karnataka from an education hub into a technology one.
                  </p>
                  <div>
                    {/* GENERAL and CAREERS both resolved to the same address,
                        which printed one inbox twice under two labels. One row,
                        labelled for what it is — and it is the reference
                        listing, not the call to action. The invitation is in
                        the hero, where a reader looking for it will find it
                        without scrolling. */}
                    {[
                      { k: 'ADDRESS', v: 'Mangaluru, Karnataka, India' },
                      { k: 'EMAIL', v: SITE.email },
                    ].map((r) => (
                      <div key={r.k} className="grid grid-cols-3 gap-4 py-4" style={{ borderBottom: '1px solid var(--stone-100)' }}>
                        {/* --text-tertiary, not .meta's default --stone-500.
                            This block is on --stone-50, and the extra step of
                            ground costs it: --stone-500 is 5.43:1 on paper but
                            4.52:1 here — it clears the 4.5:1 floor for 12px
                            text by two hundredths, which is not a margin to
                            build on. --text-tertiary is 6.01:1. Same choice,
                            same
                            reason, as the PGP fingerprint block in
                            SecurityPolicy.js — that is the site's other
                            muted-grey-on-stone-50 case. */}
                        <div className="meta" style={{ color: 'var(--text-tertiary)' }}>{r.k}</div>
                        <div className="col-span-2 text-[13.5px]" style={{ color: 'var(--ink)' }}>{r.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* The map plate, moved here from /company. No aspect-ratio
                    frame around it: the file is 1200 × 647 and the wrapper the
                    live component needed was 4 : 3, which would letterbox it.
                    Width and height are declared so the column does not reflow
                    when the file decodes.

                    12.9141° N, 74.8560° E — the pair the Careers hero rail and
                    the rest of the site use. The plate arrived carrying a
                    second pair in its alt text; one office does not get two
                    sets of coordinates.

                    DESATURATED, BY DIRECTION — THE ONE BLUE ON THE SITE.

                    The plate is a cartographic export and it arrived with the
                    convention baked in: water in cool blue-grey. Sampled off
                    the file, the Arabian Sea and the estuary run rgb(201, 204,
                    210) against land at rgb(249, 243, 238) — blue three points
                    over red in the water, red eleven over blue on the paper.
                    Nine points of blue is nothing as a number and obvious on
                    the page, because it is the only cool hue anywhere on this
                    site. The palette is warm-to-green greys and one amber:
                    --stone-50 is #D8DEDB, --stone-100 is #C7CFCB, both tilted
                    green. The water sat at almost exactly stone-100's lightness
                    tilted the other way, so it read as a blue patch on a green
                    band.

                    grayscale(1) takes the water to rgb(204, 204, 204) and the
                    paper to rgb(244, 244, 244): the hue is gone and nothing
                    else moves. Warming it back with sepia() was tried and
                    rejected — at any strength that shifts the water visibly,
                    the paper clips to 255 and the map loses its lightest
                    linework.

                    THE FILE ON DISK IS UNTOUCHED, the same principle as the
                    footer lockup: the correction is applied on display, so a
                    re-exported plate with neutral water drops straight in and
                    this line comes off. There is no image tooling in this
                    project to recolour the asset properly. */}
                <img
                  src="/assets/img/mangaluru-map.webp"
                  alt="Street map of Mangaluru, Karnataka, on the Arabian Sea coast — 12.9141° N, 74.8560° E"
                  width={1200}
                  height={647}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto"
                  style={{ border: '1px solid var(--stone-100)', filter: 'grayscale(1)' }}
                />
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer variant="dark" />
    </div>
  );
}
