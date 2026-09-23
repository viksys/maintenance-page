import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import { band } from '@/lib/bands';
import ImagePlaceholder from '@/components/ImagePlaceholder';
import { IconArrowRight } from '@/components/Icon';

/*
  Generic, on-brand index/listing page used by Software and Hardware. Reuses
  the existing design system.

  The <main> landmark lives here, not in the pages that render this component.
  A page delegating its whole shell to this layout has no chrome of its own, so
  putting a landmark on both sides would emit two <main> elements on one route —
  which is invalid, and leaves assistive technology without a single "skip to
  content" target. One landmark per rendered route, owned by whoever owns the
  Header and Footer around it.
*/
export default function CollectionPage({
  eyebrow,
  title,
  titleAmber,
  intro,
  items = [],
  basePath,
  sectionLabel,
  note,
  bandImage,
  bandFit = 'contain',
  bandLabel = 'MISSION SYSTEMS',
  cardCols = 'lg:grid-cols-3',
  ctaTitle = 'Bring it to your mission.',
  ctaText = 'Technical briefings for defence organisations, integrators, and government customers.',
}) {
  /* Bands by position; see lib/bands.js. Three sections, so dark / light /
     dark, and the closing call to action inherits whichever tone that leaves
     rather than being pinned to ink as it was. */
  const B0 = band(0);
  const B1 = band(1);
  const B2 = band(2);

  return (
    <div>
      <Header variant="light" />
      <main id="main-content" tabIndex={-1}>
        {/* .on-dark when band 0 is dark. `titleAmber` below renders through .text-amber,
           which resolves var(--amber-text) in index.css: a light-band token at
           3.38:1 on ink. The marker fixes it for the subtree rather than
           forking the class. */}
        <section className={`relative${B0.tone === 'dark' ? ' on-dark' : ''}`} style={{ background: B0.bg, color: B0.fg }}>
          <div className="absolute inset-0 grid-fine opacity-50" />
          {/* Text on 5, visual on 7, top-aligned — the index visual now sits beside
              the headline instead of in a band the user had to scroll to reach. */}
          <div className="container-x hero-x relative">
            <div className={bandImage ? 'hero-grid' : ''}>
              <div>
                <Reveal><div className="meta mb-6">{eyebrow}</div></Reveal>
                <Reveal delay={0.1}>
                  <h1 className={`h-display ${bandImage ? 'fs-hero-sm' : 'fs-hero measure-hero'}`}>
                    {title}{titleAmber && (<><br /><span className="text-amber">{titleAmber}</span></>)}
                  </h1>
                </Reveal>
                {intro && (
                  <Reveal delay={0.2}>
                    <p className={`stack-lead copy-lead ${bandImage ? 'measure-lead' : 'measure-copy'}`} style={{ color: B0.body }}>{intro}</p>
                  </Reveal>
                )}
              </div>

              {bandImage && (
                <Reveal delay={0.18} className="hero-visual">
                  <ImagePlaceholder ratio="16/9" label={bandLabel} spec="16:9 · LANDSCAPE · CONTAINED">
                    {/* alt is empty on purpose. The band image sits beside the
                        page <h1> and its label duplicated the heading, so a
                        screen reader read the same words twice. It is decorative
                        next to the heading it accompanies. */}
                    <img src={bandImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: bandFit }} />
                  </ImagePlaceholder>
                </Reveal>
              )}
            </div>
          </div>
        </section>

        {/* Cards start immediately after the hero — collection pages share this
            rhythm so none of them reads as a detached band. */}
        <section style={{ background: B1.bg, color: B1.fg }}>
          <div className="container-x section-after-hero section-pb">
            <Reveal><SectionLabel number="01 / 01" label={sectionLabel} className="mb-8" /></Reveal>
            <div className={`grid md:grid-cols-2 ${cardCols} gap-x-8 gap-y-10`}>
              {items.map((it, i) => (
                /* h-full on the wrapper AND on the card: a grid item stretches
                   to its row by default, but the <a> inside it does not inherit
                   that height unless it is told to. Without both, the card ends
                   where its own text ends and the row shows four different
                   bottom edges. */
                <Reveal key={it.slug} delay={(i % 4) * 0.07} className="h-full">
                  <Link
                    to={`${basePath}/${it.slug}`}
                    className="group card flex h-full flex-col"
                    style={{ padding: 0 }}
                  >
                    {/*
                      object-cover for every tile, ignoring the record's
                      `imageFit`. That field exists for the detail page, where a
                      console screenshot must be shown whole; at thumbnail size
                      it letterboxed some tiles and filled others, so a row of
                      cards showed some images floating on the placeholder's
                      grey with its corner marks and label visible around them,
                      and others running edge to edge. That was the single
                      largest source of the grid reading as uneven.

                      The placeholder keeps its label for records that have no
                      image at all; a real image now always covers it.
                    */}
                    {/*
                      The placeholder's label and spec are suppressed when a
                      real image exists. They are scaffolding for a record with
                      no artwork; behind an image they are either invisible
                      (covered) or, for the moment before it paints, a tile
                      reading "4:3 · LANDSCAPE" to the visitor.

                      Loading stays eager and decoding stays synchronous, as
                      both were. Deferring 22 thumbnails sounds like a win and
                      is not one here: they are the content of the page.
                      `loading="lazy"` replaced them with placeholder tiles on
                      first paint, and `decoding="async"` let the paint happen
                      before the decode finished, which produced the same empty
                      tiles for a different reason. Neither attribute belongs on
                      an image that is the point of the card.
                    */}
                    <ImagePlaceholder
                      ratio="4/3"
                      label={it.image ? '' : it.kicker}
                      spec={it.image ? undefined : '4:3 · LANDSCAPE'}
                    >
                      {it.image && (
                        <img
                          src={it.image}
                          alt={it.name}
                          className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </ImagePlaceholder>

                    <div className="flex flex-1 flex-col p-7">
                      <div className="meta meta-amber mb-3">{it.kicker}</div>

                      {/* Two lines reserved whether the name needs them or not,
                          so every summary in a row starts on the same baseline.
                          2.4em is two lines at leading-snug. */}
                      <div
                        className="font-display font-semibold text-[19px] mb-2 leading-snug line-clamp-2"
                        style={{ minHeight: '2.4em' }}
                      >
                        {it.name}
                      </div>

                      {/* Not clamped. Summaries run three or four lines and
                          clamping cut most of them mid-sentence, which reads
                          worse than an uneven block of copy. Evenness is bought
                          by the stretched card and the pinned row below, not by
                          truncating the writing. */}
                      <div className="text-[13px] leading-relaxed" style={{ color: B1.body }}>
                        {it.summary}
                      </div>

                      {/* mt-auto pins this to the bottom of a stretched card, so
                          the EXPLORE rows across a row sit on one line however
                          long each summary runs. */}
                      <div className="mt-auto flex items-center justify-between pt-6">
                        <span className="meta transition-colors group-hover:text-[color:var(--ink)]">EXPLORE</span>
                        <span className="transition-transform duration-300 group-hover:translate-x-1"><IconArrowRight width={16} height={16} /></span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
            {note && (
              <Reveal>
                <div className="mt-12 flex items-start gap-3 px-5 py-4 measure" style={{ background: B1.surfaceAlt, border: `1px solid ${B1.surfaceBorder}` }}>
                  <span className="w-2 h-2 mt-1.5" style={{ background: 'var(--amber)' }} />
                  <div className="text-[13px] leading-relaxed" style={{ color: B1.body }}>{note}</div>
                </div>
              </Reveal>
            )}
          </div>
        </section>

        <section style={{ background: B2.bg, color: B2.fg }}>
          <div className="container-x section-y">
            <Reveal>
              {/*
                THE WHOLE BAND IS THE ENQUIRY, so the eyebrow is its label and
                there is no second one inside it — see components/EnquiryNote.js
                for the inline form used where a note sits in a band about
                something else.

                "Enquiries", not "Get Started": that was button-speak pointing
                at an action that no longer exists.

                The description and the instruction are separated by ROLE, not
                by a gap. They were two <p> with identical class and colour,
                which is why the second read as randomly appended — `bodyStrong`
                is the working-instruction step above `body`.
              */}
              <SectionLabel label="Enquiries" dark amber className="mb-10" />
              {/* The 3-column grid that was here held a button stack in its
                  third column, aligned by items-end. The buttons are gone and
                  nothing earns the column, so it is collapsed rather than
                  refilled; `measure` already governs line length. */}
              <h2 className="h-display h-display-dark fs-h2">{ctaTitle}</h2>
              <p className="mt-6 text-[15px] measure" style={{ color: B2.body }}>{ctaText}</p>
              {/* `B2.accent`, not a named token: this band's tone follows the
                  page rhythm and the accent has to follow it, or the link fails
                  contrast on one of the two. */}
              <p className="mt-6 text-[15px] measure" style={{ color: B2.bodyStrong }}>
                To arrange one, write to{' '}
                <a
                  href="mailto:info@vikasanasystems.tech"
                  style={{ color: B2.accent, textDecoration: 'underline' }}
                >
                  info@vikasanasystems.tech
                </a>
                .
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer variant="dark" />
    </div>
  );
}
