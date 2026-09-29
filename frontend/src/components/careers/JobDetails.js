import React from 'react';
import { FlowButton } from '@/components/ui/flow-button';

/*
  Expanded role content. Presentation only — receives a job object from
  data/jobs.js and lays it out using the existing tokens (meta labels,
  hairlines, amber accent, display type). No new colours or fonts.
*/

/*
  `children` here is always a React ELEMENT — <Bullets …> is truthy even when it
  renders null — so this cannot decide emptiness itself. The call sites test the
  data instead; see the `?.length` guards below.
*/
function Block({ label, children, className = '' }) {
  return (
    <section className={className} style={{ marginBottom: 34 }}>
      <div className="meta mb-4" style={{ color: 'var(--ink)' }}>{label}</div>
      {children}
    </section>
  );
}

/*
  A section with nothing in it is not rendered at all.

  Every role used to declare all four lists, so `items.map` ran unguarded — and
  a role posted without one would have thrown on `undefined.map`, taking the
  whole careers page down rather than omitting a heading. Roles differ in what
  they can honestly say: a non-engineering role may have no technologies worth
  listing, and inventing bullets to satisfy a renderer is worse than showing
  fewer sections.
*/
function Bullets({ items }) {
  if (!items || !items.length) return null;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3" style={{ marginBottom: 9 }}>
          <span
            aria-hidden="true"
            style={{ width: 5, height: 5, background: 'var(--amber)', marginTop: 8, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-body)' }}>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Chips({ items }) {
  if (!items || !items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => (
        <span
          key={t}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--text-body)',
            border: '1px solid var(--stone-100)',
            borderRadius: 999,
            padding: '5px 12px',
            background: 'var(--white)',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

function MetaRow({ k, v }) {
  return (
    <div className="grid grid-cols-3 gap-4" style={{ padding: '10px 0', borderBottom: '1px solid var(--stone-100)' }}>
      <div className="meta" style={{ color: 'var(--text-secondary)' }}>{k}</div>
      <div className="col-span-2" style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.5 }}>{v}</div>
    </div>
  );
}

export default function JobDetails({ job, onApply }) {
  return (
    <div className="grid lg:grid-cols-12 gap-x-14 gap-y-2" style={{ paddingTop: 30, paddingBottom: 34 }}>
      {/* Primary column */}
      <div className="lg:col-span-8">
        <Block label="Role Summary">
          {job.summary.map((p, i) => (
            <p key={i} style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-body)', marginBottom: 13, maxWidth: 'var(--measure)' }}>{p}</p>
          ))}
        </Block>

        {job.responsibilities?.length > 0 && (
          <Block label="Responsibilities">
            <Bullets items={job.responsibilities} />
          </Block>
        )}

        {job.required?.length > 0 && (
          <Block label="Required Qualifications">
            <Bullets items={job.required} />
          </Block>
        )}

        {job.preferred?.length > 0 && (
          <Block label="Preferred Qualifications">
            <Bullets items={job.preferred} />
          </Block>
        )}

        {job.technologies?.length > 0 && (
          <Block label="Technologies">
            <Chips items={job.technologies} />
          </Block>
        )}

      </div>

      {/* Secondary column */}
      <aside className="lg:col-span-4">
        <Block label="Details">
          <div>
            <MetaRow k="LOCATION" v={job.location} />
            <MetaRow k="TYPE" v={job.employment} />
            <MetaRow k="EXPERIENCE" v={job.experience} />
            <MetaRow k="TRAVEL" v={job.travel} />
            <MetaRow k="CLEARANCE" v={job.clearance} />
          </div>
        </Block>

        {/* Benefits are the same for every role, so they run once at page level
            (Careers.js) rather than repeating inside each panel.

            This comment used to claim the hiring process did the same. It did
            not: HIRING_PROCESS was spread into every job record as `process`
            and read by nothing, on this page or any other. The array has been
            removed rather than left as data the bundle carries to every visitor
            for no one to render. If the careers page should describe the
            hiring process — and the original intent here suggests it should —
            that is a section someone needs to write, not a variable someone
            needs to find. */}

        {/*
          Apply. The form is on this same page, so this hands off to it rather
          than sending the reader to their mail client: onApply selects this role
          in the form and moves focus there, so the role field is already correct
          and the reader never retypes a title we already know.

          The mailto route that lived here is gone — it told the reader to put
          the role in a subject line by hand, which is the job the handoff now
          does without them. Both addresses on Careers.js still work for anyone
          who would rather write.
        */}
        <div style={{ borderTop: '1px solid var(--stone-100)', paddingTop: 22 }}>
          <FlowButton
            type="button"
            variant="ink"
            text={`Apply for ${job.title}`}
            onClick={() => onApply?.(job)}
          />
          <div
            className="mt-3"
            style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 'var(--measure-sm)' }}
          >
            This is a 4 month unpaid internship.
          </div>
          <div
            className="mt-2"
            style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 'var(--measure-sm)' }}
          >
            Expected response time is two to three weeks.
          </div>
        </div>
      </aside>
    </div>
  );
}
