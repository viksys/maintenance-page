import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import Seo from '@/components/Seo';

/*
  Meeting scheduler — an unlisted page.

  ─────────────────────────────────────────────────────────────────────────────
  "HIDDEN" MEANS FOUR SEPARATE THINGS, AND ALL FOUR ARE LOAD-BEARING
  ─────────────────────────────────────────────────────────────────────────────

  1. Nothing links to it. Not the header, not the footer, not /site-map.
  2. <Seo noindex> — search engines are asked not to index it.
  3. It is excluded from sitemap.xml, via scripts/hidden-routes.js.
     scripts/generate-seo.js harvests every literal route in App.js into the
     sitemap by default, so this route would otherwise publish itself.
  4. The prerendered shell is written `noindex, follow` with no canonical.
     THIS IS THE ONE THAT MATTERS: <Seo> runs inside the bundle, so a crawler
     that does not execute JavaScript reads the shell and nothing else.

  It is still prerendered, so the URL answers HTTP 200. GitHub Pages has no
  rewrite rule, and a route with no built directory falls through to 404.html.

  None of that is access control. The route is in the public bundle, so anyone
  who reads it can find the URL. Unlisted is not private.

  ─────────────────────────────────────────────────────────────────────────────
  DOODLE, IN A FRAME — AND WHAT THAT COSTS
  ─────────────────────────────────────────────────────────────────────────────

  Scheduling needs server state, which a static site on GitHub Pages does not
  have. Two earlier attempts are in the git history: a Google Apps Script that
  created the event directly (abandoned — a Meet link needs the Calendar
  advanced service or the REST API enabled on a hidden Cloud project the account
  has no IAM on), and a Koalendar widget (replaced by this).

  THIS IS A FRAME, NOT A SCRIPT, AND THAT IS AN IMPROVEMENT. Koalendar injected
  JavaScript that ran on our own origin with full access to this document. An
  iframe executes in Doodle's origin and can read nothing here. The site is back
  to shipping no third-party JavaScript at all.

  WHAT IT DOES COST: doodle.com opens with its own consent dialog naming 137
  advertising partners, and it appears INSIDE this page before the booking UI is
  usable. We do not control that dialog, cannot suppress it, and anyone booking a
  call with us meets it first. The link below the frame is not only a fallback —
  it is the route for anyone who would rather meet that dialog on Doodle's own
  domain than on ours.
*/

const BOOKING_URL = 'https://doodle.com/bp/vikasana/interview';

export default function MeetScheduler() {
  return (
    <div>
      <Seo
        title="Schedule a Call"
        description="Pick a time for a short introductory call with VIKASANA Systems."
        noindex
      />
      <Header variant="light" />

      <main id="main-content" tabIndex={-1}>
        <section style={{ background: 'var(--white)' }}>
          <div className="container-x section-y">
            <Reveal>
              <SectionLabel number="01 / 01" label="Schedule" amber className="mb-10" />
              <h1 className="h-display fs-h2 mb-6">
                Book a <span className="text-amber">call.</span>
              </h1>
              <p className="text-[14px] measure mb-10" style={{ color: 'var(--text-tertiary)' }}>
                Pick a time that suits you. Times are shown in your own timezone, and you will get a calendar
                invitation once the slot is confirmed.
              </p>
            </Reveal>

            <Reveal>
              {/*
                title is the frame's accessible name. Without it a screen reader
                announces an unnamed frame and the reader has no idea what it
                holds — and this one holds the entire purpose of the page.

                No `sandbox`: the booking flow needs scripts, forms, popups and
                its own storage, and a sandbox permissive enough to allow all of
                those restricts nothing worth restricting. Origin isolation is
                what is actually doing the work here.

                The height is generous because the frame cannot tell us how tall
                its content is — cross-origin, there is no resize message to
                listen for — and a short frame puts the booking UI behind an
                inner scrollbar.
              */}
              <iframe
                src={BOOKING_URL}
                title="Booking calendar — VIKASANA Systems"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                style={{
                  width: '100%',
                  height: 'min(1100px, 150vh)',
                  minHeight: 620,
                  border: '1px solid var(--stone-100)',
                  background: 'var(--white)',
                  display: 'block',
                }}
              />

              {/* Always present, never conditional. A cross-origin frame gives
                  no reliable signal that it failed — onload fires for an error
                  page too — so there is nothing to branch on, and a route out
                  that only appears when we detect a problem would never appear. */}
              <p className="text-[13px] mt-5" style={{ color: 'var(--text-tertiary)', lineHeight: 1.7 }}>
                If the calendar does not load, book directly at{' '}
                <a
                  href={BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                >
                  doodle.com/bp/vikasana/interview
                </a>
                , or write to{' '}
                <a
                  href="mailto:info@vikasanasystems.tech"
                  style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                >
                  info@vikasanasystems.tech
                </a>{' '}
                and we will arrange a time.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
