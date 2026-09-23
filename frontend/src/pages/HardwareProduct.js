import React from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import NotFound from '@/pages/NotFound';
import { getHardwareProduct } from '@/data/hardware';
import { FlickeringGrid } from '@/components/ui/flickering-grid';

/*
  HardwareProduct — one page component serving every device in the hardware
  registry: Rugged Mission PC (GCS-X-L), Tactical Tablet (GCS-X-H), and Edge
  Compute Module (ECM-X).

  The page is the hero only — the light plate and the product render beneath
  it — followed by a "Revealing soon" band. Everything else about the devices
  is withheld until release.
*/

/* The one dark surface the page uses: the render band and the closing band. */
const DARK = {
  bg: 'var(--ink)',
  body: 'var(--stone-400)',
  value: 'var(--text-on-dark)',
};

/*
  INTRINSIC PIXEL SIZES OF THE PRODUCT RENDERS.

  Read out of the .webp headers rather than estimated, and keyed on src for the
  same reason LogoCarousel's table is: a file replaced at the same path is then
  caught by the review that would catch any other stale width.

  This exists because the render below is the largest contentful paint element
  on every hardware product page and was shipping with no intrinsic pair at
  all — so the browser reserved nothing for it, laid the band out at zero
  height, and shifted the whole page down the moment the image decoded. A
  layout shift on the LCP element is the worst place to have one.

  1064x573 IS NOT A CONTRADICTION of the "1064x824" in the note further down
  this file. That figure is hero-gcs.webp, the untrimmed original still used in
  fourteen other places; the product page loads hero-gcs-trim.webp, which is
  the same render cropped to its content box. Both numbers are correct and they
  describe two different files — which is also why hero-gcs.webp has no entry
  here. No product resolves to it through `p.heroImage || p.image`, and its
  size is already recorded in that note; a second copy of a measurement is a
  second thing to keep true.

  ECM-X's entry is unreachable today — its record sets `heroRender: false`, so
  the band is skipped entirely and this page never requests hero-scene.webp. It
  is kept because the `p.heroImage || p.image` fallback is live for any record
  that has no render of its own, and a half-populated table is worse than none.
*/
const RENDER_INTRINSIC = {
  '/assets/img/hero-gcs-trim.webp': [1064, 573],
  '/assets/img/hero-tab.webp': [1151, 905],
  '/assets/img/hero-scene.webp': [1081, 918],
};

export default function HardwareProduct({ slug: slugProp }) {
  /*
    The three device routes are declared in App.js as literal paths
    (/hardware/gcs-x-l and siblings), which have no params, so the route states
    which device it is explicitly. useParams stays as the fallback.
  */
  const params = useParams();
  const slug = slugProp || params.slug;
  const p = getHardwareProduct(slug);

  /* An unknown slug is not a page: render the not-found page in place. */
  if (!p) return <NotFound />;

  const { hero } = p;

  /*
    The pair that reserves the render's box, resolved from the same expression
    the src uses so the two cannot drift apart. Undefined for a src the table
    does not know, which renders as no attribute — the pre-fix behaviour, not a
    wrong number.

    Adding these changes nothing about the rendered size. width and height are
    both `auto` in the style below, so the used size is still the natural size
    constrained by max-width and max-height; the attributes only tell the
    browser the aspect ratio before the bytes arrive, which is exactly the
    interval the shift was happening in.
  */
  const [renderW, renderH] = RENDER_INTRINSIC[p.heroImage || p.image] || [undefined, undefined];

  return (
    <div>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {/*
          ================= HERO — LIGHT PLATE =================
          The DRISHTIKON hero, applied to hardware. Same structure, same
          classes, same paper: a light plate carrying a flickering dot field,
          the model set very large across the top, and the reading matter along
          the bottom in two columns.

          IT REUSES .dk-hero* RATHER THAN COPYING IT. Those classes are named
          for the page they were written on, but nothing in them is specific to
          it — they are a product-hero pattern, and duplicating them under a
          hw- prefix would mean two stylesheets to keep in step every time the
          plate is adjusted. The name is now the misleading part, not the code.

          ALL THREE HARDWARE PRODUCTS GET THIS, by direction. The copy comes
          from each product's own `hero` block in data/hardware.js, so GCS-X-H
          and ECM-X are not showing GCS-X-L's words.

          THE PRODUCT RENDER MOVED OUT. It was beside the copy in a two-column
          hero grid; here the plate is type only and the render sits on the
          dark band immediately below, which is what DRISHTIKON does with its
          console screenshot and for the same reason — a photographic object on
          a near-white plate becomes the heaviest thing on it and takes the
          model number's place as the subject.
        */}
        <section className="relative overflow-hidden dk-hero">
          <FlickeringGrid
            className="absolute inset-0 z-0"
            squareSize={3}
            gridGap={9}
            color="rgb(24, 24, 24)"
            maxOpacity={0.22}
            flickerChance={0.12}
          />
          <div className="dk-hero__wash" aria-hidden="true" />

          <div className="relative z-[1] dk-hero__inner">
            <div>
              <Reveal>
                <div className="dk-hero__eyebrow">{hero.eyebrow}</div>
              </Reveal>
              <Reveal delay={0.06}>
                <h1 className="dk-hero__title">{hero.title}</h1>
              </Reveal>
            </div>

            <div className="dk-hero__foot">
              <div>
                <Reveal delay={0.12}>
                  <div className="dk-hero__kicker">{hero.kicker}</div>
                  <p className="dk-hero__sub">{hero.subtitle}</p>
                </Reveal>
              </div>

              <div>
                {/* Spaced by the wrapper, not by the paragraphs' own margins —
                    each <p> is alone inside its own Reveal, so :last-of-type
                    matches every one of them and would zero the gaps between
                    them as well as after them. See the same note in
                    Drishtikon.js. */}
                <div className="dk-hero__paras">
                  {hero.body.map((para, i) => (
                    <Reveal key={para.slice(0, 24)} delay={0.16 + i * 0.06}>
                      <p className="dk-hero__body">{para}</p>
                    </Reveal>
                  ))}
                </div>

                {hero.lifecycle.length ? (
                <Reveal delay={0.3}>
                  <div className="dk-hero__cycle">
                    {hero.lifecycle.map((w, i) => (
                      <React.Fragment key={w}>
                        {i > 0 && <span aria-hidden="true" className="dk-hero__dot">·</span>}
                        <span>{w}</span>
                      </React.Fragment>
                    ))}
                  </div>
                </Reveal>
                ) : null}


              </div>
            </div>

          </div>
        </section>

        {/* The product render, on its own dark band under the plate — the
            position DRISHTIKON gives its console screenshot.

            Skipped for a device whose record sets `heroRender: false`: ECM-X
            has no render of its own, and the generic scene it borrowed showed
            a different product on the module's page. An absent image is
            better than a wrong one, so the band goes with it rather than
            being left as an empty stripe of black. */}
        {p.heroRender === false ? null : (
        <section style={{ background: DARK.bg, color: DARK.value }}>
          <div className="container-x" style={{ paddingTop: 'clamp(48px, 5vw, 84px)', paddingBottom: 'clamp(48px, 5vw, 84px)' }}>
            <Reveal delay={0.08}>
              {/*
                SIZED TO THE ART AND TO THE WINDOW, not to the container.

                It was `w-full` inside a 1360px container. The renders are
                1064x824 (GCS-X-L), 1151x905 (GCS-X-H) and 1081x918 (ECM-X), so
                that stretched every one of them roughly 28% past its own pixel
                width — which is why they read as both oversized and soft. A
                raster image scaled above 100% cannot gain detail; it can only
                interpolate.

                The two caps work together. max-width holds it under native
                resolution, and max-height keeps the whole device on screen
                without scrolling on a laptop, which is the "fit to the window"
                half of the requirement. With width and height both auto the
                browser satisfies whichever binds first and keeps the aspect
                ratio, so a short window narrows the image rather than cropping
                or squashing it.

                THE BAND IS THE RENDER AND NOTHING ELSE. It briefly also
                carried the "STATION · FIELD-READY" caption chip and the two
                calls to action; both are removed by direction. What is left is
                one object, centred, on black.

                width: fit-content is retained rather than reverted to a
                full-width block: it makes the wrapper hug the art, so the
                centring is of the DEVICE rather than of a box the device
                floats inside. That distinction is invisible until something is
                positioned against the wrapper again.
              */}
              <div className="mx-auto" style={{ width: 'fit-content', maxWidth: '100%' }}>
                <img
                  src={p.heroImage || p.image}
                    alt={`${p.name} — ${p.subtitle}`}
                    className="block"
                    width={renderW}
                    height={renderH}
                    /* Lowercase on purpose, matching pages/Home.js. React 18
                       forwards unknown lowercase attributes untouched; the
                       camelCase spelling is a React 19 feature and warns on
                       this version. This is the LCP element of every hardware
                       product page, so the hint is worth having.

                       decoding="async" and NOT loading="lazy". Lazy on the
                       largest contentful paint element defers the one request
                       the measurement is waiting on. */
                    fetchpriority="high"
                    decoding="async"
                    style={{
                      /* Per product, because the three renders do not frame
                         their devices alike — see the note on heroMaxWidth in
                         data/hardware.js. 680 is the default and is what the
                         tablet and ECM-X use. */
                      maxWidth: `min(${p.heroMaxWidth || 680}px, 100%)`,
                      maxHeight: '58vh',
                      width: 'auto',
                      height: 'auto',
                      margin: '0 auto',
                    }}
                  />
              </div>
            </Reveal>

          </div>
        </section>
        )}

        {/* ================= REVEALING SOON — DARK ================= */}
        <section className="relative overflow-hidden" style={{ background: DARK.bg, color: DARK.value, borderTop: '1px solid var(--night-line)' }}>
          <div className="absolute inset-0 grid-fine-dark opacity-60 pointer-events-none" />
          <div className="container-x section-y relative text-center">
            <Reveal>
              <div className="meta mb-6" style={{ color: 'var(--amber)', letterSpacing: '0.2em' }}>{p.model}</div>
              <h2 className="h-display h-display-dark fs-h2 m-0">
                Revealing <span className="text-amber on-dark">soon.</span>
              </h2>
              {/* Centred by its own margins, not by .mx-auto: index.css sets
                  `margin: 0` on .copy-prose after the Tailwind utilities, so
                  the utility loses and the line sat off-centre under the
                  heading. */}
              <p
                className="copy-prose"
                style={{ color: DARK.body, maxWidth: 'var(--measure)', margin: '24px auto 0' }}
              >
                Full details and specifications for the {p.name} will be published at launch.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer variant="dark" />
    </div>
  );
}
