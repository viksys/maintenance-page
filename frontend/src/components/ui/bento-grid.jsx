import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/*
  BentoGrid — an unequal grid of capability cards.

  ---------------------------------------------------------------------------
  WHAT THIS IS, AND WHAT IT IS NOT
  ---------------------------------------------------------------------------
  It is the shadcn/ui "bento grid" pattern, rewritten for this codebase rather
  than pasted into it. Three differences, all deliberate:

    JAVASCRIPT, NOT TYPESCRIPT. This project is Create React App with craco and
    plain .js/.jsx — there is no tsconfig and no shadcn registry. The exported
    props are documented below instead of typed.

    THIS SITE'S ICONS, NOT lucide-react. components/Icon.js already carries a
    drawn set in the brand's line weight. Adding a second icon library would
    put two drawing styles on one page, which is exactly the "generic" look
    the rewrite is meant to avoid — and it would add a dependency for glyphs
    we already have.

    TOKENS, NOT PALETTE CLASSES. Colours come from index.css custom properties
    (--white, --stone-200, --ink) so the cards stay in step with the rest of
    the site when a token moves.

  ---------------------------------------------------------------------------
  THE UNEQUAL SPANS ARE THE POINT
  ---------------------------------------------------------------------------
  A six-item grid of identical cells is a table with rounded corners; it reads
  as filler. Giving the first and last items two columns each makes the row
  shapes differ, which is what stops the block looking generated — and it
  matches the content, where those two are the broadest claims.

  Props
    BentoGrid   className, children
    BentoCard   n        the serial, as a string ('01')
                title    the capability's name
                description one sentence
                icon     a node, rendered at 22px in the card's own colour
                colSpan  1 or 2 — how many of the four columns it takes
*/

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/* The card's own entrance. Short, small travel: the section is a grid of
   facts, not a reveal sequence, and anything longer reads as decoration. */
const item = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

/*
  TONE IS SET ON THE GRID, NOT ON EACH CARD. The rules between cards are the
  grid's own 1px gap showing through its background, so the gap colour and the
  card colour have to be decided together or the hairlines end up the wrong
  weight against their own cells.
*/
export function BentoGrid({ tone = 'light', className, children }) {
  const dark = tone === 'dark';
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px',
        dark ? 'bento--dark' : '',
        className,
      )}
      style={{ background: dark ? 'var(--night-line)' : 'var(--stone-200)', padding: 1 }}
    >
      {children}
    </motion.div>
  );
}

export function BentoCard({ n, title, description, icon, colSpan = 1, className }) {
  return (
    <motion.article
      variants={item}
      className={cn(
        'bento-card group relative flex h-full flex-col',
        colSpan === 2 ? 'lg:col-span-2' : '',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="bento-card__icon" aria-hidden="true">{icon}</span>
        <span className="bento-card__n">{n}</span>
      </div>

      <h3 className="bento-card__t">{title}</h3>
      <p className="bento-card__d">{description}</p>

      {/* The rule grows from the left on hover. It is the only motion the card
          carries once it has arrived, and it is drawn under the text rather
          than around it so nothing moves. */}
      <span className="bento-card__rule" aria-hidden="true" />
    </motion.article>
  );
}

export default BentoGrid;
