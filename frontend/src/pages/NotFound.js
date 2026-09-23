import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';

/*
  Previously the catch-all route rendered <Home />. That is a soft 404: an unbounded
  space of invalid URLs each returned the homepage at HTTP 200 with a self-referencing
  canonical, which invites a search engine to index every typo and every stale inbound
  link as a distinct page. This route is explicitly noindex and says what happened.

  A static host cannot return a real 404 status for a client-routed path. The `noindex`
  directive is what actually keeps these out of the index; the status code is secondary.
*/

const LINKS = [
  { to: '/', label: 'Home', note: 'Company overview' },
  { to: '/products/platform', label: 'VIKASANA Control', note: 'Control, Edge, and Core platforms' },
  {
    to: '/software/drishtikon',
    label: 'DRISHTIKON',
    note: 'Ground control and mission management',
  },
  { to: '/hardware', label: 'Hardware', note: 'Fielded compute and control devices' },
  { to: '/careers', label: 'Careers', note: 'Open roles' },
  { to: '/site-map', label: 'Site map', note: 'Every page on this site' },
];

export default function NotFound() {
  /* min-height is a class, not a style key. The correct declaration is the
     pair `min-height: 100vh; min-height: 100svh` — the first is the fallback a
     browser without the small-viewport unit keeps — and a React style object
     can hold only one value per property, so written inline it silently left
     Safari before 15.4 with no minimum height at all. */
  /* .on-dark, because this wrapper paints --ink inline. index.css remaps
     --text-secondary and --text-tertiary to their dark-band values inside that
     class, and a call site that sets a dark ground WITHOUT it renders the
     light-band greys on ink — which is what happened here: every .meta on the
     page resolved to a light-band value and failed against its own background.
     Setting `color` is not the same thing; that names one property, .on-dark
     names the scope. */
  return (
    <div className="vk-min-vh on-dark" style={{ background: 'var(--ink)', color: 'var(--text-on-dark)' }}>
      <Seo
        title="Page not found"
        description="The requested page does not exist on vikasanasystems.tech."
        noindex
      />
      <Header />
      <main id="main-content" tabIndex={-1}>
        <section
          style={{
            /* vh, not svh. A style object cannot carry the progressive pair the
               stylesheet uses, and the root of this page already takes .vk-min-vh
               for the full-viewport case. Here the value is a floor on a centred
               block, where svh's only effect would be to make it shorter on a
               mobile browser showing its toolbars — so the unit that works
               everywhere is also the one that reads better. */
            minHeight: '78vh',
            display: 'flex',
            alignItems: 'center',
            paddingInline: 'var(--vk-gutter)',
            paddingBlock: 'clamp(120px, 18vh, 200px)',
            color: 'var(--text-on-dark)',
          }}
        >
          <div style={{ width: '100%', maxWidth: '1360px', marginInline: 'auto' }}>
            <p className="meta"
              style={{ color: 'var(--amber)', marginBottom: '24px' }}>
              Error 404
            </p>
            <h1
              className="h-display h-display-dark"
              style={{
                fontSize: 'clamp(38px, 7vw, 74px)',
                margin: '0 0 24px',
                maxWidth: '18ch',
              }}
            >
              This page does not exist.
            </h1>
            <p
              style={{
                fontSize: 'clamp(15.5px, 1.2vw, 18px)',
                lineHeight: 1.65,
                maxWidth: 'var(--measure)',
                opacity: 0.8,
                margin: '0 0 56px',
              }}
            >
              The address may have changed, or the link that brought you here may be out of date.
              The pages below cover most of what people arrive looking for.
            </p>

            <nav aria-label="Suggested pages">
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gap: '1px',
                  background: 'var(--night-line)',
                  border: '1px solid var(--night-line)',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                }}
              >
                {LINKS.map((l) => (
                  <li key={l.to} style={{ background: 'var(--ink)' }}>
                    <Link
                      to={l.to}
                      style={{
                        display: 'block',
                        padding: '24px 22px',
                        minHeight: '44px',
                        color: 'inherit',
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        style={{
                          display: 'block',
                          fontSize: '16px',
                          marginBottom: '6px',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {l.label}
                      </span>
                      {/* An explicit dark-band token, and NO opacity.

                          This wrapper paints --ink but carries no .on-dark class,
                          so .meta resolved to --text-secondary — the light-band
                          muted grey — at 3.99:1 on ink. The 0.62 opacity then
                          composited that down to roughly 2.05:1, which is not a
                          near miss; it is less than half the 4.5:1 floor, on the
                          only guidance a visitor who followed a dead link gets.

                          --text-on-dark-3 is 4.90:1 on ink and is the named token
                          for exactly this role. Opacity is not reintroduced: it
                          multiplies against whatever the token is later changed
                          to, which is how the original passed review. */}
                      <span className="meta" style={{ color: 'var(--text-on-dark-3)' }}>
                        {l.note}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
