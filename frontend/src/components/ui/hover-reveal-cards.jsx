import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/*
  HoverRevealCards — a bar of photographic cards where hovering one dims the
  rest and lights the hovered one with a white glow.

  Converted from the supplied TSX sources. This codebase is JavaScript
  (jsconfig.json, and components.json sets "tsx": false), so the CardItem /
  HoverRevealCardsProps interfaces are documented here rather than declared:

    items          [{ id, title, subtitle, imageUrl, to, imageAlt, cta, imageFit }]
                   title    product name. Set large and centred.
                   subtitle the one-line tag under it.
                   to       optional route. Present -> the card is a <Link>
                            and shows the cta line; absent -> a plain cell.
                   cta      link label. Defaults to "FIND OUT MORE".
                   imageFit 'cover' (default) or 'contain'. Photographs and
                            full-bleed screens cover. Product renders on a
                            transparent ground contain: a cover crop would
                            cut the corners off the hardware, and there is no
                            ground in the file for the crop to eat instead.
    className      extra classes on the row container.
    cardClassName  extra classes on each card.
    cardHeight     CSS length. Deliberately short — see below.

  ---------------------------------------------------------------------------
  THE ONLY MOTION IS THE HOVER REVEAL
  ---------------------------------------------------------------------------
  Hovering one card dims, blurs and shrinks the other two; the hovered card
  returns to full and scales up. That is the whole effect, by direction — no
  glow, no pulse, no second treatment layered on top.

  It lives in index.css under "ECOSYSTEM CARDS" rather than in Tailwind
  classes, because the de-emphasis is a container-driven rule (.eco-row:hover
  .eco-card) that has to be overridden by the hovered child, and expressing
  that as utilities needs a stack of !important variants that is harder to
  read than the four rules it replaces.

  This file therefore carries structure and content only. The classes it
  applies — .eco-row, .eco-card, .eco-img, .eco-scrim — are the contract
  between the two.

  ---------------------------------------------------------------------------
  PROPORTION
  ---------------------------------------------------------------------------
  These are a BAR, not three panels: wide and short, so the row reads as one
  horizontal band under the section label rather than as a full screen of
  content. cardHeight tops out at 300px against a card roughly 440px wide at
  the 1360px container — about 3:2 — which is the reference's proportion.

  ---------------------------------------------------------------------------
  ACCESSIBILITY
  ---------------------------------------------------------------------------
  A real <ul>, and each card with a destination is a <Link>. The source put
  role="list" / role="listitem" on divs and tabIndex={0} on every card, which
  makes each one a tab stop that cannot be activated. It also dropped
  focus-visible:ring-* classes resolving through hsl(var(--ring)) — a variable
  tailwind.config declares but index.css never defines, since the shadcn theme
  layer was removed from this project — so the focus ring would have computed
  to an invalid colour and painted nothing. The global *:focus-visible rule
  (2px amber over 4px ink) covers it instead, and .eco-card:focus-visible
  triggers the same lift the pointer gets.
*/

/* Sentence case, and not uppercased at the point of use either.

   It was "FIND OUT MORE" set in the mono label register — uppercase at 0.18em
   tracking, which made a four-word link almost as wide as the product name
   above it and gave the card two things competing to be read first. It is body
   text now, by direction, and body text is not shouted. */
const DEFAULT_CTA = 'Find out more';

function CardInner({ item }) {
  const contained = item.imageFit === 'contain';
  return (
    <>
      <img
        src={item.imageUrl}
        alt={item.imageAlt || `${item.title} — ${item.subtitle}`}
        loading="lazy"
        decoding="async"
        className={cn('eco-img', contained && 'eco-img--contain')}
      />
      {/* A contained render sits on the card's own dark background rather than
          on a photograph, so the scrim that guarantees contrast over bright sky
          is not needed and would only grey the device down. */}
      <div className={cn('eco-scrim', contained && 'eco-scrim--soft')} />

      {/*
        TWO GROUPS, NOT ONE STACK. The name and its tag are centred in the card;
        the link sits on the bottom edge.

        They were one centred column, which put the link immediately under the
        tag and left the lower third of every card empty. Splitting them means
        the identifying pair stays optically centred while the action goes where
        an action belongs — the same place on all three cards, regardless of
        whether a tag is present or how long the name is.

        flex-1 on the first group is what does it: it takes all the space the
        link does not, and centres its own contents inside that.
      */}
      <div
        className="relative z-[1] flex h-full flex-col items-center text-center"
        style={{ padding: 'clamp(20px, 2.2vw, 32px)' }}
      >
        <div className="flex flex-1 flex-col items-center justify-center">
          {/* h2, not h3: these are the first headings under the page h1, and the
              section label above them is a styled div rather than a heading. */}
          <h2
            className="h-display h-display-dark m-0"
            style={{ fontSize: 'clamp(26px, 2.6vw, 40px)' }}
          >
            {item.title.toUpperCase()}
          </h2>

          {item.subtitle ? (
            <div
              className="font-display"
              style={{
                color: 'var(--amber)',
                marginTop: 8,
                fontSize: 'clamp(12.5px, 0.95vw, 14px)',
                fontWeight: 600,
                letterSpacing: '-0.008em',
              }}
            >
              {item.subtitle}
            </div>
          ) : null}
        </div>

        {item.to ? (
          <div className="eco-cta">
            {item.cta || DEFAULT_CTA}
            <span className="inline-block transition-transform duration-300 group-hover/card:translate-x-1">
              &rarr;
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}

function HoverRevealCards({
  items,
  className,
  cardClassName,
  cardHeight = 'clamp(230px, 20vw, 300px)',
}) {
  if (!items || items.length === 0) return null;

  return (
    <ul className={cn('eco-row grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3', className)}>
      {items.map((item) => (
        <li key={item.id} className="min-w-0" style={{ height: cardHeight }}>
          {item.to ? (
            <Link to={item.to} className={cn('eco-card group/card h-full', cardClassName)}>
              <CardInner item={item} />
            </Link>
          ) : (
            <div className={cn('eco-card group/card h-full', cardClassName)}>
              <CardInner item={item} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export { HoverRevealCards };
export default HoverRevealCards;
