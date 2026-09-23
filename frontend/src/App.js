import React, { useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import { initSmoothScroll, scrollToTop, scrollToElement } from '@/lib/smooth-scroll';
import Home from '@/pages/Home';
import Seo from '@/components/Seo';

/*
  Chunk loading across a deploy.

  Chunk filenames carry a content hash, so a deploy replaces every one of them.
  A tab left open across a deploy still holds the old bundle and asks for a
  filename that no longer exists on the CDN; the import rejects, React.lazy
  propagates that, and a working session dies in the ErrorBoundary on the next
  navigation. The user did nothing wrong and a reload fixes it completely.

  So a failed chunk import reloads the page once and once only. The marker is
  per-tab rather than per-navigation because a stale bundle will fail on every
  chunk it asks for, not just the first. If the marker is already set the
  rejection is rethrown untouched: a chunk that 404s on a freshly loaded bundle
  is a genuine build or network fault, and reloading again would spin.

  sessionStorage throws outright in some privacy modes. When it does we cannot
  record that a retry happened, so we rethrow instead of reloading — loop
  protection is unavailable, and the reload is exactly the action that needs it.
  A visible error beats an infinite refresh.
*/
function lazyRoute(load) {
  return lazy(() =>
    load().catch((err) => {
      const KEY = 'vk:chunk-retry';
      let retried;
      try {
        retried = window.sessionStorage.getItem(KEY);
        if (!retried) window.sessionStorage.setItem(KEY, '1');
      } catch {
        throw err;
      }
      if (retried) throw err;
      window.location.reload();
      /*
        Reload is asynchronous. Resolving — or returning undefined — hands
        React.lazy a module with no `default` and throws into the ErrorBoundary
        we are here to avoid, so stay pending and let the navigation tear the
        tree down.
      */
      return new Promise(() => {});
    })
  );
}

/*
  Route components are code-split. Loading all thirty-odd pages eagerly meant a
  first-time visitor to the homepage downloaded and parsed the legal pages, the
  careers modal and every detail template before anything could paint. Each route
  now arrives as its own chunk on navigation.
*/
const Company = lazyRoute(() => import('@/pages/Company'));
const Careers = lazyRoute(() => import('@/pages/Careers'));
const Locations = lazyRoute(() => import('@/pages/Locations'));
const Hardware = lazyRoute(() => import('@/pages/Hardware'));
const HardwareProduct = lazyRoute(() => import('@/pages/HardwareProduct'));
const Drishtikon = lazyRoute(() => import('@/pages/Drishtikon'));
const PrivacyPolicy = lazyRoute(() => import('@/pages/PrivacyPolicy'));
const CookiePolicy = lazyRoute(() => import('@/pages/CookiePolicy'));
const SecurityPolicy = lazyRoute(() => import('@/pages/SecurityPolicy'));
const TermsOfUse = lazyRoute(() => import('@/pages/TermsOfUse'));
const SiteMap = lazyRoute(() => import('@/pages/SiteMap'));
const Knowledge = lazyRoute(() => import('@/pages/Knowledge'));
const NotFound = lazyRoute(() => import('@/pages/NotFound'));
const VikasanaControl = lazyRoute(() => import('@/pages/VikasanaControl'));
const VikasanaEdge = lazyRoute(() => import('@/pages/VikasanaEdge'));
const VikasanaCore = lazyRoute(() => import('@/pages/VikasanaCore'));

/*
  Smooth scroll, mounted once for the whole site. Lenis drives window scroll
  itself, so a second instance anywhere would fight this one for the same
  gesture. It is a complete no-op under prefers-reduced-motion.
*/
function SmoothScroll() {
  useEffect(() => initSmoothScroll(), []);
  return null;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    /* Honour in-page anchors (e.g. a /knowledge#term link) instead of
       always forcing the top of the document. */
    if (hash) {
      /*
        `hash` is raw URL input and reaches us unvalidated. Fragments like `#1`,
        `#a b` or `#$x` are legal URLs but illegal CSS selectors, and passing one
        straight to querySelector throws a SyntaxError inside this effect — which,
        before the error boundary existed, unmounted the whole application.
        CSS.escape produces a valid selector for any fragment; the guard covers
        environments without it.
      */
      const id = hash.slice(1);
      let el = null;
      if (id) {
        try {
          el = document.getElementById(id) || document.querySelector(`#${CSS.escape(id)}`);
        } catch {
          el = null;
        }
      }
      if (el) {
        scrollToElement(el);
        return;
      }
    }
    scrollToTop();
  }, [pathname, hash]);
  return null;
}

/*
  Screen-reader users are not told that a client-side navigation happened: the
  viewport moves but focus stays on the link they activated in the previous page's
  header, and nothing is announced. This moves focus to the new page's <main> on
  every path change, which restarts the reading order at the new content and makes
  the freshly-written <title> the next thing announced.

  Keyed on pathname only. A hash change is an in-page jump, not a new document, and
  stealing focus there would fight the anchor behaviour above.
*/
function FocusOnNavigate() {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const main = document.getElementById('main-content');
    if (main) main.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}

/*
  Shown while a route chunk is in flight. Sized to the viewport so the header does
  not collapse onto the footer mid-load, and announced politely rather than
  assertively — a route transition is not an alert.
*/
function RouteFallback() {
  return (
    <div role="status" aria-live="polite" className="vk-min-vh" style={{ background: 'var(--ink)' }}>
      <span className="sr-only">Loading page</span>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <BrowserRouter>
            <SmoothScroll />
          <ScrollToTop />
          <FocusOnNavigate />
          {/* Route-level metadata from src/data/seo.js. Pages needing bespoke
              schema (detail pages, FAQs) render their own <Seo> in addition. */}
          <Seo />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/company" element={<Company />} />
              <Route path="/careers" element={<Careers />} />
              {/* The three platform pages — hero only. */}
              <Route path="/products/platform" element={<VikasanaControl />} />
              <Route path="/products/field-station" element={<VikasanaEdge />} />
              <Route path="/products/handheld" element={<VikasanaCore />} />
              {/* THE CONTACT PAGE, AT /contact. Renamed from /locations on
                  23 September 2026.

                  The page had been retitled Contact Us in the navigation, the
                  site map and the metadata registry while its URL still read
                  /locations, so following a link labelled "Contact Us" put
                  "locations" in the address bar. A label and a path that
                  disagree are a path the reader stops trusting.

                  /contact is the URL this page should always have had. It was
                  free — the old Contact page was retired earlier the same day —
                  and reusing it means inbound links and bookmarks that predate
                  that retirement resolve again instead of hitting NotFound.

                  The COMPONENT is still Locations, from pages/Locations.js.
                  The file is not renamed in this pass: pages/Contact.js was
                  deleted hours ago and recreating that filename for different
                  content is the kind of collision that costs an afternoon in
                  git. The component name is cosmetic; the route is not. */}
              <Route path="/contact" element={<Locations />} />
              {/* /locations kept as a redirect, not dropped. It was live, it is
                  in the published sitemap, and it is the URL anything already
                  linking to this page uses. Same reasoning as the three hardware
                  aliases below, and it is duplicated as a 308 in vercel.json for
                  the same reason they are: the edge redirect does not run in
                  local dev, and this one does. */}
              <Route path="/locations" element={<Navigate to="/contact" replace />} />
              <Route path="/software/drishtikon" element={<Drishtikon />} />
              <Route path="/hardware" element={<Hardware />} />
              {/* The three built devices — Rugged Mission PC (GCS-X-L), Tactical
              Tablet (GCS-X-H), and Edge Compute Module (ECM-X). Every hardware
              URL is declared here; there is no :slug fallback, so an unknown
              one reaches the not-found page rather than a generic template. */}
              <Route path="/hardware/gcs-x-l" element={<HardwareProduct slug="gcs-x-l" />} />
              <Route path="/hardware/gcs-x-h" element={<HardwareProduct slug="gcs-x-h" />} />
              <Route path="/hardware/ecm-x" element={<HardwareProduct slug="ecm-x" />} />
              {/* Human-readable aliases. Product names are quotable and people will
              type them; the model designation stays the canonical URL.

              These duplicate the three 308 redirects in vercel.json on purpose.
              The edge redirect never runs in local dev or on any host that is
              not Vercel, so without these the alias URLs would 404 in
              development and work in production — and if the vercel.json block
              is ever lost, the client router still honours the alias. */}
              <Route
                path="/hardware/rugged-mission-pc"
                element={<Navigate to="/hardware/gcs-x-l" replace />}
              />
              <Route
                path="/hardware/tactical-tablet"
                element={<Navigate to="/hardware/gcs-x-h" replace />}
              />
              <Route
                path="/hardware/edge-compute-module"
                element={<Navigate to="/hardware/ecm-x" replace />}
              />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/security-policy" element={<SecurityPolicy />} />
              <Route path="/terms-of-use" element={<TermsOfUse />} />
              <Route path="/site-map" element={<SiteMap />} />
              <Route path="/knowledge" element={<Knowledge />} />
              {/* Explicit not-found page. This route previously rendered <Home />,
              which returned the homepage at HTTP 200 for every mistyped or stale
              URL and invited crawlers to index them as real, canonical pages. */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </div>
    </ErrorBoundary>
  );
}

export default App;
