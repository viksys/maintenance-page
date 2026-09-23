import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import JobDetails from './JobDetails';
import Reveal from '@/components/Reveal';
import { IconPlus } from '@/components/Icon';

/*
  Job list with inline expansion.

  The "+" opens a full role brief in place — height and opacity over 200ms, no
  navigation and no route change, so a candidate can compare roles without
  losing their place. Only one role is open at a time, which keeps the list
  scannable.

  The row header is a real <button> with aria-expanded/aria-controls, wrapped
  in the <h3> that carries the role title, so the disclosure is announced
  correctly, works from the keyboard by default, and the list of open roles is
  navigable by heading.
  The panel is only in the DOM while open, so aria-controls is only set while
  open — a reference to an absent id is worse than no reference at all.
*/

function JobRow({ job, index, isOpen, onToggle }) {
  const reduceMotion = useReducedMotion();
  const panelId = `vk-job-panel-${job.slug}`;
  const headerId = `vk-job-header-${job.slug}`;

  return (
    <div
      style={{
        borderTop: index === 0 ? '1px solid var(--stone-100)' : 'none',
        borderBottom: '1px solid var(--stone-100)',
        background: isOpen ? '#FCFCFC' : 'transparent',
        transition: 'background .2s ease',
      }}
    >
      <div className="grid grid-cols-12 gap-4 items-center" style={{ padding: '26px 0' }}>
        {/* <h3><button aria-expanded>…</button></h3> — the disclosure pattern.
            The heading is what puts every open role into a screen reader's
            heading list, which is how a long careers page is actually read;
            the button inside it is what opens the panel. The grid placement
            moves to the heading because the heading is now the grid item.
            Tailwind's preflight already resets heading size, weight and
            margin, so this is visually identical. */}
        <h3 className="col-span-12 md:col-span-8">
          <button
            id={headerId}
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            className="w-full text-left"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {job.tags.map((t, k) => (
                <React.Fragment key={t}>
                  <span className="meta meta-amber">{t}</span>
                  {k < job.tags.length - 1 && <span className="meta" style={{ color: 'var(--text-secondary)' }}>·</span>}
                </React.Fragment>
              ))}
            </div>
            <div className="font-display font-semibold" style={{ fontSize: 23, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              {job.title}
            </div>
            <div className="mt-2" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {job.experience} · {job.employment}
            </div>
          </button>
        </h3>

        <div className="col-span-12 md:col-span-4 flex md:justify-end items-center gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={isOpen ? panelId : undefined}
            aria-label={isOpen ? `Collapse ${job.title} details` : `Expand ${job.title} details`}
            className="w-10 h-10 flex items-center justify-center transition-colors"
            /* --stone-300, not the hairline grey. The square is white on white:
               its 1px rule is the only thing that says a control is here, so it
               is a component boundary at 1.4.11's 3:1 floor. --stone-100 is
               1.40:1; --stone-300 is 3.03:1. The row rules above and below stay
               --stone-100 — they divide, they do not identify. */
            style={{ border: '1px solid var(--stone-300)', background: 'var(--white)', cursor: 'pointer' }}
          >
            {/* The open state is carried by colour as well as rotation, so this
                is a state indicator on a light surface and takes --amber-text,
                not the brand --amber. Do not "restore" the brand value here. */}
            <span
              style={{ display: 'inline-flex', transition: 'transform .2s cubic-bezier(0.16,1,0.3,1)', transform: isOpen ? 'rotate(45deg)' : 'none', color: isOpen ? 'var(--amber-text)' : 'var(--ink)' }}
            >
              <IconPlus width={14} height={14} />
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={headerId}
            key="panel"
            /* Height and opacity are the whole animation here, so under a
               reduced-motion preference the panel simply appears at full
               height rather than sliding. */
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ borderTop: '1px solid var(--stone-100)' }}>
              <JobDetails job={job} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function JobAccordion({ jobs = [] }) {
  const [openSlug, setOpenSlug] = useState(null);

  return (
    <div>
      {jobs.map((job, i) => (
        <Reveal key={job.slug} delay={Math.min(i, 5) * 0.05}>
          <JobRow
            job={job}
            index={i}
            isOpen={openSlug === job.slug}
            onToggle={() => setOpenSlug((s) => (s === job.slug ? null : job.slug))}
          />
        </Reveal>
      ))}
    </div>
  );
}
