import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlowButton } from '@/components/ui/flow-button';
import {
  CAREERS_ENDPOINT,
  MAX_RESUME_BYTES,
  ALLOWED_EXT,
  ACCEPT_ATTR,
  extensionOf,
  humanSize,
  fileToBase64,
} from '@/data/careersForm';

/*
  Application form.

  Posts to the Apps Script in docs/careers-intake.gs, which appends a row to a
  Google Sheet and files the résumé in a Drive folder.

  ─────────────────────────────────────────────────────────────────────────────
  WHY text/plain FOR A JSON BODY
  ─────────────────────────────────────────────────────────────────────────────

  A Content-Type of application/json makes the request "non-simple", so the
  browser sends a CORS preflight OPTIONS first — and an Apps Script web app
  cannot answer OPTIONS at all. The body is still JSON; only the declared type
  differs, and doPost parses it explicitly.

  ─────────────────────────────────────────────────────────────────────────────
  THE FILE GOES AS BASE64 IN THE JSON BODY
  ─────────────────────────────────────────────────────────────────────────────

  Not multipart. Apps Script's doPost exposes e.postData.contents as a string,
  and reassembling multipart from it by hand is a parser nobody should write.
  Base64 costs about a third in size, which is why the ceiling is 5 MB rather
  than something larger — a 5 MB résumé is already far past what anyone sends.
*/

const HEADERS = { 'Content-Type': 'text/plain;charset=utf-8' };

/*
  MEASURED, NOT GUESSED.

  Against the live endpoint, from a fast connection: a 50 KB résumé completes in
  8s, 1 MB in 15s, 4 MB in 28s. Those are server time plus OUR upload — a
  candidate on a domestic upstream adds their own, and 5 MB is the ceiling the
  form allows. The first version used 60s and a real submission hit it.

  Three minutes is not generosity. It is the number that stops the timeout from
  firing on a submission that is simply still going.
*/
const TIMEOUT_MS = 180000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ApplicationForm({ roles = [], selectedRole = '' }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: '', message: '' });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  /* null | { ok: true } | { ok: false, message } */
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  /*
    Apply on a role panel sets selectedRole, and the field follows it.

    Keyed on the value rather than assigned once, because a reader who opens one
    role, presses Apply, then changes their mind and presses Apply on the other
    must end up with the second — an initial-value-only version would silently
    keep the first and submit the wrong role.

    It does not clear a choice the reader made by hand: selectedRole is only ever
    set to a real title, so an empty value here means "nothing was chosen for
    you", not "clear what you chose".
  */
  useEffect(() => {
    if (!selectedRole) return;
    setForm((f) => (f.role === selectedRole ? f : { ...f, role: selectedRole }));
  }, [selectedRole]);

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

  /* Validated on selection, not on submit. Telling someone their file is too
     large after they have filled the form in is a worse moment to say it. */
  const onFile = (e) => {
    const picked = e.target.files?.[0] || null;
    setErrors((prev) => {
      const next = { ...prev };
      delete next.resume;
      return next;
    });

    if (!picked) {
      setFile(null);
      return;
    }
    if (!ALLOWED_EXT.includes(extensionOf(picked.name))) {
      setFile(null);
      e.target.value = '';
      setErrors((prev) => ({ ...prev, resume: `Attach a ${ALLOWED_EXT.join(', ')} file.` }));
      return;
    }
    if (picked.size > MAX_RESUME_BYTES) {
      setFile(null);
      e.target.value = '';
      setErrors((prev) => ({
        ...prev,
        resume: `That file is ${humanSize(picked.size)}. The limit is ${humanSize(MAX_RESUME_BYTES)}.`,
      }));
      return;
    }
    setFile(picked);
  };

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (sending) return;

      const values = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role.trim(),
        message: form.message.trim(),
      };

      /* Every field is required. Declared in the order they appear, because the
         focus jump below takes the first failure and a reader should be sent to
         the topmost problem, not an arbitrary one. */
      const found = {};
      if (!values.name) found.name = 'Please give us a name.';
      if (!values.email) found.email = 'An email address is required — we reply there.';
      else if (!EMAIL_RE.test(values.email)) found.email = 'That email address does not look right.';
      if (!values.phone) found.phone = 'A phone number is required.';
      if (!values.role) found.role = 'Choose the role you are applying for.';
      if (!values.message) found.message = 'Tell us what you have built and what you want to work on.';
      if (!file) found.resume = 'Attach your résumé.';

      setErrors((prev) => ({ ...prev, ...found }));
      if (Object.keys(found).length) {
        const first = ['name', 'email', 'phone', 'role', 'message', 'resume'].find((k) => found[k]);
        document.getElementById(`ca-${first}`)?.focus();
        return;
      }

      setSending(true);
      setResult(null);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        /* Guaranteed present — validation above returns when it is not. */
        const resume = { name: file.name, type: file.type || '', data: await fileToBase64(file) };

        const res = await fetch(CAREERS_ENDPOINT, {
          method: 'POST',
          headers: HEADERS,
          signal: controller.signal,
          body: JSON.stringify({ ...values, resume }),
        });

        /*
          READ AS TEXT, THEN TRY TO PARSE.

          res.json() throws on a body that is not JSON, and the old code turned
          that into `null` and reported "That did not send" — which is how a
          submission that HAD been saved, and had already emailed info@, was
          shown to the applicant as a failure.

          Apps Script answers a POST with a 302 to script.googleusercontent.com
          and serves the payload from there. Every path our doPost takes returns
          JSON, so an unparseable 200 is not our script declining — it is the
          body arriving in a form this page could not read.

          The one shape that IS a real failure and still returns HTTP 200 is
          Apps Script's own error page, which is HTML naming the exception. That
          is what the sniff below looks for. Everything else that came back 2xx
          is treated as sent, because the alternative — telling someone their
          application failed when it did not — makes them send it twice.
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
          if (!crashed) {
            setResult({ ok: true });
            setForm({ name: '', email: '', phone: '', role: '', message: '' });
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }
          setResult({
            ok: false,
            message:
              'Something went wrong at our end. Nothing was saved — please try again, or write to info@vikasanasystems.tech.',
          });
          return;
        }

        if (data && data.ok) {
          setResult({ ok: true });
          setForm({ name: '', email: '', phone: '', role: '', message: '' });
          setFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        /* A field-specific rejection belongs next to that field, not only in the
           banner — the banner is below the button and may be off screen. */
        if (data && data.error && ['name', 'email', 'message', 'resume'].includes(data.error)) {
          setErrors((prev) => ({ ...prev, [data.error]: data.message }));
        }
        setResult({ ok: false, message: (data && data.message) || 'That did not send. Please try again.' });
      } catch (err) {
        /*
          ABORTING THE REQUEST DOES NOT STOP THE SERVER.

          AbortController cancels the browser's side of the call. The Apps Script
          has already received the body and runs to completion regardless — so on
          a timeout the application has very likely been SAVED, and the old copy
          said "nothing was submitted", which was false and invited the candidate
          to send it twice.

          Neither message now claims the submission did not happen, because
          neither can know. They say what to do instead.
        */
        setResult({
          ok: false,
          message:
            err.name === 'AbortError'
              ? 'This is taking longer than expected, so we stopped waiting for a reply. Your application may already have reached us — please check with info@vikasanasystems.tech before sending it again, so you do not arrive twice.'
              : 'We lost the connection before we got a reply. Your application may or may not have reached us — check with info@vikasanasystems.tech before sending it again.',
        });
      } finally {
        clearTimeout(timer);
        setSending(false);
      }
    },
    [form, file, sending]
  );

  if (result?.ok) {
    return (
      <div role="status" style={{ maxWidth: 'var(--measure)' }}>
        <h3 className="h-display fs-h3 mb-4">Application received.</h3>
        <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
          Every one is read by an engineer. If there is a fit we will write to the address you gave us.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate style={{ maxWidth: 'var(--measure-sm)' }}>
      <div style={{ display: 'grid', gap: 18 }}>
        <TextField id="ca-name" label="NAME" required error={errors.name}>
          <input
            id="ca-name"
            className="input"
            value={form.name}
            onChange={set('name')}
            maxLength={120}
            autoComplete="name"
            aria-required="true"
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? 'ca-name-error' : undefined}
            placeholder="Your name"
          />
        </TextField>

        <TextField id="ca-email" label="EMAIL" required error={errors.email}>
          <input
            id="ca-email"
            type="email"
            className="input"
            value={form.email}
            onChange={set('email')}
            maxLength={254}
            autoComplete="email"
            aria-required="true"
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'ca-email-error' : undefined}
            placeholder="you@example.com"
          />
        </TextField>

        <TextField id="ca-phone" label="PHONE" required error={errors.phone}>
          <input
            id="ca-phone"
            type="tel"
            className="input"
            value={form.phone}
            onChange={set('phone')}
            maxLength={40}
            autoComplete="tel"
            aria-required="true"
            aria-invalid={errors.phone ? 'true' : undefined}
            aria-describedby={errors.phone ? 'ca-phone-error' : undefined}
            placeholder="Including country code"
          />
        </TextField>

        <TextField id="ca-role" label="ROLE" required error={errors.role}>
          <select
            id="ca-role"
            className="input"
            value={form.role}
            onChange={set('role')}
            aria-required="true"
            aria-invalid={errors.role ? 'true' : undefined}
            aria-describedby={errors.role ? 'ca-role-error' : undefined}
          >
            <option value="">Select a role</option>
            {roles.map((r) => (
              <option key={r.slug} value={r.title}>
                {r.title}
              </option>
            ))}
            <option value="Unlisted role">No listed role fits</option>
          </select>
        </TextField>

        <TextField id="ca-message" label="ABOUT YOU" required error={errors.message}>
          <textarea
            id="ca-message"
            className="input"
            rows={6}
            value={form.message}
            onChange={set('message')}
            maxLength={5000}
            aria-required="true"
            aria-invalid={errors.message ? 'true' : undefined}
            aria-describedby={errors.message ? 'ca-message-error' : undefined}
            placeholder="What you have built, and what you want to work on. One page beats ten."
          />
        </TextField>

        <div>
          <label htmlFor="ca-resume" className="meta mb-2" style={{ display: 'block' }}>
            RÉSUMÉ{' '}
            <span aria-hidden="true" style={{ color: 'var(--amber-text)' }}>
              *
            </span>
          </label>
          {/*
            The input is visually hidden but still THE control: it keeps its id,
            stays in the tab order and is what the label points at, so keyboard
            and screen-reader behaviour is the browser's own. A div with a click
            handler would have had to reimplement all of it, badly.

            `sr-only`-style clipping rather than display:none or visibility:
            hidden — both of those remove the element from the accessibility tree
            and from the tab order, which is exactly what must not happen here.
          */}
          <input
            id="ca-resume"
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={onFile}
            aria-required="true"
            aria-invalid={errors.resume ? 'true' : undefined}
            aria-describedby={errors.resume ? 'ca-resume-error' : 'ca-resume-hint'}
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              border: '1px solid',
              borderColor: errors.resume ? 'var(--amber)' : 'var(--stone-100)',
              padding: '12px 14px',
            }}
          >
            {/* A <label> for a file input opens the picker on click and on
                Enter/Space when the input has focus — no handler needed. */}
            <label
              htmlFor="ca-resume"
              className="meta"
              style={{
                cursor: 'pointer',
                border: '1px solid var(--ink)',
                color: 'var(--ink)',
                padding: '7px 14px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {file ? 'CHANGE FILE' : 'CHOOSE FILE'}
            </label>

            <span
              style={{
                fontSize: 13,
                color: file ? 'var(--ink)' : 'var(--text-tertiary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {file ? `${file.name} · ${humanSize(file.size)}` : 'No file chosen'}
            </span>

            {file && (
              <button
                type="button"
                className="meta"
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 0,
                  padding: '4px 2px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  textDecoration: 'underline',
                  flexShrink: 0,
                }}
              >
                REMOVE
              </button>
            )}
          </div>
          {errors.resume ? (
            <div id="ca-resume-error" style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 6 }}>
              {errors.resume}
            </div>
          ) : (
            <div id="ca-resume-hint" style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 6 }}>
              {`PDF, Word, RTF, ODT or text. Up to ${humanSize(MAX_RESUME_BYTES)}.`}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4" style={{ marginTop: 26 }}>
        <FlowButton type="submit" variant="ink" text={sending ? 'Sending…' : 'Send Application'} />
        {/* A large résumé can take a minute or more, and silence during it is
            what makes someone press the button again. */}
        <span aria-live="polite" role="status" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {sending
            ? file && file.size > 512 * 1024
              ? 'Uploading — a large file can take a minute. Please wait.'
              : 'Sending…'
            : ''}
        </span>
      </div>

      {/* role="alert": nothing was submitted and their text is still on screen. */}
      {result && !result.ok && (
        <div role="alert" style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 16, lineHeight: 1.6 }}>
          {result.message}
        </div>
      )}
    </form>
  );
}

/* Label, control and error wired together. Written here rather than imported
   because this tree has no shared form primitives — lib/forms.js belongs to the
   other branch of this project. */
function TextField({ id, label, required, error, children }) {
  return (
    <div>
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
