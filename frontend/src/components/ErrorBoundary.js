import React from 'react';

/*
  A single uncaught exception in any render or effect unmounts the entire React root
  and leaves the visitor looking at a blank white document with no explanation and no
  way forward. That failure mode is unacceptable on a site whose whole argument is
  that systems should degrade predictably.

  This boundary contains the failure to a readable page with a route back. It does not
  attempt recovery — a component that has already thrown is not trustworthy to re-render
  in place. Reloading is the honest option, and the visitor is told so plainly.
*/
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    /*
      Deliberately not wired to a reporting service. When one is introduced it belongs
      here, and it must scrub the component stack before transmission — stack frames
      leak file paths and source structure. Development keeps the console output so a
      thrown error is not silently swallowed while working.
    */
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[ErrorBoundary]', error, info?.componentStack);
    }
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      /* id and tabIndex to match every other page's <main>. The skip link in the
         Header targets #main-content unconditionally; in the failure state this
         is the only <main> in the document, so without the id the skip link
         resolves to nothing and the first keyboard action on an already-broken
         page does nothing at all. */
      <main
        id="main-content"
        tabIndex={-1}
        /* min-height comes from .vk-min-vh in index.css, not from the style
           object below, and the reason is that it has to be declared twice:
           `min-height: 100vh` followed by `min-height: 100svh`, so a browser
           that does not know the small-viewport unit keeps the first value.
           A React style object holds one value per property and cannot express
           that pair at all — it simply dropped the declaration on Safari
           before 15.4, leaving the error page with no minimum height on the
           one surface where a collapsed layout is least forgivable. */
        className="vk-min-vh"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ink, #121212)',
          color: 'var(--text-on-dark, #F1F0F0)',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 'var(--measure)' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--amber, #FF6A00)',
              margin: '0 0 20px',
            }}
          >
            Application error
          </p>
          <h1
            style={{
              fontSize: 'clamp(28px, 5vw, 44px)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              margin: '0 0 20px',
              fontWeight: 500,
            }}
          >
            This page failed to load.
          </h1>
          <p style={{ fontSize: '16px', lineHeight: 1.65, margin: '0 0 32px', opacity: 0.82 }}>
            The fault is on our side, not yours. Reloading usually resolves it. If it does not, we
            would like to know — please write to{' '}
            <a
              href="mailto:info@vikasanasystems.tech"
              style={{ color: 'var(--amber, #FF6A00)', textDecoration: 'underline' }}
            >
              info@vikasanasystems.tech
            </a>
            .
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '15px 24px',
                minHeight: '44px',
                background: 'var(--text-on-dark, #F1F0F0)',
                color: 'var(--ink, #121212)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
            <a
              href="/"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '11px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '15px 24px',
                minHeight: '44px',
                display: 'inline-flex',
                alignItems: 'center',
                border: '1px solid rgba(232,236,233,0.28)',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              Return home
            </a>
          </div>
        </div>
      </main>
    );
  }
}
