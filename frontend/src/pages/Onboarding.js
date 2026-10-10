import React, { useCallback, useEffect, useRef, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SectionLabel from '@/components/SectionLabel';
import Reveal from '@/components/Reveal';
import Seo from '@/components/Seo';
import { FlowButton } from '@/components/ui/flow-button';
import { ONBOARDING_ENDPOINT, ONBOARDING_READY } from '@/data/onboarding';
import SignedForm from '@/components/onboarding/SignedForm';
import { Field, Upload, fileToBase64, rejectReason } from '@/components/onboarding/uploadKit';

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

  Submitting GENERATES the documents and sends nothing. They are emailed only
  once someone at VIKASANA has approved the row — a deliberate act, from a menu
  in the sheet.

  So the page gives no figure and no sentence about how soon. The wait is a
  person's attention, which cannot be predicted, and an intern given a number
  who has nothing by it submits again — which the script refuses, and the
  refusal reads as a broken form.
*/

const HEADERS = { 'Content-Type': 'text/plain;charset=utf-8' };

/*
  The script schedules the documents and answers immediately, so this request is
  a sheet write and a trigger — a second or two, not the ~18s a synchronous
  generation measured. 120s was the allowance for that synchronous version and
  is no longer what is being waited on.

  Still generous, because the cost of being wrong is asymmetric: too short
  reports a failure over a submission that worked, which is what sends someone
  back to submit a second time.
*/
/* Two uploads of up to 5 MB each, base64 so a third larger again, on whatever
   upstream the intern has. The generation is still scheduled rather than done
   here, so this allows for the transfer and nothing else. */
const TIMEOUT_MS = 180000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Onboarding() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    address1: '',
    address2: '',
    address3: '',
    dob: '',
    university: '',
    aadhaar: '',
  });
  const [files, setFiles] = useState({ aadhaarFile: null, transcriptFile: null });
  const aadhaarRef = useRef(null);
  const transcriptRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  /* Animates the ellipsis while the request is open. The documents take tens of
     seconds to build, and a label that never changes looks like one that has
     stopped. */
  const [dots, setDots] = useState(1);
  /* null | { ok: true, minutes } | { ok: false, message } */
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!sending) {
      setDots(1);
      return undefined;
    }
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(id);
  }, [sending]);

  /* Validated on selection rather than on submit: telling someone their file is
     too large after they have filled the whole form in is a worse moment. */
  const pickFile = (key, ref) => (e) => {
    const picked = e.target.files?.[0] || null;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (!picked) {
      setFiles((f) => ({ ...f, [key]: null }));
      return;
    }
    const bad = rejectReason(picked);
    if (bad) {
      setFiles((f) => ({ ...f, [key]: null }));
      if (ref.current) ref.current.value = '';
      setErrors((prev) => ({ ...prev, [key]: bad }));
      return;
    }
    setFiles((f) => ({ ...f, [key]: picked }));
  };

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
        dob: form.dob,
        university: form.university.trim(),
        aadhaar: form.aadhaar.replace(/\D/g, ''),
      };

      const found = {};
      if (!values.name) found.name = 'Please give your full name, as it should appear on the letter.';
      if (!values.email) found.email = 'An email address is required — the documents go there.';
      else if (!EMAIL_RE.test(values.email)) found.email = 'That email address does not look right.';
      if (!values.mobile) found.mobile = 'A mobile number is required.';
      if (!values.address1) found.address1 = 'Please give your address.';
      if (!values.dob) found.dob = 'Please give your date of birth.';
      if (!values.university) found.university = 'Please give your university or college.';
      if (!values.aadhaar) found.aadhaar = 'Please give your Aadhaar number.';
      else if (values.aadhaar.length !== 12) found.aadhaar = 'An Aadhaar number is twelve digits.';
      if (!files.aadhaarFile) found.aadhaarFile = 'Please attach your Aadhaar card.';
      if (!files.transcriptFile) found.transcriptFile = 'Please attach your latest transcript or grade card.';

      setErrors(found);
      if (Object.keys(found).length) {
        const first = ['name', 'email', 'dob', 'university', 'mobile', 'address1', 'aadhaar', 'aadhaarFile', 'transcriptFile'].find((k) => found[k]);
        document.getElementById(`ob-${first}`)?.focus();
        return;
      }

      setSending(true);
      setResult(null);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const payload = {
          ...values,
          aadhaarFile: {
            name: files.aadhaarFile.name,
            type: files.aadhaarFile.type || '',
            data: await fileToBase64(files.aadhaarFile),
          },
          transcriptFile: {
            name: files.transcriptFile.name,
            type: files.transcriptFile.type || '',
            data: await fileToBase64(files.transcriptFile),
          },
        };

        const res = await fetch(ONBOARDING_ENDPOINT, {
          method: 'POST',
          headers: HEADERS,
          signal: controller.signal,
          body: JSON.stringify(payload),
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

        if (data && data.error && ['name', 'email', 'dob', 'university', 'mobile', 'address1', 'aadhaar', 'aadhaarFile', 'transcriptFile'].includes(data.error)) {
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
    [form, files, sending]
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
                {/* Replaces the details form only. The signed-returns section
                    below stays where it is — a candidate who has just sent
                    their details has no use for it yet, but hiding half the
                    page on success is a surprise, and they will be back. */}
                <div role="status" style={{ maxWidth: 'var(--measure)' }}>
                  <h2 className="h-display fs-h3 mb-4">Thank you — that is with us.</h2>
                  <p className="text-[14px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                    Your offer letter and NDA have been prepared. They will be emailed to{' '}
                    <strong style={{ color: 'var(--ink)' }}>{form.email.trim()}</strong> once we have checked
                    them. Make sure that address is right — it is where the documents go.
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

                        <Field id="ob-dob" label="DATE OF BIRTH" required error={errors.dob}>
                          {/* type=date, so the browser supplies its own picker
                              and a locale-correct display while still handing us
                              yyyy-mm-dd. A text box here would collect
                              07/04/1999 from one person and 04/07/1999 from the
                              next, and nothing downstream could tell them
                              apart. */}
                          <input
                            id="ob-dob"
                            type="date"
                            className="input"
                            value={form.dob}
                            onChange={set('dob')}
                            autoComplete="bday"
                            aria-required="true"
                            aria-invalid={errors.dob ? 'true' : undefined}
                            aria-describedby={errors.dob ? 'ob-dob-error' : undefined}
                          />
                        </Field>

                        <Field id="ob-university" label="UNIVERSITY / COLLEGE" required error={errors.university}>
                          <input
                            id="ob-university"
                            className="input"
                            value={form.university}
                            onChange={set('university')}
                            maxLength={160}
                            autoComplete="organization"
                            aria-required="true"
                            aria-invalid={errors.university ? 'true' : undefined}
                            aria-describedby={errors.university ? 'ob-university-error' : undefined}
                            placeholder="Where you study"
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

                        <Field id="ob-aadhaar" label="AADHAAR NUMBER" required error={errors.aadhaar} className="md:col-span-2">
                          <input
                            id="ob-aadhaar"
                            className="input"
                            inputMode="numeric"
                            value={form.aadhaar}
                            onChange={set('aadhaar')}
                            maxLength={14}
                            aria-required="true"
                            aria-invalid={errors.aadhaar ? 'true' : undefined}
                            aria-describedby={errors.aadhaar ? 'ob-aadhaar-error' : 'ob-aadhaar-hint'}
                            placeholder="12 digits"
                          />
                          {!errors.aadhaar && (
                            <div id="ob-aadhaar-hint" style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 6 }}>
                              Spaces are fine — only the digits are kept.
                            </div>
                          )}
                        </Field>

                        <Upload
                          id="ob-aadhaarFile"
                          label="AADHAAR CARD"
                          file={files.aadhaarFile}
                          error={errors.aadhaarFile}
                          inputRef={aadhaarRef}
                          onPick={pickFile('aadhaarFile', aadhaarRef)}
                          onClear={() => {
                            setFiles((f) => ({ ...f, aadhaarFile: null }));
                            if (aadhaarRef.current) aadhaarRef.current.value = '';
                          }}
                        />

                        <Upload
                          id="ob-transcriptFile"
                          label="LATEST TRANSCRIPT / GRADE CARD"
                          file={files.transcriptFile}
                          error={errors.transcriptFile}
                          inputRef={transcriptRef}
                          onPick={pickFile('transcriptFile', transcriptRef)}
                          onClear={() => {
                            setFiles((f) => ({ ...f, transcriptFile: null }));
                            if (transcriptRef.current) transcriptRef.current.value = '';
                          }}
                        />
                      </div>

                      {/* Before the button, not only on the confirmation: that the
                          documents are emailed rather than downloaded is worth
                          knowing while deciding to submit. It says no more than
                          that — the sentence about not arriving immediately was
                          removed by direction. */}
                      <p className="text-[12.5px] mt-6" style={{ color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 'var(--measure-sm)' }}>
                        Your documents are prepared when you submit, then checked by us and emailed to
                        you.
                      </p>

                      <div className="flex items-center gap-4" style={{ marginTop: 20 }}>
                        <FlowButton type="submit" variant="ink" text={sending ? 'Submitting…' : 'Submit Details'} />
                        {/* The word sits alone in the live region and the dots
                            are aria-hidden beside it: a live region whose text
                            changes every 400ms is announced every 400ms. */}
                        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                          <span aria-live="polite" role="status">
                            {sending ? 'Submitting' : ''}
                          </span>
                          {sending && (
                            <span aria-hidden="true" style={{ fontFamily: 'var(--font-mono)' }}>
                              {'.'.repeat(dots)}
                            </span>
                          )}
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

            {/*
              THE SECOND FORM, ON THE SAME PAGE.

              Both are shown at once rather than behind a tab or a toggle: a
              candidate arrives here twice, weeks apart, and the one they want
              the second time should be visible rather than found. The rule and
              the eyebrow separate them, which is how every other section on
              this site is divided.

              It keeps its own state, so submitting one does not disturb the
              other — the details form replaces itself with a confirmation and
              this is untouched beneath it.
            */}
            {ONBOARDING_READY && (
              <Reveal>
                <div className="mt-16 pt-14" style={{ borderTop: '1px solid var(--stone-100)' }}>
                  <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
                    <div className="md:col-span-4">
                      <div className="meta mb-4" style={{ color: 'var(--text-secondary)' }}>ALREADY SIGNED</div>
                      <h2 className="h-display fs-h3 mb-3">Send them back.</h2>
                      <p className="text-[14px] mb-4" style={{ color: 'var(--text-tertiary)' }}>
                        Once you have signed your offer letter and NDA, upload both here. Scans or clear photos
                        are fine.
                      </p>
                      <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                        Use the name exactly as it appears on your offer letter — it is how we find your record.
                      </p>
                    </div>
                    <div className="md:col-span-8">
                      <SignedForm />
                    </div>
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
