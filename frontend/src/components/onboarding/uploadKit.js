import React from 'react';

/*
  The file control and its helpers, shared by both forms on /onboarding.

  Extracted when the signed-returns form arrived. Two copies of a file input
  drift — one gains a size check the other does not, and the limits stop
  matching the script's — and the limit is the thing that has to agree with
  MAX_UPLOAD_BYTES in WebForm.gs.
*/

export const UPLOAD_EXT = ['pdf', 'jpg', 'jpeg', 'png'];
export const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png,image/*,application/pdf';

/* Must match MAX_UPLOAD_BYTES in WebForm.gs. Checked here so the limit is known
   before a slow upload, and there because this file is shipped to the candidate
   and can be edited before it posts. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const extensionOf = (n) => {
  const parts = String(n || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

export const humanSize = (b) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

/*
  Reads a file as base64 WITHOUT the data: prefix.

  FileReader yields "data:<type>;base64,<payload>" and the script decodes the
  payload only; handing it the whole URL makes base64Decode throw, which would
  surface as "that file could not be read" for a file that was fine.
*/
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const r = String(reader.result || '');
      const comma = r.indexOf(',');
      if (comma === -1) reject(new Error('read-failed'));
      else resolve(r.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

/* The message for a file that cannot be accepted, or null when it can. Returned
   rather than thrown so the caller decides where it is shown. */
export function rejectReason(file) {
  if (!UPLOAD_EXT.includes(extensionOf(file.name))) return 'Attach a PDF, JPG or PNG.';
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${humanSize(file.size)}. The limit is ${humanSize(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
}

/*
  A file row in the site's button language.

  The input is CLIPPED rather than hidden: it keeps its id, its place in the tab
  order and its accessible name, and a <label htmlFor> opens the picker on click
  and on Enter/Space without a key handler. display:none or visibility:hidden
  would take it out of the accessibility tree, which is exactly what must not
  happen to the control itself.
*/
export function Upload({ id, label, file, error, inputRef, onPick, onClear, className = 'md:col-span-2' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="meta mb-2" style={{ display: 'block' }}>
        {label}{' '}
        <span aria-hidden="true" style={{ color: 'var(--amber-text)' }}>*</span>
      </label>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        onChange={onPick}
        aria-required="true"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : `${id}-hint`}
        style={{
          position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
          overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
        }}
      />
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          border: '1px solid', borderColor: error ? 'var(--amber)' : 'var(--stone-100)',
          padding: '12px 14px',
        }}
      >
        <label
          htmlFor={id}
          className="meta"
          style={{
            cursor: 'pointer', border: '1.5px solid var(--ink)', borderRadius: 100,
            color: 'var(--ink)', padding: '9px 20px', whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          {file ? 'CHANGE FILE' : 'CHOOSE FILE'}
        </label>
        <span
          style={{
            fontSize: 13, color: file ? 'var(--ink)' : 'var(--text-tertiary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
          }}
        >
          {file ? `${file.name} · ${humanSize(file.size)}` : 'No file chosen'}
        </span>
        {file && (
          <button
            type="button"
            className="meta"
            onClick={onClear}
            style={{
              marginLeft: 'auto', background: 'none', border: 0, padding: '4px 2px',
              cursor: 'pointer', color: 'var(--text-secondary)', textDecoration: 'underline', flexShrink: 0,
            }}
          >
            REMOVE
          </button>
        )}
      </div>
      {error ? (
        <div id={`${id}-error`} style={{ fontSize: 12.5, color: 'var(--amber-text)', marginTop: 6 }}>{error}</div>
      ) : (
        <div id={`${id}-hint`} style={{ fontSize: 12.5, color: 'var(--text-tertiary)', marginTop: 6 }}>
          {`PDF, JPG or PNG. Up to ${humanSize(MAX_UPLOAD_BYTES)}.`}
        </div>
      )}
    </div>
  );
}

/* Label, control and error wired together. Local to this page: the tree has no
   shared form primitives, and the careers form keeps its own for the same
   reason. */
export function Field({ id, label, required, error, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="meta mb-2" style={{ display: 'block' }}>
        {label}{' '}
        {required && (
          <span aria-hidden="true" style={{ color: 'var(--amber-text)' }}>*</span>
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
