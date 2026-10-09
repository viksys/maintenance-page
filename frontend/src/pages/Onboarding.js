import React, { useCallback, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import Seo from '@/components/Seo';
import { FlowButton } from '@/components/ui/flow-button';
import { ONBOARDING_ENDPOINT, ONBOARDING_READY } from '@/data/onboarding';

/*
  Intern onboarding — an unlisted page.

  An incoming intern fills in the details that go on their offer letter and NDA.
  The Apps Script behind it (WebForm.gs in the HR kit) writes them into that
  intern's row on the Candidates sheet and schedules both documents for a random
  10–15 minutes later.

  ─────────────────────────────────────────────────────────────────────────────
  HIDDEN, THE SAME FOUR WAYS AS /meet-scheduler
  ─────────────────────────────────────────────────────────────────────────────

  Nothing links to it; <Seo noindex>; excluded from sitemap.xml via
  scripts/hidden-routes.js; and the prerendered shell is written noindex with no
  canonical, which is the one that matters — <Seo> runs in the bundle, so a
  crawler that does not execute JavaScript reads the shell and nothing else.

  Still prerendered, so the URL answers 200 rather than falling through to
  404.html. Unlisted is not private: the route is in the public bundle.

  THAT MATTERS MORE HERE THAN IT DOES ON THE BOOKING PAGE. This form collects a
  home address and a mobile number. Anyone with the URL can submit, and the only
  thing standing between a stranger and a row on the sheet is that they would
  have to guess a seeded name — and failing that, they get a new row appended
  rather than a generated letter. Nothing is emailed to an address that HR has
  not already got on the sheet or that the intern has not typed themselves, and
  no document is generated from this page without that round trip. If this ever
  needs to be restricted rather than merely unlisted, it has to be done in the
  script, not here.

  ─────────────────────────────────────────────────────────────────────────────
  THE WAIT IS NAMED BUT NOT TIMED
  ─────────────────────────────────────────────────────────────────────────────

  The documents do not arrive on submit. The script waits 10–15 minutes, then
  mails them to info@vikasanasystems.tech — and they reach the intern only when
  someone there forwards them, because Apps Script cannot send as anything but
  the account it runs on and an offer letter should not arrive from a gmail
  address.

  So the page says the documents are being prepared and will be emailed, and
  does NOT print a number. The 10–15 minutes is our half of the chain, not
  theirs; an intern told "15 minutes" who has nothing after twenty submits
  again, the script refuses the second submission, and the refusal reads as a
  broken form.
*/

const HEADERS = { 'Content-Type': 'text/plain;charset=utf-8' };
const TIMEOUT_MS = 30000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Onboarding() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    address1: '',
    address2: '',
    address3: '',
  });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  /* null | { ok: true, minutes } | { ok: false, message } */
  const [result, setResult] = useState(null);

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
        mobile: form.mobile.trim(),
        address1: form.address1.trim(),
        address2: form.address2.trim(),
        address3: form.address3.trim(),
      };

      const found = {};
      if (!values.name) found.name = 'Please give your full name, as it should appear on the letter.';
      if (!values.email) found.email = 'An email address is required — the documents go there.';
      else if (!EMAIL_RE.test(values.email)) found.email = 'That email address does not look right.';
      if (!values.mobile) found.mobile = 'A mobile number is required.';
      if (!values.address1) found.address1 = 'Please give your address.';

      setErrors(found);
      if (Object.keys(found).length) {
        const first = ['name', 'email', 'mobile', 'address1'].find((k) => found[k]);
        document.getElementById(`ob-${first}`)?.focus();
        return;
      }

      setSending(true);
      setResult(null);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch(ONBOARDING_ENDPOINT, {
          method: 'POST',
          headers: HEADERS,
          signal: controller.signal,
          body: JSON.stringify(values),
        });

        /*
          Read as text and parse defensively. res.json() throws on a body that
          is not JSON and the old careers form turned that into a reported
          failure for a submission that had succeeded — Apps Script answers a
          POST with a 302 and serves the payload from googleusercontent, and an
          unparseable 2xx is the body arriving in a form this page cannot read
          rather than the script declining.
        */
        const raw = await res.text().catch(() => '');
        let data = null;
        try {
          data = JSON.parse(raw);
        } catch {
          data = null;
        }

        if (!data && res.ok) {
          const crashed = /ReferenceError|TypeError|Exception|SyntaxError|is not defined/i.test(raw);
          setResult(crashed
            ? { ok: false, message: 'Something went wrong at our end. Nothing was saved — please try again, or write to info@vikasanasystems.tech.' }
            : { ok: true });
          return;
        }

        if (data && data.ok) {
          setResult({ ok: true, minutes: data.minutes });
          return;
        }

        if (data && data.error && ['name', 'email', 'mobile', 'address1'].includes(data.error)) {
          setErrors((prev) => ({ ...prev, [data.error]: data.message }));
        }
        setResult({ ok: false, message: (data && data.message) || 'That did not go through. Please try again.' });
      } catch (err) {
        /* Aborting the request does not stop the script — it has the body
           already and runs to completion. Neither message claims the submission
           did not happen, because neither can know. */
        setResult({
          ok: false,
          message:
            err.name === 'AbortError'
              ? 'This is taking longer than expected, so we stopped waiting for a reply. Your details may already have reached us — check with info@vikasanasystems.tech before submitting again.'
              : 'We lost the connection before we got a reply. Your details may or may not have reached us — check with info@vikasanasystems.tech before submitting again.',
        });
      } finally {
        clearTimeout(timer);
        setSending(false);
      }
    },
    [form, sending]
  );

  return (
    <div>
      <Seo
        title="Intern Onboarding"
        description="Confirm the details for your VIKASANA Systems offer letter and NDA."
        noindex
      />
      <Header variant="light" />

      <main id="main-content" tabIndex={-1}>
        <section style={{ background: 'var(--white)' }}>
          <div className="container-x section-y">
            <Reveal>
              <SectionLabel number="01 / 01" label="Onboarding" amber className="mb-10" />
              <h1 className="h-display fs-h2 mb-6">
                Your <span className="text-amber">details.</span>
              </h1>
            </Reveal>

            {!ONBOARDING_READY ? (
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
                  This form is not open yet. Write to{' '}
                  <a href="mailto:info@vikasanasystems.tech" style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}>
                    info@vikasanasystems.tech
                  </a>{' '}
                  and we will take your details directly.
                </div>
              </Reveal>
            ) : result?.ok ? (
              <Reveal>
                <div role="status" style={{ maxWidth: 'var(--measure)' }}>
                  <h2 className="h-display fs-h3 mb-4">Thank you — that is with us.</h2>
                  <p className="text-[14px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    Your offer letter and NDA are being prepared and will be emailed to{' '}
                    <strong style={{ color: 'var(--ink)' }}>{form.email.trim()}</strong>. Check that address is
                    right — it is where the documents go.
                  </p>
                  {/* Said plainly, because the alternative is an intern deciding
                      it failed and submitting again — which the script refuses,
                      and a refusal reads as a broken form. */}
                  <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                    There is nothing else to do. Please do not submit the form again — if the documents have not
                    arrived by the end of the next working day, check your spam folder and then write to{' '}
                    <a href="mailto:info@vikasanasystems.tech" style={{ color: 'var(--amber-text)', textDecoration: 'underline' }}>
                      info@vikasanasystems.tech
                    </a>
                    .
                  </p>
                </div>
              </Reveal>
            ) : (
              <Reveal>
                <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
                  <div className="md:col-span-4">
                    <div className="meta mb-4" style={{ color: 'var(--text-secondary)' }}>WHAT THIS IS FOR</div>
                    <p className="text-[14px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                      These details go onto your offer letter and your NDA exactly as you type them. Give your
                      name as it should appear on a signed document.
                    </p>
                    <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                      Your role, dates and reference numbers are already set — you do not need to enter them.
                    </p>
                  </div>

                  <div className="md:col-span-8">
                    <form onSubmit={onSubmit} noValidate>
                      <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
                        <Field id="ob-name" label="FULL NAME" required error={errors.name}>
                          <input
                            id="ob-name"
                            className="input"
                            value={form.name}
                            onChange={set('name')}
                            maxLength={120}
                            autoComplete="name"
                            aria-required="true"
                            aria-invalid={errors.name ? 'true' : undefined}
                            aria-describedby={errors.name ? 'ob-name-error' : undefined}
                            placeholder="As it should appear on the letter"
                          />
                        </Field>

                        <Field id="ob-email" label="EMAIL" required error={errors.email}>
                          <input
                            id="ob-email"
                            type="email"
                            className="input"
                            value={form.email}
                            onChange={set('email')}
                            maxLength={254}
                            autoComplete="email"
                            aria-required="true"
                            aria-invalid={errors.email ? 'true' : undefined}
                            aria-describedby={errors.email ? 'ob-email-error' : undefined}
                            placeholder="you@example.com"
                          />
                        </Field>

                        <Field id="ob-mobile" label="MOBILE" required error={errors.mobile} className="md:col-span-2">
                          <input
                            id="ob-mobile"
                            type="tel"
                            className="input"
                            value={form.mobile}
                            onChange={set('mobile')}
                            maxLength={40}
                            autoComplete="tel"
                            aria-required="true"
                            aria-invalid={errors.mobile ? 'true' : undefined}
                            aria-describedby={errors.mobile ? 'ob-mobile-error' : undefined}
                            placeholder="Including country code"
                          />
                        </Field>

                        <Field id="ob-address1" label="ADDRESS — LINE 1" required error={errors.address1} className="md:col-span-2">
                          <input
                            id="ob-address1"
                            className="input"
                            value={form.address1}
                            onChange={set('address1')}
                            maxLength={160}
                            autoComplete="address-line1"
                            aria-required="true"
                            aria-invalid={errors.address1 ? 'true' : undefined}
                            aria-describedby={errors.address1 ? 'ob-address1-error' : undefined}
                            placeholder="House or flat, street"
                          />
                        </Field>

                        <Field id="ob-address2" label="ADDRESS — LINE 2" className="md:col-span-2">
                          <input
                            id="ob-address2"
                            className="input"
                            value={form.address2}
                            onChange={set('address2')}
                            maxLength={160}
                            autoComplete="address-line2"
                            placeholder="Area, landmark"
                          />
                        </Field>

                        <Field id="ob-address3" label="ADDRESS — LINE 3" className="md:col-span-2">
                          <input
                            id="ob-address3"
                            className="input"
                            value={form.address3}
                            onChange={set('address3')}
                            maxLength={160}
                            autoComplete="address-level2"
                            placeholder="City, state and PIN code"
                          />
                        </Field>
                      </div>

                      {/* Set the expectation BEFORE the button, not only after.
                          Someone who reads it here does not refresh their inbox
                          thirty seconds later. */}
                      <p className="text-[12.5px] mt-6" style={{ color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 'var(--measure-sm)' }}>
                        Your documents are prepared after you submit and sent by email. They do not arrive
                        immediately.
                      </p>

                      <div className="flex items-center gap-4" style={{ marginTop: 20 }}>
                        <FlowButton type="submit" variant="ink" text={sending ? 'Submitting…' : 'Submit Details'} />
                        <span aria-live="polite" role="status" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                          {sending ? 'Submitting…' : ''}
                        </span>
                      </div>

                      {result && !result.ok && (
                        <div role="alert" style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 16, lineHeight: 1.6, maxWidth: 'var(--measure-sm)' }}>
                          {result.message}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* Label, control and error wired together. Local to this page: this tree has no
   shared form primitives, and the careers form keeps its own for the same
   reason. */
function Field({ id, label, required, error, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="meta mb-2" style={{ display: 'block' }}>
        {label}{' '}
        {required && (
          <span aria-hidden="true" style={{ color: 'var(--amber-text)' }}>
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <div id={`${id}-error`} style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  );
}
