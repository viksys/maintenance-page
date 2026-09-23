import React from 'react';

/*
  Expanded role content. Presentation only — receives a job object from
  data/jobs.js and lays it out using the existing tokens (meta labels,
  hairlines, amber accent, display type). No new colours or fonts.
*/

function Block({ label, children, className = '' }) {
  return (
    <section className={className} style={{ marginBottom: 34 }}>
      <div className="meta mb-4" style={{ color: 'var(--ink)' }}>{label}</div>
      {children}
    </section>
  );
}

function Bullets({ items }) {
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

export default function JobDetails({ job }) {
  return (
    <div className="grid lg:grid-cols-12 gap-x-14 gap-y-2" style={{ paddingTop: 30, paddingBottom: 34 }}>
      {/* Primary column */}
      <div className="lg:col-span-8">
        <Block label="Role Summary">
          {job.summary.map((p, i) => (
            <p key={i} style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-body)', marginBottom: 13, maxWidth: 'var(--measure)' }}>{p}</p>
          ))}
        </Block>

        <Block label="Responsibilities">
          <Bullets items={job.responsibilities} />
        </Block>

        <Block label="Required Qualifications">
          <Bullets items={job.required} />
        </Block>

        <Block label="Preferred Qualifications">
          <Bullets items={job.preferred} />
        </Block>

        <Block label="Technologies">
          <Chips items={job.technologies} />
        </Block>

      </div>

      {/* Secondary column */}
      <aside className="lg:col-span-4">
        <Block label="Details">
          <div>
            <MetaRow k="LOCATION" v={job.location} />
            <MetaRow k="TYPE" v={job.employment} />
            <MetaRow k="EXPERIENCE" v={job.experience} />
            <MetaRow k="WORKPLACE" v={job.workplace} />
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

        {/* How to apply. There is no application form on the site, so this is
            the whole route in: the address, and what to put in the subject so
            it is triaged against the right role. --amber-text, not --amber:
            this panel sits on a light surface. */}
        <div style={{ borderTop: '1px solid var(--stone-100)', paddingTop: 22 }}>
          <div className="meta mb-3" style={{ color: 'var(--ink)' }}>HOW TO APPLY</div>
          <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.65, maxWidth: 'var(--measure-sm)' }}>
            Send your application to{' '}
            <a
              href="mailto:info@vikasanasystems.tech"
              style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
            >
              info@vikasanasystems.tech
            </a>{' '}
            with &ldquo;{job.title}&rdquo; in the subject line, and attach your résumé.
          </div>
          {/* "Applications are read by an engineer" was here too. It is a claim
              about the whole page, not about this role, and it now sits once in
              the UNLISTED ROLES coda on Careers.js — where the reader who most
              needs the reassurance can actually see it, since they never open a
              panel. What stays here is the one fact that belongs at the point
              of action. */}
          <div className="mt-3" style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 'var(--measure-sm)' }}>
            Expected response time is two to three weeks.
          </div>
        </div>
      </aside>
    </div>
  );
}
