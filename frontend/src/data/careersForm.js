/*
  /careers application form — endpoint and limits.

  The endpoint is the /exec URL of the Apps Script in docs/careers-intake.gs.
  It is not a secret: it is in the shipped bundle, and anyone can read it. What
  protects the Sheet and the Drive folder is that the script only ever appends —
  it exposes no read path, and neither the folder nor the Sheet is shared.

  Empty until deployed. While it is empty the page shows the email route instead
  of a form, because a form that posts nowhere is worse than no form: the
  candidate believes they have applied, and nobody finds out.
*/
export const CAREERS_ENDPOINT = process.env.REACT_APP_CAREERS_ENDPOINT || '';

export const CAREERS_FORM_READY = Boolean(CAREERS_ENDPOINT);

/*
  Must match MAX_RESUME_BYTES in docs/careers-intake.gs.

  Checked here so the candidate is told before a slow upload rather than after,
  and checked there because this file is shipped to them and can be edited. The
  server's number is the one that decides.
*/
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const ALLOWED_EXT = ['pdf', 'doc', 'docx', 'rtf', 'odt', 'txt'];

/* For the file input's filter. Advisory only — a picker filter is a convenience,
   not a check; the extension and the leading bytes are verified server-side. */
export const ACCEPT_ATTR = '.pdf,.doc,.docx,.rtf,.odt,.txt';

export function extensionOf(filename) {
  const parts = String(filename || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/*
  Reads the file as base64 WITHOUT the data: prefix.

  FileReader gives "data:<type>;base64,<payload>", and the script decodes the
  payload only — handing it the whole data URL makes base64Decode throw, which
  surfaces as "that file could not be read" for a file that was fine.
*/
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read-failed'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      if (comma === -1) {
        reject(new Error('read-failed'));
        return;
      }
      resolve(result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}
