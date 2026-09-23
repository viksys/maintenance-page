import React from 'react';
import { Link } from 'react-router-dom';

/*
  Minimal by intent.

  Everything the header mega-menu already surfaces — the product range — is
  deliberately absent. A footer that mirrors the navigation is a sitemap, not a
  footer.

  What remains is only what has nowhere else to live: the knowledge layer
  (which exists for search and answer engines rather than primary navigation),
  the company destinations people actually look for in a footer — About,
  Careers and Contact Us — and legal. Site Map and Security Policy stay
  reachable via /site-map and the sitemap.xml, so crawl coverage is unaffected
  by trimming them from here.

  CONTACT IS THE EXCEPTION TO "DO NOT MIRROR THE NAVIGATION", and it is the
  one every version of this file has got wrong in a different way. It is the
  link a reader scrolls to the bottom of a page specifically to find. Being in
  the header as well is not duplication; it is the same door in the two places
  people look for it.
*/
const COLUMNS = [
  {
    heading: 'RESOURCES',
    links: [
      { label: 'Knowledge Base', to: '/knowledge' },
    ],
  },
  {
    heading: 'COMPANY',
    links: [
      { label: 'About', to: '/company' },
      { label: 'Careers', to: '/careers' },
      /* Labelled the way the header labels it, and pointing at the same route.
         A reader who learns the door is called "Contact Us" in the navigation
         should not have to work out that the footer calls it something else,
         or that it is missing here and only reachable from the top of the
         page. */
      { label: 'Contact Us', to: '/contact' },
    ],
  },
  {
    heading: 'LEGAL',
    links: [
      { label: 'Privacy', to: '/privacy-policy' },
      { label: 'Terms', to: '/terms-of-use' },
      { label: 'Cookies', to: '/cookie-policy' },
    ],
  },
];

/*
  THE ENQUIRY SLOT IS EMPTY, AND THE QUESTION IT KEPT RAISING IS SETTLED.

  The brand column is the lockup and nothing else. The full record, because
  this slot was filled, emptied, refilled and emptied again and the history is
  the only thing that stops it oscillating a fifth time:

    1. It held four social marks. They were never links — there is no published
       social presence, so they rendered as inert <span>s behind aria-hidden:
       four glyphs telling a reader the company was on four networks it is not
       on. Removed by direction, along with the header's SOCIAL column and the
       Icon components behind them (IconLinkedIn, IconX, IconYouTube,
       IconGitHub).
    2. It held a "Write to Us" button above a line naming the address. Removed,
       with a note reading "do not reinstate a contact route here without being
       asked — this slot has been emptied twice."
    3. It was asked for, explicitly, after that note was written. The button and
       the address line came back.
    4. Removed by direction, 23 September 2026 — the line and the button
       together. The note at (2) had said that if this slot were emptied a
       third time, the thing to settle was not this file but whether the footer
       is meant to carry an enquiry route at all.

  IT IS SETTLED, AND THE ANSWER IS THAT IT ALREADY DOES. The COMPANY column two
  columns across carries Contact Us, pointing at /contact, labelled exactly
  as the header labels it. That is the footer's enquiry route. The pill and the
  sentence beside it were a second door to the same room, and a reader who
  scrolls to the bottom looking for a way to make contact finds the one in the
  link columns where footers keep it.

  SO: do not reinstate a contact control in the brand column. If contact ever
  needs more weight in the footer than a link column gives it, the thing to
  change is that column, not this slot.

  WHAT WENT WITH IT: the FlowButton and SITE imports and the WRITE_TO_US
  constant, all of which existed only to serve this block. SITE.email in
  data/seo.js remains the one source for the address — it feeds the
  Organization schema in the static head and /contact reads the same export.
  If the address is ever wanted here again, read it from there. Never write it
  out by hand.
*/
export default function Footer({ variant = 'dark' }) {
  const isDark = variant === 'dark';
  const bg = isDark ? 'var(--ink)' : 'var(--text-on-dark)';
  const border = isDark ? 'var(--night-line)' : 'var(--stone-100)';
  const heading = isDark ? 'var(--text-on-dark)' : 'var(--ink)';
  /* Both roles are named rather than written out, and both split by surface.
     The dim role is the one that was wrong: on ink it was #4A5148, the
     light-band body colour, which measures 2.29:1 there and set the copyright
     line and the location line. --text-on-dark-3
     is 4.90:1. On paper it was #A3ADAA at 2.30:1; --text-secondary is 5.45:1. */
  const link = isDark ? 'var(--text-on-dark-2)' : 'var(--text-tertiary)';
  const faint = isDark ? 'var(--text-on-dark-3)' : 'var(--text-secondary)';
  /* `accent` was here, resolving --amber / --amber-text from the band to colour
     the SYSTEMS line when it was type. The lockup is a single image again, so
     the orange is in the pixels and nothing in this file sets it. */

  return (
    <footer style={{ background: bg, color: link, borderTop: `1px solid ${border}` }}>
      {/* One row: brand · three short link columns. The previous three stacked
          bands were the bulk of the footer's height. */}
      <div className="container-x" style={{ paddingTop: 'clamp(48px, 4vw, 68px)', paddingBottom: 'clamp(36px, 3vw, 52px)' }}>
        <div className="grid grid-cols-2 md:grid-cols-12 gap-x-10 gap-y-12">
          <div className="col-span-2 md:col-span-6">
            {/*
              THE LOCKUP: THE SUPPLIED footer_logo_org.png, UNMODIFIED.
              Swapped in 23 September 2026, by direction.

              DECODE AN ASSET BEFORE ASSERTING ANYTHING ABOUT IT. That rule is
              here because an earlier note in this file claimed logo-full.png
              had "a grey gradient background rather than transparency". It does
              not — it is RGBA with 97% of its pixels at alpha 0, and the grey
              people saw was their image viewer's backdrop. That one unchecked
              sentence caused the lockup to be rebuilt as wordmark-plus-type and
              a second asset to be brought in and processed. Measure first.

              So, measured from this file's alpha channel:

                1774 x 887, 8-bit RGBA, colour type 6
                corners all alpha 0 — transparent
                1,102,948 px transparent / 2,672 opaque / 467,918 partial
                mark (a>=10)   x 80..1691, y 340..615  ->  1612 x 276, 5.841
                mark (a>=128)  x 83..1688, y 347..613  ->  1606 x 267, 6.015
                VIKASANA  rows 347..485, colour (253,253,253)
                SYSTEMS   rows 546..613, colour (253,95,1)

              WHY THIS ASSET AND NOT THE OTHERS. Three things it has that the
              previous two did not, all at once:

                - It is transparent, so it composites onto --ink with nothing
                  behind it. footerlogo.png was RGB with no alpha and rendered
                  as a white plate.
                - Its VIKASANA is (253,253,253), near-white, so it reads on a
                  dark band. footerlogo.png's was (211,211,211) — drawn light,
                  but shipped on white, where it measured 1.24:1.
                - Its mark is 1612px wide against logo-full.png's 934px, so it
                  is still oversampled at the 234px it is set at, and stays
                  sharp on a 2x display.

              Its SYSTEMS is (253,95,1), which is the brand orange to within a
              couple of levels of --amber (255,106,0). Nothing here recolours
              it; that is what the file contains.

              FRAMING, NOT EDITING. The window is 234 x 40.1 — the mark's own
              5.841 proportion. The image is scaled so the mark's 1612px maps to
              234px (1774 x 234/1612 = 257.5, and the file is exactly 2:1 so the
              height follows), then pulled left by 80 x 0.14515 = 11.61px and up
              by 340 x 0.14515 = 49.35px. That lands the mark's top-left corner
              on the window's, so the lockup is flush with the link columns and
              the copyright line rather than inset by the artwork's own margin,
              which is what an object-fit crop leaves.

              Every pixel that renders is a pixel that was delivered.

              DO NOT PROCESS AN ASSET TO REMOVE ITS BACKGROUND. Tried on
              footerlogo.png and reverted the same day. Deriving alpha from
              distance-from-white and un-premultiplying looks right until the
              numbers are checked: the ramp was normalised on the lightest ink
              (211,211,211), a threshold every antialiased edge of the orange
              also clears, so those edges were promoted to full opacity while
              still carrying their blended-toward-white colour. Source orange
              (241,87,47) came out (242,138,119) at alpha 255 — lighter,
              desaturated, a pixel wider. It changed the letterforms and the
              brand colour. Ask for a transparent export instead; this file is
              what that looks like.

              SUPERSEDED ASSETS: logo-full.png (1.36 MB) and footerlogo.png
              (6 KB). This note used to say neither was deleted, because
              removing a supplied asset is a decision to be asked for rather
              than assumed. It was asked for, and both are gone — git history is
              where a superseded asset belongs, not the deploy. logo-full.png in
              particular was 1.36 MB of PNG shipped on every page of the site to
              fill a 234 x 40 window.
            */}
            <div
              className="mb-5 overflow-hidden"
              style={{ width: 234, height: 40.1, maxWidth: '100%' }}
            >
              <img
                src="/assets/img/footer_logo_org.png"
                alt="VIKASANA Systems"
                width={1774}
                height={887}
                /* The footer is below the fold on every route, so this never
                   needs to compete with the page's own hero for bandwidth or
                   for a decode slot. The intrinsic pair above already reserves
                   the box, so deferring the fetch costs no layout stability.

                   It matters more than it looks: the file is 379 KB for a
                   234 x 40 window, which is the largest single asset still
                   shipped on every page. Lazy is the cheap half of that fix.
                   The other half is exporting the lockup at the size it is
                   actually drawn at. */
                loading="lazy"
                decoding="async"
                style={{
                  /* Scaled so the mark's 1612px maps to the window's 234px,
                     then pulled up and left so the mark's own top-left corner
                     lands on the window's. Height is left auto: the file is
                     exactly 2:1, so 257.5 gives 128.75 and the arithmetic below
                     stays in one number.

                     maxWidth:'none' is load-bearing — Tailwind's preflight sets
                     `img { max-width: 100% }`, which would clamp 257.5 back to
                     234 with the offsets still applied and render a fragment of
                     a letterform. Check this line first if that ever happens. */
                  width: 257.5,
                  height: 'auto',
                  maxWidth: 'none',
                  marginLeft: -11.61,
                  marginTop: -49.35,
                  display: 'block',
                }}
              />
            </div>

          </div>

          {COLUMNS.map((c) => (
            <div key={c.heading} className="md:col-span-2">
              <div className="meta mb-2" style={{ color: heading }}>{c.heading}</div>
              {/* Rows were ~26px tall. The row, not the glyph, is the target. */}
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-[13px] transition-colors flex items-center" style={{ color: link, minHeight: 44 }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = heading)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = link)}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${border}` }}>
        {/*
          The imagery disclosure that sat here has moved to Terms of Use, where
          it is set out in full alongside the note on product renders and
          interface screenshots. A disclosure repeated on all thirty pages of a
          site is read on none of them; the Terms are linked from the LEGAL
          column directly above this line.
        */}
        <div className="container-x py-6 flex flex-col md:flex-row justify-between items-center gap-3">
          {/* Legal links live in their own column above; repeating them here was
              the main source of footer duplication. */}
          <div className="meta" style={{ color: faint }}>© {new Date().getFullYear()} VIKASANA SYSTEMS PRIVATE LIMITED · ALL RIGHTS RESERVED</div>
          <div className="meta" style={{ color: faint }}>MANGALURU · KARNATAKA · INDIA</div>
        </div>
      </div>
    </footer>
  );
}
