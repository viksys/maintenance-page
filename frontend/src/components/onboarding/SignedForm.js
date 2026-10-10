import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlowButton } from '@/components/ui/flow-button';
import { ONBOARDING_ENDPOINT } from '@/data/onboarding';
import { Field, Upload, fileToBase64, rejectReason } from './uploadKit';

/*
  The second form on /onboarding: a candidate returning their signed offer
  letter and NDA.

  ─────────────────────────────────────────────────────────────────────────────
  WHY NAME AND DATE OF BIRTH, AND NOT EMAIL
  ─────────────────────────────────────────────────────────────────────────────

  The row already holds an email address. Asking for it again is another chance
  to mistype it, and a mistyped address here would attach someone's signed
  documents to the wrong row — or to none. A date of birth is something the
  candidate has already given us and nobody else is likely to pair correctly
  with their name, so it identifies the row AND checks it at once.

  The script refuses when the pair does not match. It does NOT append a row, as
  the details form does: a signed document with no record to attach to is a file
  nobody will look for.
*/

const HEADERS = { 'Content-Type': 'text/plain;charset=utf-8' };
/* Two uploads of up to 5 MB, base64 so a third larger again. Same allowance as
   the details form, for the same reason. */
const TIMEOUT_MS = 180000;

export default function SignedForm() {
  const [form, setForm] = useState({ name: '', dob: '' });
  const [files, setFiles] = useState({ signedOffer: null, signedNda: null });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [dots, setDots] = useState(1);
  /* null | { ok: true } | { ok: false, message } */
  const [result, setResult] = useState(null);

  const offerRef = useRef(null);
  const ndaRef = useRef(null);

  useEffect(() => {
    if (!sending) {
      setDots(1);
      return undefined;
    }
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    return () => clearInterval(id);
  }, [sending]);

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

  /* Validated on selection, so nobody waits out an upload to be told no. */
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

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (sending) return;

      const values = { kind: 'signed', name: form.name.trim(), dob: form.dob };

      const found = {};
      if (!values.name) found.name = 'Please give your full name, as it appears on your offer letter.';
      if (!values.dob) found.dob = 'Please give your date of birth.';
      if (!files.signedOffer) found.signedOffer = 'Please attach your signed offer letter.';
      if (!files.signedNda) found.signedNda = 'Please attach your signed NDA.';

      setErrors(found);
      if (Object.keys(found).length) {
        const first = ['name', 'dob', 'signedOffer', 'signedNda'].find((k) => found[k]);
        document.getElementById(`sg-${first}`)?.focus();
        return;
      }

      setSending(true);
      setResult(null);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const payload = {
          ...values,
          signedOffer: {
            name: files.signedOffer.name,
            type: files.signedOffer.type || '',
            data: await fileToBase64(files.signedOffer),
          },
          signedNda: {
            name: files.signedNda.name,
            type: files.signedNda.type || '',
            data: await fileToBase64(files.signedNda),
          },
        };

        const res = await fetch(ONBOARDING_ENDPOINT, {
          method: 'POST',
          headers: HEADERS,
          signal: controller.signal,
          body: JSON.stringify(payload),
        });

        /* Read as text and parse defensively — Apps Script answers a POST across
           a 302 and an unparseable 2xx is the body arriving in a form this page
           cannot read, not the script declining. */
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
            ? { ok: false, message: 'Something went wrong at our end. Please write to info@vikasanasystems.tech.' }
            : { ok: true });
          return;
        }

        if (data && data.ok) {
          setResult({ ok: true });
          return;
        }

        if (data && data.error && ['name', 'dob', 'signedOffer', 'signedNda'].includes(data.error)) {
          setErrors((prev) => ({ ...prev, [data.error]: data.message }));
        }
        setResult({ ok: false, message: (data && data.message) || 'That did not go through. Please try again.' });
      } catch (err) {
        /* Aborting cancels the browser's side only; the script has the body and
           runs on. Neither message claims it did not arrive. */
        setResult({
          ok: false,
          message:
            err.name === 'AbortError'
              ? 'This is taking longer than expected, so we stopped waiting for a reply. Your documents may already have reached us — check with info@vikasanasystems.tech before sending again.'
              : 'We lost the connection before we got a reply. Your documents may or may not have reached us — check with info@vikasanasystems.tech before sending again.',
        });
      } finally {
        clearTimeout(timer);
        setSending(false);
      }
    },
    [form, files, sending]
  );

  if (result?.ok) {
    return (
      <div role="status" style={{ maxWidth: 'var(--measure)' }}>
        <h3 className="h-display fs-h3 mb-4">Received — thank you.</h3>
        <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
          Your signed offer letter and NDA are with us. There is nothing else to do.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
        <Field id="sg-name" label="FULL NAME" required error={errors.name}>
          <input
            id="sg-name"
            className="input"
            value={form.name}
            onChange={set('name')}
            maxLength={120}
            autoComplete="name"
            aria-required="true"
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? 'sg-name-error' : undefined}
            placeholder="As it appears on your offer letter"
          />
        </Field>

        <Field id="sg-dob" label="DATE OF BIRTH" required error={errors.dob}>
          <input
            id="sg-dob"
            type="date"
            className="input"
            value={form.dob}
            onChange={set('dob')}
            autoComplete="bday"
            aria-required="true"
            aria-invalid={errors.dob ? 'true' : undefined}
            aria-describedby={errors.dob ? 'sg-dob-error' : undefined}
          />
        </Field>

        <Upload
          id="sg-signedOffer"
          label="SIGNED OFFER LETTER"
          file={files.signedOffer}
          error={errors.signedOffer}
          inputRef={offerRef}
          onPick={pickFile('signedOffer', offerRef)}
          onClear={() => {
            setFiles((f) => ({ ...f, signedOffer: null }));
            if (offerRef.current) offerRef.current.value = '';
          }}
        />

        <Upload
          id="sg-signedNda"
          label="SIGNED NDA"
          file={files.signedNda}
          error={errors.signedNda}
          inputRef={ndaRef}
          onPick={pickFile('signedNda', ndaRef)}
          onClear={() => {
            setFiles((f) => ({ ...f, signedNda: null }));
            if (ndaRef.current) ndaRef.current.value = '';
          }}
        />
      </div>

      <div className="flex items-center gap-4" style={{ marginTop: 20 }}>
        <FlowButton type="submit" variant="ink" text={sending ? 'Uploading…' : 'Send Signed Copies'} />
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          <span aria-live="polite" role="status">{sending ? 'Uploading' : ''}</span>
          {sending && (
            <span aria-hidden="true" style={{ fontFamily: 'var(--font-mono)' }}>{'.'.repeat(dots)}</span>
          )}
        </span>
      </div>

      {result && !result.ok && (
        <div role="alert" style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 16, lineHeight: 1.6, maxWidth: 'var(--measure-sm)' }}>
          {result.message}
        </div>
      )}
    </form>
  );
}
