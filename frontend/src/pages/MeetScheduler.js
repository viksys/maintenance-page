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

  Koalendar owns the slots, the timezone conversion, the collision handling and
  the Meet link instead.

  ─────────────────────────────────────────────────────────────────────────────
  THIS IS THE ONLY THIRD-PARTY SCRIPT ON THE SITE
  ─────────────────────────────────────────────────────────────────────────────

  The README's claim of "no third-party scripts" stops being true with this file,
  and it is worth being clear about what that costs: koalendar.com executes
  JavaScript on our origin on this route, and the name, email and any message a
  visitor types go to them rather than to us. That is the trade for not running
  a server. It is confined to this one unlisted page.

  The embed is injected through the DOM rather than written as an inline <script>
  in index.html, for two reasons: CRA would not process it there anyway, and
  scripts/check-artifact.js fails the build on any executable inline script,
  because the Content-Security-Policy in vercel.json carries no 'unsafe-inline'.
  That policy has been widened for koalendar.com in script-src, frame-src and
  connect-src. GitHub Pages serves no CSP at all, so on the live site the policy
  is documentation — but a build that only works because nothing enforces the
  rules is not one to rely on.
*/

const WIDGET_SRC = 'https://koalendar.com/assets/widget.js';
const EVENT_URL = 'https://koalendar.com/e/meet-with-vikasana';
const CONTAINER_ID = 'inline-widget-meet-with-vikasana';

/* If the widget has not rendered by now, assume it is not going to. Blocked by
   an extension, an offline device, or koalendar being down all look the same
   from here, and all of them leave an empty box unless something says so. */
const LOAD_TIMEOUT_MS = 8000;

export default function MeetScheduler() {
  /* 'loading' | 'ready' | 'failed' */
  const [state, setState] = useState('loading');
  const containerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    /*
      The queue shim from Koalendar's own snippet. It has to exist before the
      inline() call below, because widget.js is async: the call almost always
      happens first, and the shim is what holds it until the real
      implementation arrives and drains the queue.
    */
    if (!window.Koalendar) {
      window.Koalendar = function Koalendar() {
        (window.Koalendar.props = window.Koalendar.props || []).push(arguments);
      };
    }

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
      document.body.appendChild(script);
    }

    window.Koalendar('inline', { url: EVENT_URL, selector: `#${CONTAINER_ID}` });

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
              <p className="text-[14px] measure mb-10" style={{ color: 'var(--text-tertiary)' }}>
                Pick a time that suits you. Times are shown in your own timezone, and you will get a calendar
                invitation with a video link once the slot is confirmed.
              </p>
            </Reveal>

            <Reveal>
              {/* aria-live so the state changes below are announced. The widget
                  manages its own focus once it has rendered. */}
              <div aria-live="polite">
                {state === 'loading' && (
                  <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                    Loading the calendar…
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
                    The calendar did not load — an extension or network policy may be blocking it. Book directly
                    at{' '}
                    <a
                      href={EVENT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                    >
                      koalendar.com/e/meet-with-vikasana
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

              <div id={CONTAINER_ID} ref={containerRef} style={{ minHeight: state === 'ready' ? 0 : undefined }} />
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
