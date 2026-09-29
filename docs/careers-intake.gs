/**
 * careers-intake.gs — the backend for the application form on /careers
 *
 * Writes one row per application to a Google Sheet and puts the résumé in a
 * Drive folder, with the row linking to the file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS ONE WILL DEPLOY WHEN THE SCHEDULER DID NOT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * docs/meet-scheduler.gs (see git history) died because a Meet link needs the
 * Calendar ADVANCED service, or the REST API enabled on the hidden Cloud project
 * that Apps Script creates per script — and a consumer account has no IAM there,
 * so the console answers `resourcemanager.projects.get (Missing)`.
 *
 * DriveApp and SpreadsheetApp are SIMPLE services. They need no advanced service,
 * no API enabled, and no manifest editing: Apps Script infers the scopes from the
 * calls below and asks for them at authorisation. Nothing here touches the Cloud
 * console.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPLOYING IT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. https://script.google.com → New project. Paste this over Code.gs.
 *     Use a NEW project, not the scheduler one — a script carries its own
 *     authorisation, and the scheduler's is entangled with a Calendar scope it
 *     could never use.
 *
 *  2. Run `setup` once from the function dropdown. Accept the authorisation
 *     prompts ("Google hasn't verified this app" → Advanced → Go to … is
 *     expected for your own script).
 *
 *     It creates the Drive folder and the Sheet, remembers their ids, and logs
 *     both links. Open the log (Ctrl+Enter) and keep those links.
 *
 *  3. Deploy → New deployment → Web app.
 *         Execute as:      Me
 *         Who has access:  Anyone
 *     "Anyone" is what lets a candidate submit without a Google account. It does
 *     not share the folder or the Sheet — only doPost is reachable, and it only
 *     ever appends.
 *
 *  4. Copy the /exec URL into REACT_APP_CAREERS_ENDPOINT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USING A FOLDER AND SHEET YOU ALREADY HAVE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * There is nothing to edit in this file. The ids live in Script Properties, and
 * setup() writes them there itself — so the normal path is to change nothing.
 *
 * To point it at your own instead, BEFORE running setup():
 *
 *   Project Settings (the gear, left sidebar)
 *     → Script Properties → Add script property
 *
 *       FOLDER_ID   the folder's id
 *       SHEET_ID    the spreadsheet's id
 *
 * The ids are the noisy part of each URL:
 *
 *   https://drive.google.com/drive/folders/1AbC...XyZ
 *                                          └──── FOLDER_ID ────┘
 *   https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit#gid=0
 *                                          └──── SHEET_ID ────┘
 *
 * setup() then reuses both rather than creating anything, and adds the header
 * row to the sheet if it is empty. It REFUSES to touch a sheet whose row 1
 * already holds something else, rather than overwriting data it did not write.
 *
 * To move to a different folder or sheet later, edit the property and run
 * setup() again. Files already filed stay where they are.
 *
 * AFTER ANY EDIT: Deploy → Manage deployments → pencil → Version: NEW VERSION.
 * A deployment serves a frozen snapshot, so saving the editor changes nothing at
 * the /exec URL. This is the step that cost us an hour on the scheduler.
 */

/* ─────────────────────────────────────────────────────────── configuration */

var FOLDER_NAME = 'VIKASANA — Applications';
var SHEET_NAME = 'VIKASANA — Applications';

/* Server-side ceiling on the decoded résumé. The page enforces the same number,
   but the page is shipped to the candidate and can be edited before it posts, so
   the number that matters is this one. Apps Script accepts a far larger payload;
   this is about what is worth storing, not what is possible. */
var MAX_RESUME_BYTES = 5 * 1024 * 1024;

/* Extensions accepted. Checked against the filename AND the decoded bytes below
   — a renamed .exe passes an extension test and fails the signature test. */
var ALLOWED_EXT = ['pdf', 'doc', 'docx', 'rtf', 'odt', 'txt'];

var HEADERS = [
  'Received',
  'Name',
  'Email',
  'Phone',
  'Role',
  'Message',
  'Résumé',
  'File name',
  'Size (KB)',
];

/* ───────────────────────────────────────────────────────────── first run */

/**
 * Creates the folder and the Sheet, and records their ids so every later run
 * uses the same two. Safe to run again: it reuses whatever already exists.
 */
function setup() {
  var props = PropertiesService.getScriptProperties();

  var folderId = props.getProperty('FOLDER_ID');
  var folder;
  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    folder = DriveApp.createFolder(FOLDER_NAME);
    props.setProperty('FOLDER_ID', folder.getId());
  }

  var sheetId = props.getProperty('SHEET_ID');
  var ss;
  if (sheetId) {
    ss = SpreadsheetApp.openById(sheetId);
  } else {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty('SHEET_ID', ss.getId());
  }

  /* Headers are applied whether the Sheet was just created or supplied by hand.
     They used to be written only on creation, so pointing SHEET_ID at an
     existing spreadsheet produced a file whose columns nobody could read —
     appendRow does not care that there is no header, and the first application
     would have landed as nine unlabelled values. */
  ensureHeaders(ss.getSheets()[0]);

  Logger.log('Folder: %s', folder.getUrl());
  Logger.log('Sheet:  %s', ss.getUrl());
  return { folder: folder.getUrl(), sheet: ss.getUrl() };
}

/**
 * Puts the header row in place if it is not already there.
 *
 * Only touches a sheet whose first row is empty or already our headers. Anything
 * else is somebody's data, and overwriting row 1 of a spreadsheet that is in use
 * is not a thing a setup function should ever do on its own.
 */
function ensureHeaders(sheet) {
  if (sheet.getLastRow() > 0) {
    var first = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (String(first[0]).trim() === HEADERS[0]) return; /* already ours */
    throw new Error(
      'Sheet row 1 already holds other data (' +
        JSON.stringify(first.slice(0, 3)) +
        '). Point SHEET_ID at an empty spreadsheet, or clear row 1 first.'
    );
  }

  sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  /* The message column is the one anybody actually reads. */
  sheet.setColumnWidth(6, 420);
}

/* ───────────────────────────────────────────────────────────────── routing */

function doGet() {
  /* Not the form's path — it POSTs. This exists so that opening the /exec URL in
     a browser says something truthful instead of an error page. */
  return json({ ok: true, service: 'careers-intake' });
}

function doPost(e) {
  try {
    /* The page posts text/plain deliberately: a JSON content type triggers a
       CORS preflight, and an Apps Script web app cannot answer OPTIONS. */
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json(receive(body));
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return json({ ok: false, error: 'server', message: 'Something went wrong. Please try again.' });
  }
}

/* ────────────────────────────────────────────────────────────────── intake */

function receive(body) {
  var name = String(body.name || '').trim();
  var email = String(body.email || '').trim();
  var phone = String(body.phone || '').trim();
  var role = String(body.role || '').trim();
  var message = String(body.message || '').trim();

  /* Every field is required, matching the form. Checked here as well because
     the form is shipped to the applicant and can be edited before it posts —
     this is the copy that decides. */
  if (!name) return { ok: false, error: 'name', message: 'A name is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: 'email', message: 'That email address does not look right.' };
  }
  if (!phone) return { ok: false, error: 'phone', message: 'A phone number is required.' };
  if (!role) return { ok: false, error: 'role', message: 'Choose the role you are applying for.' };
  if (!message) return { ok: false, error: 'message', message: 'Please tell us something about yourself.' };
  if (!body.resume || !body.resume.data) {
    return { ok: false, error: 'resume', message: 'Attach your résumé.' };
  }

  /* Trimmed rather than rejected. Losing the tail of a long note is a smaller
     harm than discarding the whole application over a length nobody announced. */
  if (message.length > 5000) message = message.slice(0, 5000);
  if (name.length > 120) name = name.slice(0, 120);
  if (phone.length > 40) phone = phone.slice(0, 40);
  if (role.length > 160) role = role.slice(0, 160);

  var props = PropertiesService.getScriptProperties();
  var folderId = props.getProperty('FOLDER_ID');
  var sheetId = props.getProperty('SHEET_ID');
  if (!folderId || !sheetId) {
    /* setup() was never run. Say so plainly in the log; tell the candidate
       nothing about our configuration. */
    console.error('FOLDER_ID or SHEET_ID missing — run setup() once.');
    return { ok: false, error: 'server', message: 'Applications are not open yet. Please write to us instead.' };
  }

  /* ---- résumé, if one was attached ---- */
  var fileUrl = '';
  var fileName = '';
  var sizeKb = '';

  /* Guaranteed present — the check above returns when it is not. */
  var stored = storeResume(body.resume, name);
  if (!stored.ok) return stored;
  fileUrl = stored.url;
  fileName = stored.name;
  sizeKb = stored.sizeKb;

  /* ---- the row ---- */
  var sheet = SpreadsheetApp.openById(sheetId).getSheets()[0];
  sheet.appendRow([
    new Date(),
    name,
    email,
    phone,
    role,
    message,
    fileUrl ? '=HYPERLINK("' + fileUrl + '","open")' : 'none attached',
    fileName,
    sizeKb,
  ]);

  return { ok: true };
}

/**
 * Decodes the résumé and files it in Drive, named so the folder is readable
 * without opening anything.
 */
function storeResume(resume, applicantName) {
  var name = String(resume.name || 'resume').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  var ext = (name.split('.').pop() || '').toLowerCase();

  if (ALLOWED_EXT.indexOf(ext) === -1) {
    return { ok: false, error: 'resume', message: 'Attach a PDF, Word, RTF, ODT or text file.' };
  }

  var bytes;
  try {
    bytes = Utilities.base64Decode(String(resume.data));
  } catch (err) {
    return { ok: false, error: 'resume', message: 'That file could not be read. Try attaching it again.' };
  }

  if (bytes.length > MAX_RESUME_BYTES) {
    return { ok: false, error: 'resume', message: 'That file is over 5 MB. Please attach a smaller one.' };
  }
  if (!bytes.length) {
    return { ok: false, error: 'resume', message: 'That file appears to be empty.' };
  }

  /*
    Leading bytes must agree with the extension.

    This is a hygiene check, not a security control — it is trivially defeated by
    anyone who cares, and a file that passes it can still be hostile. What it
    actually buys: nobody on the hiring side double-clicks something that claims
    to be a PDF and is not. TREAT EVERY FILE IN THAT FOLDER AS UNTRUSTED.
  */
  if (!signatureAgrees(ext, bytes)) {
    return { ok: false, error: 'resume', message: 'That file does not look like a ' + ext.toUpperCase() + '. Please re-save and try again.' };
  }

  var blob = Utilities.newBlob(bytes, resume.type || 'application/octet-stream', name);

  var stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var safeApplicant = applicantName.replace(/[\\/:*?"<>|]/g, '_');
  blob.setName(stamp + ' — ' + safeApplicant + ' — ' + name);

  var file = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID')).createFile(blob);

  return {
    ok: true,
    url: file.getUrl(),
    name: name,
    sizeKb: Math.round(bytes.length / 1024),
  };
}

/** Leading-byte check for the formats that have a stable signature. */
function signatureAgrees(ext, bytes) {
  function starts(sig) {
    if (bytes.length < sig.length) return false;
    for (var i = 0; i < sig.length; i++) {
      /* Apps Script byte arrays are signed; normalise before comparing. */
      if ((bytes[i] & 0xff) !== sig[i]) return false;
    }
    return true;
  }

  if (ext === 'pdf') return starts([0x25, 0x50, 0x44, 0x46]); /* %PDF */
  /* docx and odt are ZIP containers; doc is an OLE compound file. */
  if (ext === 'docx' || ext === 'odt') return starts([0x50, 0x4b, 0x03, 0x04]);
  if (ext === 'doc') return starts([0xd0, 0xcf, 0x11, 0xe0]);
  /* rtf and txt have no reliable signature worth enforcing. */
  return true;
}

/* ────────────────────────────────────────────────────────────────── output */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
