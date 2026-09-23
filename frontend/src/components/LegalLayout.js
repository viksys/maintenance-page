import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

/*
  Shared layout for legal / policy pages (Privacy, Cookie, Security, Terms, Site Map).
  This is a DOCUMENT layout, not a marketing page: no hero, no eyebrow, no large
  whitespace blocks. Title, "Last updated" and a single hairline sit directly above
  a continuous reading column, the way OpenAI/Stripe/GitHub/Apple legal pages read.
  One container (.layout-legal-doc, 36rem, centered) holds the whole document,
  and it is sized to the reading measure rather than to the page.

  The <main> landmark lives here, not in the pages that render this component.
  A page delegating its whole shell to this layout has no chrome of its own, so
  putting a landmark on both sides would emit two <main> elements on one route —
  which is invalid, and leaves assistive technology without a single "skip to
  content" target. One landmark per rendered route, owned by whoever owns the
  Header and Footer around it.
*/
export default function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div>
      <Header variant="light" />
      <main id="main-content" tabIndex={-1}>
        <section style={{ background: 'var(--white)' }}>
          <div className="container-x" style={{ paddingTop: 'clamp(96px, 7vw, 118px)', paddingBottom: 'clamp(48px, 4.5vw, 80px)' }}>
            <div className="layout-legal-doc">
              <h1 className="h-display fs-h3">{title}</h1>
              {/* #A3ADAA measured 2.03:1 on the current paper — the same failure
                  corrected in SectionLabel and .num-tag. --stone-500 replaced it
                  and now measures 5.43:1 here.

                  This comment used to record the token sitting at 4.49:1, a
                  hundredth under the floor, and argued for leaving it: patching
                  one call site would have traded a rounding error for an
                  inconsistency, and the token belongs to index.css and carries
                  this role site-wide. That reasoning was right, and the fix
                  landed where it belonged — the token itself moved, so every
                  call site was corrected at once and this one needed no
                  exception. Left as the record of why not to fix a token from a
                  leaf. */}
              {lastUpdated && (
                <div className="meta mt-2" style={{ color: 'var(--stone-500)' }}>
                  LAST UPDATED: {lastUpdated}
                </div>
              )}
              <div className="hairline mt-6 mb-8" />

              {children}
            </div>
          </div>
        </section>
      </main>
      <Footer variant="dark" />
    </div>
  );
}

/*
  One heading + body block. No borders, no py-10 padding blocks — headings sit
  in the normal flow and are set off from the previous block by margin only, so
  the page reads as one continuous document rather than stacked cards. Pass
  `divider` on a section only where a rule is legally/structurally useful
  (e.g. before a closing "Contact" block), not after every heading.
*/
export function LegalSection({ heading, id, first = false, divider = false, children }) {
  return (
    <div
      id={id}
      style={{
        marginTop: first ? 0 : divider ? 40 : 32,
        paddingTop: divider && !first ? 24 : 0,
        borderTop: divider && !first ? '1px solid var(--stone-100)' : 'none',
      }}
    >
      {heading && (
        <h2 className="font-display font-semibold text-[17.5px] md:text-[19px] mb-2" style={{ color: 'var(--ink)' }}>{heading}</h2>
      )}
      {/*
        The measure, like everything else.

        This was a hard maxWidth of 920px, chosen to "visibly occupy the page".
        At 15.5px that is about 124 characters per line — twice a comfortable
        measure, and the reader loses the return to the next line. It also sat
        left-aligned inside a 1080px container, so the 160px it did not use
        collected on the right-hand side as a gap, which is the irregularity
        this page was being judged for.

        Occupying the page is not the body copy's job. The container is what
        occupies the page; the column inside it is set to be read.
      */}
      <div className="legal-body copy-body measure" style={{ color: 'var(--text-tertiary)' }}>
        {children}
      </div>
    </div>
  );
}

/* Sub-heading inside a LegalSection (e.g. "How We Obtain Consent"). */
export function LegalSubhead({ children }) {
  return (
    <h3 className="font-display font-semibold text-[15px] mt-6 mb-2" style={{ color: 'var(--ink)' }}>{children}</h3>
  );
}

/* Consistent bullet list — reuses the .amber-tick square already defined in index.css. */
export function LegalList({ items }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="amber-tick" style={{ marginTop: 7, flexShrink: 0 }} />
          <span>{typeof t === 'string' ? t : t}</span>
        </li>
      ))}
    </ul>
  );
}

export function LegalP({ children }) {
  return <p className="mb-4">{children}</p>;
}

/*
  One link treatment for every legal page.

  There were four. Privacy used `underline hover:no-underline` on its own;
  Cookie and Security used the same class plus an inline ink colour; Terms used
  an inline colour and text-decoration with no class at all, which meant its
  links were the only ones on the site that did not change on hover. Four
  spellings of one idea, and the differences were visible: that is what "the
  font is not the same across the legal pages" was.

  Routing is chosen here rather than at each call site. An in-app path gets a
  <Link>, so it navigates without a full page load; anything else — a mailto:,
  an external URL — gets a plain <a>. Terms was using <a href="/privacy-policy">
  for an internal route, which reloaded the entire application to move between
  two legal pages.
*/
export function LegalLink({ to, children }) {
  const internal = typeof to === 'string' && to.startsWith('/');
  const props = {
    className: 'underline hover:no-underline',
    style: { color: 'var(--ink)' },
  };
  return internal
    ? <Link to={to} {...props}>{children}</Link>
    : <a href={to} {...props}>{children}</a>;
}

/*
  The closing contact block. Privacy and Cookie carried identical copies of this
  markup and Security carried a third variant, so a change to one left the other
  two behind. The company name, the address and the link treatment are now
  stated once.
*/
export function LegalContact() {
  return (
    <div className="mt-2 text-[14.5px]" style={{ color: 'var(--ink)' }}>
      <div className="font-display font-semibold mb-2">VIKASANA Systems Private Limited</div>
      <div>
        Email: <LegalLink to="mailto:info@vikasanasystems.tech">info@vikasanasystems.tech</LegalLink>
      </div>
      <div className="mt-1">Address: Mangaluru, Karnataka, India</div>
    </div>
  );
}
