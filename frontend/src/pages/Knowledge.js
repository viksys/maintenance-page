import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import Seo from '@/components/Seo';
import { termAnchor } from '@/lib/slug';

/*
  Knowledge base — plain definitions of the vocabulary used across autonomous
  defence, written to be genuinely useful rather than to sell.

  Structure is deliberate: each term is an <article> with an <h2> matching the
  question people actually type, a one-sentence definition that can be lifted
  cleanly by an answer engine, then context, then a link to the relevant page.
  DefinedTermSet schema is emitted for the whole set.
*/

const TERMS = [
  {
    term: 'Ground Control Station (GCS)',
    short:
      'A ground control station is the system an operator uses to plan, command, and monitor an unmanned vehicle and its payloads.',
    body:
      'A GCS typically provides mission planning, live telemetry, mapping, sensor and video feeds, and the command interface to the platform. Most platforms ship with a proprietary station tied to that vendor, which is why an operator running several types of system traditionally has to move between several stations, each with its own interface and training burden.',
    /* /software/drishtikon, not /hardware/gcs-x. The latter was a hardware URL
       carrying a record named DRISHTIKON — the software platform, mis-filed —
       and it has been retired. The edge 301s it here, but a link that relies on
       a redirect is a link that breaks the day the redirect is tidied away. */
    to: '/software/drishtikon',
    linkLabel: 'DRISHTIKON Ground Control Station',
  },
  {
    term: 'Command and Control (C2)',
    short:
      'Command and control is the exercise of authority over assigned forces and assets, and the systems that make that authority possible.',
    body:
      'In software terms, C2 covers the shared picture of what is happening, the means to task assets against it, safety gating so that unsafe commands cannot be issued by accident, and an auditable record of who ordered what and when. Human authority over the decision chain is the defining constraint, not an optional feature.',
    to: '/products/platform',
    linkLabel: 'VIKASANA Control',
  },
  {
    term: 'Mission Management',
    short:
      'Mission management is the layer that plans, coordinates, and tracks a mission across its full lifecycle, rather than flying a single vehicle moment to moment.',
    body:
      'It spans planning and rehearsal, allocation of tasks across available assets, monitoring progress against the plan, adaptation when conditions change, and post-mission replay and audit. Where control answers "fly this platform", mission management answers "achieve this objective with whatever is available".',
    to: '/products/handheld',
    linkLabel: 'VIKASANA Core',
  },
  {
    term: 'Tactical Edge Computing',
    short:
      'Tactical edge computing is processing data on or near the device that collected it, at the forward edge of operations, instead of sending it to a central data centre.',
    body:
      'It exists because forward operations run on connectivity that is contested, intermittent, or absent. Local inference and sensor fusion keep a unit functional when the link to command degrades, with data synchronising upward opportunistically once a connection returns. Designing edge-first means treating the disconnected case as the baseline and connectivity as the bonus.',
    to: '/products/field-station',
    linkLabel: 'VIKASANA Edge',
  },
  {
    term: 'Sensor Fusion',
    short:
      'Sensor fusion combines data from multiple sensors into a single, more reliable picture than any one sensor could produce alone.',
    body:
      'Correlating electro-optical video, infrared, radar returns, and positional data into one track for a detected object is a typical example. Fusion reduces the operator burden of mentally reconciling separate feeds and improves confidence where individual sensors are degraded, obscured, or in disagreement.',
  },
  {
    term: 'Common Operational Picture (COP)',
    short:
      'A Common Operational Picture is a single shared display of the operational situation, used by everyone involved so all parties work from the same information.',
    body:
      'A COP aggregates asset positions, sensor tracks, platform status, and mission state into one view. Its value is coordination: without it, units act on different and occasionally contradictory versions of the same situation, and reconciling them costs exactly the time an operation does not have.',
    to: '/software/drishtikon',
    linkLabel: 'DRISHTIKON',
  },
  {
    term: 'Interoperability',
    short:
      'Interoperability is the ability of systems from different manufacturers to work together without bespoke rework for every pairing.',
    body:
      'It is achieved through documented, open interfaces and a common data model, so adding a platform becomes an integration task rather than a new development programme. The absence of interoperability is what caps how many systems a single operator or unit can realistically manage.',
  },
  {
    term: 'Multi-Domain Operations (MDO)',
    short:
      'Multi-domain operations means coordinating activity across more than one operational domain — air, land, sea, space, and cyber — as one effort rather than separate campaigns.',
    body:
      'For unmanned systems this means air, ground, and maritime platforms feeding one shared operational picture and being taskable through one command layer. Achieving it depends less on new platforms than on whether the architecture beneath them was designed for a second and third domain from the start.',
    to: '/software/drishtikon',
    linkLabel: 'DRISHTIKON',
  },
  {
    term: 'ISR — Intelligence, Surveillance, Reconnaissance',
    short:
      'ISR is the collection and processing of information about an operating environment in order to support decisions.',
    body:
      'Surveillance is sustained observation of an area, reconnaissance is targeted information gathering, and intelligence is the analysed product derived from both. The limiting factor in modern ISR is rarely collection — sensors produce far more than any cell can review — but the path from what was collected to an answer the requesting unit can act on.',
  },
  {
    term: 'Software-Defined Defence',
    short:
      'Software-defined defence is an approach where capability is delivered, changed, and upgraded primarily through software rather than through new physical platforms.',
    body:
      'The argument for it is the update cycle. Software can adapt in weeks to a new threat or integration requirement where a hardware programme takes years. It also relocates the source of advantage from what equipment a force owns to how well that equipment is coordinated.',
  },
  {
    term: 'Mission Planning',
    short:
      'Mission planning is the process of defining objectives, routes, timings, payload tasking, and contingencies before an operation begins.',
    body:
      'Good planning software makes constraints explicit — airspace, endurance, sensor coverage, communications range — and allows a plan to be rehearsed and revised before anything is committed. It also produces the baseline against which live execution is monitored.',
  },
  {
    term: 'Safety Gating',
    short:
      'Safety gating is the practice of validating commands against defined safety rules before they reach a platform, so that unsafe actions are blocked rather than merely discouraged.',
    body:
      'Gates might check geofence boundaries, altitude and airspace limits, link status, or the operator authority level associated with a given command. Implementing the check in the architecture rather than in the user interface is what makes it dependable, since interfaces can be bypassed and misread.',
    to: '/products/platform',
    linkLabel: 'VIKASANA Control',
  },
];

/*
  Module scope, because it is a constant. A fresh array literal in the component
  body is a new identity on every render, and <Seo> keys its effect on the props
  it receives — so an array that never changes would still have torn down and
  re-appended this page's JSON-LD on every single render. A value that does not
  depend on props or state has no reason to be rebuilt per render at all, and
  writing it here is stronger than memoising it: there is nothing left to get
  the dependency list of.
*/
const BREADCRUMB = [['Knowledge Base', '/knowledge']];

export default function Knowledge() {
  /*
    Same defect, same fix as src/pages/HardwareDetail.js documents: <Seo> lists
    its props in a useEffect dependency array, so an object literal built in the
    component body makes the effect tear down and rewrite the document's JSON-LD
    <script> on every render. Derived from TERMS, which is a module constant, so
    the dependency list is empty and the node is built once per mount.
  */
  const schema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: 'Defence Technology Knowledge Base',
      description:
        'Definitions of core terms in autonomous defence: ground control stations, command and control, mission management, tactical edge computing, sensor fusion, interoperability, multi-domain operations, ISR, and software-defined defence.',
      url: 'https://vikasanasystems.tech/knowledge',
      hasDefinedTerm: TERMS.map((t) => ({
        '@type': 'DefinedTerm',
        name: t.term,
        description: t.short,
        inDefinedTermSet: 'https://vikasanasystems.tech/knowledge',
      })),
    }),
    [],
  );

  return (
    <div>
      {/* The route-level <Seo> in App.js already writes this page's title,
          description, canonical and its WebPage node from the /knowledge entry
          in the registry. This instance exists only to add what the registry
          cannot express: the breadcrumb trail and the DefinedTermSet.

          `type` is deliberately a value outside the set Seo.js switches on.
          Seo.js emits one built-in schema node per known type, so letting type
          fall back to the registry's 'faq' would append a second, byte-identical
          WebPage node alongside the one App.js already wrote. Opting out keeps
          this instance purely additive. og:type is unaffected — it resolves to
          'website' for every type except 'article'. */}
      <Seo type="additive" schema={schema} breadcrumb={BREADCRUMB} />
      <Header variant="light" />
      <main id="main-content" tabIndex={-1}>
        <section className="relative" style={{ background: 'var(--white)' }}>
          <div className="absolute inset-0 grid-fine opacity-50" />
          <div className="container-x hero-x relative">
            <Reveal>
              <div className="meta mb-6">{'// Knowledge Base'}</div>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="h-display fs-hero measure-hero">
                The vocabulary of <span className="text-amber">autonomous defence.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="stack-lead measure-copy copy-lead" style={{ color: 'var(--text-tertiary)' }}>
                Plain definitions of the terms used across mission systems — what they mean, why they exist, and
                where they matter operationally. Written to be useful whether or not you ever talk to us.
              </p>
            </Reveal>
          </div>
        </section>

        <section style={{ background: 'var(--white)' }}>
          <div className="container-x section-y">
            <Reveal><SectionLabel number="01 / 01" label="Definitions" className="mb-10" /></Reveal>
            <div className="grid md:grid-cols-2 gap-x-14">
              {TERMS.map((t, i) => (
                <Reveal key={t.term} delay={(i % 2) * 0.06}>
                  <article
                    id={termAnchor(t.term)}
                    className="py-8"
                    style={{
                      borderTop: i < 2 ? '1px solid var(--stone-100)' : 'none',
                      borderBottom: '1px solid var(--stone-100)',
                    }}
                  >
                    <div className="num-tag mb-4">{String(i + 1).padStart(2, '0')}</div>
                    <h2 className="font-display font-semibold text-[20px] mb-3">{t.term}</h2>
                    <p className="measure text-[14px] leading-relaxed mb-3" style={{ color: 'var(--ink)' }}>{t.short}</p>
                    <p className="measure text-[13.5px] leading-relaxed mb-5" style={{ color: 'var(--text-tertiary)' }}>{t.body}</p>
                    {t.to && (
                      <Link to={t.to} className="meta hover:text-[color:var(--ink)] transition-colors">
                        {t.linkLabel.toUpperCase()} →
                      </Link>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer variant="dark" />
    </div>
  );
}
