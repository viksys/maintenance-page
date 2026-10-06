import React, { useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import Seo from '@/components/Seo';

/*
  Meeting scheduler — an unlisted page.

  ─────────────────────────────────────────────────────────────────────────────
  "HIDDEN" HERE MEANS FOUR SEPARATE THINGS, AND ALL FOUR ARE LOAD-BEARING
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
  WHY THE BOOKING IS SOMEBODY ELSE'S WIDGET
  ─────────────────────────────────────────────────────────────────────────────

  Scheduling needs server state — which slots are gone — and the site is static
  files on GitHub Pages. This page previously posted to a Google Apps Script web
  app that created the calendar event directly. That is in the git history at
  docs/meet-scheduler.gs if it is ever wanted again; it was abandoned because it
  needs the Google Calendar API enabled on the Cloud project behind the script,
  and the auto-created project is one the account has no IAM access to — the
  console answers `resourcemanager.projects.get (Missing)` and there is no
  administrator to ask on a consumer account.

  Calendly owns the slots, the timezone conversion, the collision handling and
  the meeting link instead. It replaced Koalendar on 6 October 2026; a Doodle
  frame was tried in between and reverted, because it put a consent dialog
  naming 137 advertising partners inside this page ahead of the booking UI.

  ─────────────────────────────────────────────────────────────────────────────
  THIS IS THE ONLY THIRD-PARTY SCRIPT ON THE SITE
  ─────────────────────────────────────────────────────────────────────────────

  The README's claim of "no third-party scripts" stops being true with this file,
  and it is worth being clear about what that costs: assets.calendly.com executes
  JavaScript on our origin on this route, and the name, email and anything a
  visitor types go to them rather than to us. That is the trade for not running
  a server. It is confined to this one unlisted page.

  The embed is injected through the DOM rather than written as an inline <script>
  in index.html, for two reasons: CRA would not process it there anyway, and
  scripts/check-artifact.js fails the build on any executable inline script,
  because the Content-Security-Policy in vercel.json carries no 'unsafe-inline'.
  That policy is widened for assets.calendly.com in script-src, style-src and
  img-src — the widget injects its own stylesheet and images — and for
  calendly.com in frame-src and connect-src, because what it finally draws is an
  iframe to calendly.com. GitHub Pages serves no CSP at all, so on the live site
  the policy is documentation; a build that only works because nothing enforces
  the rules is not one to rely on.
*/

const WIDGET_SRC = 'https://assets.calendly.com/assets/external/widget.js';
const EVENT_URL = 'https://calendly.com/vikasanasystems';
const CONTAINER_ID = 'calendly-inline-widget-vikasana';

/*
  How long before the page offers a way out.

  Raised from 8s. Calendly's embed is a shell that then loads its own
  application inside the iframe, and on a slow connection that is comfortably
  more than eight seconds — so the old value declared a failure over a widget
  that was still arriving, which is the same false negative the careers form
  used to show on a timed-out upload.

  It no longer claims the calendar is broken either; see the copy below. This is
  the point at which a reader is offered the direct link, not the point at which
  we decide the widget has failed.
*/
const LOAD_TIMEOUT_MS = 20000;

export default function MeetScheduler() {
  /* 'loading' | 'ready' | 'failed' */
  const [state, setState] = useState('loading');
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    /*
      WARM BOTH CONNECTIONS BEFORE EITHER IS NEEDED.

      The embed costs two handshakes, in sequence: widget.js is fetched from
      assets.calendly.com, and only once it has run does the iframe it creates
      open a SECOND connection to calendly.com. Measured from here, 0.29s of the
      first request and 0.10s of the second are DNS and TLS — paid one after the
      other, with the second not even started until the first has finished.

      preconnect starts both handshakes now, in parallel, so the iframe's
      connection is already open when the script asks for it.

      These live here and NOT in public/index.html on purpose. A hint in the
      document head opens a connection to Calendly from EVERY page on the site,
      for a widget that exists on one unlisted route — a privacy cost paid by
      readers who will never see a calendar, to save time on a page they are not
      visiting.
    */
    const hints = ['https://assets.calendly.com', 'https://calendly.com'].map((href) => {
      const existing = document.querySelector(`link[rel="preconnect"][href="${href}"]`);
      if (existing) return null;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      return link;
    });

    /*
      Calendly has no queue shim, unlike Koalendar. widget.js scans the document
      for .calendly-inline-widget ON ITS OWN LOAD and initialises what it finds —
      which works on a first visit and does NOTHING on a return visit, because
      the script is already in the document and never loads again. React Router
      keeps this page mounted and unmounted within one document, so the second
      visit is the common case, not the edge one.

      Hence both paths: initialise explicitly when window.Calendly already
      exists, and let the script's own scan handle the first load.
    */
    const mount = () => {
      if (cancelled || !containerRef.current) return;
      if (!window.Calendly || typeof window.Calendly.initInlineWidget !== 'function') return;
      /* Guard against initialising twice — the script's own scan may already
         have done it, and a second call appends a second iframe. */
      if (containerRef.current.childElementCount > 0) return;
      window.Calendly.initInlineWidget({ url: EVENT_URL, parentElement: containerRef.current });
    };

    /* One <script> per document, not per mount. React StrictMode mounts twice
       in development, and a second copy would register the widget twice. */
    let script = document.querySelector(`script[src="${WIDGET_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = WIDGET_SRC;
      script.async = true;
      script.addEventListener('error', () => {
        if (!cancelled) setState('failed');
      });
      script.addEventListener('load', mount);
      document.body.appendChild(script);
    } else {
      /* Already present from an earlier visit to this route. */
      mount();
    }

    /*
      Watch the container rather than the script's load event. A loaded script
      that renders nothing is the failure a visitor actually experiences, and
      `load` firing says nothing about whether the widget drew anything.
    */
    const observer = new MutationObserver(() => {
      if (!cancelled && containerRef.current?.childElementCount > 0) {
        setState('ready');
        observer.disconnect();
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    const timer = setTimeout(() => {
      if (cancelled) return;
      /* setState with the current value is a no-op, so a widget that rendered
         between the observer firing and this timer cannot be un-readied. */
      setState((s) => (s === 'ready' ? s : 'failed'));
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      observer.disconnect();
      /* The connections themselves persist in the browser's pool, which is the
         point; only the hint elements go. */
      hints.forEach((link) => link && link.remove());
    };
  }, []);

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
              <p className="text-[14px] measure mb-8" style={{ color: 'var(--text-tertiary)' }}>
                Pick a time that suits you. Times are shown in your own timezone, and you will get a calendar
                invitation with a video link once the slot is confirmed.
              </p>

              {/*
                THE DEADLINE, ABOVE THE CALENDAR AND NOT BELOW IT.

                It is a condition of booking, so it has to be read before the
                choice is made rather than after. The calendar is a third-party
                widget: it does not know about this date and will keep offering
                slots past it, so this line is the only place a reader can learn
                that a later slot is not worth taking.

                --ink on a bordered plate rather than --text-tertiary. The
                paragraph above is context; this is a rule, and the one piece of
                copy on the page a reader cannot afford to skim.
              */}
              <div
                className="mb-10"
                style={{
                  borderLeft: '2px solid var(--amber)',
                  background: 'var(--stone-50)',
                  padding: '14px 18px',
                  maxWidth: 'var(--measure-sm)',
                }}
              >
                {/* --ink, not --amber-text. Measured on this plate, amber is
                    rgb(178,71,0) on rgb(216,222,219) = 4.06:1, under the 4.5:1
                    floor for 12px text — npm run contrast failed on exactly
                    this. The amber left border carries the accent instead,
                    where a border has no ratio to clear. */}
                <div className="meta mb-2" style={{ color: 'var(--ink)' }}>PLEASE NOTE</div>
                <p className="text-[13.5px]" style={{ color: 'var(--ink)', lineHeight: 1.65, margin: 0 }}>
                  Interviews end on 6 October. Anything scheduled after that date will not be considered.
                </p>
              </div>
            </Reveal>

            <Reveal>
              {/* aria-live so the state changes below are announced. The widget
                  manages its own focus once it has rendered. */}
              <div aria-live="polite">
                {state === 'loading' && (
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    Loading the calendar — this can take a few seconds.
                  </p>
                )}

                {/* Never a dead end. If the widget cannot render, the booking
                    page itself still works — and so does email. */}
                {state === 'failed' && (
                  <div
                    style={{
                      border: '1px solid var(--stone-100)',
                      padding: '18px 20px',
                      fontSize: 13.5,
                      color: 'var(--text-tertiary)',
                      lineHeight: 1.7,
                      maxWidth: 'var(--measure-sm)',
                    }}
                  >
                    The calendar is taking a while. It may still appear — an extension or network policy can
                    also block it. Either way you can book directly at{' '}
                    <a
                      href={EVENT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                    >
                      calendly.com/vikasanasystems
                    </a>
                    , or write to{' '}
                    <a
                      href="mailto:info@vikasanasystems.tech"
                      style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                    >
                      info@vikasanasystems.tech
                    </a>{' '}
                    and we will arrange a time.
                  </div>
                )}
              </div>

              {/* The class is Calendly's hook, kept so the script's own scan
                  finds it on a first load; data-url is what that scan reads.
                  min-width 320 and the height are from Calendly's own snippet —
                  the widget does not size itself. */}
              <div
                id={CONTAINER_ID}
                ref={containerRef}
                className="calendly-inline-widget"
                data-url={EVENT_URL}
                style={{ minWidth: 320, height: 700 }}
              />
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
