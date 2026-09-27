import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import Seo from '@/components/Seo';
import { FlowButton } from '@/components/ui/flow-button';
import {
  SLOTS,
  DURATION_MINUTES,
  ENDPOINT,
  SCHEDULER_READY,
  istDate,
  istTime,
  viewerTime,
  allSlotsPast,
} from '@/data/scheduler';

/*
  Meeting scheduler — an unlisted page.

  ─────────────────────────────────────────────────────────────────────────────
  "HIDDEN" HERE MEANS FOUR SEPARATE THINGS, AND ALL FOUR ARE LOAD-BEARING
  ─────────────────────────────────────────────────────────────────────────────

  1. Nothing links to it. Not the header, not the footer, not /site-map. A page
     is discoverable through the site the moment one link exists.
  2. <Seo noindex> — search engines are asked not to index it.
  3. It is excluded from sitemap.xml. scripts/generate-seo.js harvests every
     literal route in App.js into the sitemap by default, so this route is named
     in the HIDDEN_ROUTES exclusion there. Submitting a URL in a sitemap while
     asking robots not to index it is a contradiction crawlers resolve by
     visiting it anyway.
  4. It is still PRERENDERED, so the URL resolves with HTTP 200. GitHub Pages
     has no rewrite rule: a route with no built directory falls through to
     404.html, which renders the app but answers 404. A link you send someone
     should not return 404.

  None of that is access control. Anyone with the URL can book, and an unlisted
  URL is not a secret one. If it needs to be restricted, that has to happen in
  the backend, not here.

  ─────────────────────────────────────────────────────────────────────────────
  WHAT THE BROWSER IS AND IS NOT TRUSTED WITH
  ─────────────────────────────────────────────────────────────────────────────

  The slot list below renders the choices. It does not authorise them. The Apps
  Script in docs/meet-scheduler.gs checks every booking against its own copy and
  refuses anything else, because this file is shipped to the visitor and can be
  edited in devtools before it is posted.
*/

/* text/plain, deliberately. A JSON content type makes the browser send a CORS
   preflight, and an Apps Script web app cannot answer OPTIONS — the booking
   would fail before reaching the script. The body is still JSON; only the
   declared type differs, and the script parses it explicitly. */
const POST_HEADERS = { 'Content-Type': 'text/plain;charset=utf-8' };

/* A hung request leaves the button spinning with no way back. */
const TIMEOUT_MS = 20000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function MeetScheduler() {
  const [slot, setSlot] = useState('');
  const [form, setForm] = useState({ name: '', email: '', note: '' });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  /* null | { ok: true, meetLink, slot } | { ok: false, message } */
  const [result, setResult] = useState(null);
  /* Slots the backend reports as already booked, by ISO string. */
  const [taken, setTaken] = useState([]);

  const past = useMemo(() => allSlotsPast(), []);

  /*
    Ask the backend which slots are gone, so a taken one is visibly unavailable
    instead of being offered and then refused after the form is filled in.

    Advisory only — the authoritative check happens inside the booking, under a
    lock. If this request fails the page still works; every slot simply stays
    selectable and a collision is caught on submit.
  */
  useEffect(() => {
    if (!SCHEDULER_READY || past) return undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    fetch(ENDPOINT, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || !data.ok || !Array.isArray(data.slots)) return;
        setTaken(data.slots.filter((s) => s.taken).map((s) => s.slot));
      })
      .catch(() => {
        /* Offline, blocked, or the script is not reachable. Silent by design:
           see above — this is a hint, not a gate. */
      })
      .finally(() => clearTimeout(timer));

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [past]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k];
        return next;
      });
    }
  };

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (sending) return;

      const values = {
        name: form.name.trim(),
        email: form.email.trim(),
        note: form.note.trim(),
      };

      /* Trim before validating: "   " is truthy, so an untrimmed check passes
         on whitespace alone. */
      const found = {};
      if (!slot) found.slot = 'Choose a time.';
      if (!values.name) found.name = 'Please give us a name.';
      if (!values.email) found.email = 'An email address is required — the invitation goes there.';
      else if (!EMAIL_RE.test(values.email)) found.email = 'That email address does not look right.';

      setErrors(found);
      if (Object.keys(found).length) {
        const first = ['slot', 'name', 'email'].find((k) => found[k]);
        if (first !== 'slot') document.getElementById(`m-${first}`)?.focus();
        return;
      }

      setSending(true);
      setResult(null);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: POST_HEADERS,
          signal: controller.signal,
          body: JSON.stringify({ ...values, slot }),
        });

        const data = await res.json().catch(() => null);

        if (data && data.ok) {
          setResult({ ok: true, meetLink: data.meetLink, slot: data.slot || slot });
          return;
        }

        /* A taken slot is not a generic failure: mark it so the list updates and
           the visitor can see what is left without reloading. */
        if (data && data.error === 'taken') {
          setTaken((t) => (t.includes(slot) ? t : [...t, slot]));
          setSlot('');
        }

        setResult({
          ok: false,
          message: (data && data.message) || 'That did not go through. Please try again.',
        });
      } catch (err) {
        setResult({
          ok: false,
          message:
            err.name === 'AbortError'
              ? 'That took too long. Nothing was booked — please try again.'
              : 'We could not reach the booking service. Nothing was booked.',
        });
      } finally {
        clearTimeout(timer);
        setSending(false);
      }
    },
    [form, slot, sending]
  );

  const heading = SLOTS.length ? istDate(SLOTS[0]) : '';

  return (
    <div>
      <Seo
        title="Schedule a call"
        description="Pick a time for a short introductory call with VIKASANA Systems."
        noindex
      />
      <Header variant="light" />

      <main id="main-content" tabIndex={-1}>
        <section style={{ background: 'var(--white)' }}>
          <div className="container-x section-y">
            <Reveal>
              <SectionLabel number="01 / 01" label="Schedule" amber className="mb-10" />
              <h1 className="h-display fs-h2 mb-6">
                Book a <span className="text-amber">15-minute call.</span>
              </h1>
              <p className="text-[14px] measure mb-10" style={{ color: 'var(--text-tertiary)' }}>
                {heading}. Times are shown in India Standard Time. Pick a slot and you will get a Google
                Calendar invitation with a Meet link at the address you give us.
              </p>
            </Reveal>

            {/* ---- The date has passed. Nothing here is bookable any more. ---- */}
            {past ? (
              <Reveal>
                <div
                  role="status"
                  style={{
                    border: '1px solid var(--stone-100)',
                    padding: '18px 20px',
                    fontSize: 13.5,
                    color: 'var(--text-tertiary)',
                    maxWidth: 'var(--measure-sm)',
                  }}
                >
                  These slots have passed. Write to{' '}
                  <a
                    href="mailto:info@vikasanasystems.tech"
                    style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                  >
                    info@vikasanasystems.tech
                  </a>{' '}
                  and we will find another time.
                </div>
              </Reveal>
            ) : !SCHEDULER_READY ? (
              /* ---- Not deployed yet. Say so rather than show a dead form. ---- */
              <Reveal>
                <div
                  role="status"
                  style={{
                    border: '1px solid var(--stone-100)',
                    padding: '18px 20px',
                    fontSize: 13.5,
                    color: 'var(--text-tertiary)',
                    maxWidth: 'var(--measure-sm)',
                  }}
                >
                  Booking is not open yet. Write to{' '}
                  <a
                    href="mailto:info@vikasanasystems.tech"
                    style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                  >
                    info@vikasanasystems.tech
                  </a>{' '}
                  and we will arrange a time directly.
                </div>
              </Reveal>
            ) : result?.ok ? (
              /* ---- Confirmed. States what happened and nothing more. ---- */
              <Reveal>
                <div role="status" style={{ maxWidth: 'var(--measure)' }}>
                  <h2 className="h-display fs-h3 mb-4">You are booked.</h2>
                  <p className="text-[14px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    {istTime(result.slot)} IST on {istDate(result.slot)}, for {DURATION_MINUTES} minutes. A
                    calendar invitation is on its way to{' '}
                    <strong style={{ color: 'var(--ink)' }}>{form.email.trim()}</strong>.
                  </p>
                  {result.meetLink ? (
                    <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                      Google Meet:{' '}
                      <a
                        href={result.meetLink}
                        style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}
                      >
                        {result.meetLink}
                      </a>
                    </p>
                  ) : (
                    /* The event exists but Google returned no conference link.
                       Better to say so than to let them arrive with no way in. */
                    <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                      The meeting is on the calendar. The Meet link will be in the invitation — if it is not,
                      reply to it and we will send one.
                    </p>
                  )}
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <form onSubmit={onSubmit} noValidate style={{ maxWidth: 'var(--measure-sm)' }}>
                  {/* ---- Slots. A radiogroup, not buttons: this is one choice
                       from a set, and arrow-key navigation is what a screen
                       reader user expects of it. ---- */}
                  <fieldset style={{ border: 0, padding: 0, margin: '0 0 26px' }}>
                    <legend className="meta mb-3" style={{ padding: 0 }}>
                      TIME (IST) <span aria-hidden="true" style={{ color: 'var(--amber-text)' }}>*</span>
                    </legend>

                    <div style={{ display: 'grid', gap: 10 }}>
                      {SLOTS.map((iso) => {
                        const isTaken = taken.includes(iso);
                        const local = viewerTime(iso);
                        return (
                          <label
                            key={iso}
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: 12,
                              border: '1px solid',
                              borderColor: slot === iso ? 'var(--amber)' : 'var(--stone-100)',
                              padding: '13px 16px',
                              cursor: isTaken ? 'not-allowed' : 'pointer',
                              opacity: isTaken ? 0.45 : 1,
                            }}
                          >
                            <input
                              type="radio"
                              name="slot"
                              value={iso}
                              checked={slot === iso}
                              disabled={isTaken}
                              onChange={() => {
                                setSlot(iso);
                                setErrors((p) => {
                                  const n = { ...p };
                                  delete n.slot;
                                  return n;
                                });
                              }}
                            />
                            <span>
                              <span className="text-[14px]" style={{ color: 'var(--ink)' }}>
                                {istTime(iso)} IST
                              </span>
                              <span className="meta" style={{ marginLeft: 10, color: 'var(--text-secondary)' }}>
                                {DURATION_MINUTES} MIN
                              </span>
                              {isTaken && (
                                <span className="meta" style={{ marginLeft: 10, color: 'var(--text-secondary)' }}>
                                  · TAKEN
                                </span>
                              )}
                              {local && (
                                <span
                                  className="block text-[12.5px]"
                                  style={{ color: 'var(--text-tertiary)', marginTop: 3 }}
                                >
                                  {local} your time
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {errors.slot && (
                      <div style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 8 }}>{errors.slot}</div>
                    )}
                  </fieldset>

                  <div style={{ display: 'grid', gap: 18, marginBottom: 18 }}>
                    <div>
                      <label htmlFor="m-name" className="meta mb-2" style={{ display: 'block' }}>
                        NAME <span aria-hidden="true" style={{ color: 'var(--amber-text)' }}>*</span>
                      </label>
                      <input
                        id="m-name"
                        className="input"
                        value={form.name}
                        onChange={set('name')}
                        maxLength={120}
                        autoComplete="name"
                        aria-required="true"
                        aria-invalid={errors.name ? 'true' : undefined}
                        aria-describedby={errors.name ? 'm-name-error' : undefined}
                        placeholder="Your name"
                      />
                      {errors.name && (
                        <div id="m-name-error" style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 6 }}>
                          {errors.name}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="m-email" className="meta mb-2" style={{ display: 'block' }}>
                        EMAIL <span aria-hidden="true" style={{ color: 'var(--amber-text)' }}>*</span>
                      </label>
                      <input
                        id="m-email"
                        type="email"
                        className="input"
                        value={form.email}
                        onChange={set('email')}
                        maxLength={254}
                        autoComplete="email"
                        aria-required="true"
                        aria-invalid={errors.email ? 'true' : undefined}
                        aria-describedby={errors.email ? 'm-email-error' : undefined}
                        placeholder="you@organisation.com"
                      />
                      {errors.email && (
                        <div id="m-email-error" style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 6 }}>
                          {errors.email}
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="m-note" className="meta mb-2" style={{ display: 'block' }}>
                        WHAT WOULD YOU LIKE TO DISCUSS?
                      </label>
                      <textarea
                        id="m-note"
                        className="input"
                        rows={4}
                        value={form.note}
                        onChange={set('note')}
                        maxLength={2000}
                        placeholder="Optional — it helps us bring the right person to the call."
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <FlowButton type="submit" variant="ink" text={sending ? 'Booking…' : 'Confirm Booking'} />
                    <span
                      aria-live="polite"
                      role="status"
                      style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}
                    >
                      {sending ? 'Booking…' : ''}
                    </span>
                  </div>

                  {/* role="alert": nothing was booked and the form is still on
                      screen, so this is not something to scroll past. */}
                  {result && !result.ok && (
                    <div
                      role="alert"
                      style={{
                        fontSize: 12.5,
                        color: 'var(--amber-text)',
                        marginTop: 16,
                        lineHeight: 1.6,
                      }}
                    >
                      {result.message}
                    </div>
                  )}
                </form>
              </Reveal>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
