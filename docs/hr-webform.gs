/**
 * VIKASANA Systems — intern detail form, web-app half
 * ---------------------------------------------------
 * A SECOND FILE IN THE SAME APPS SCRIPT PROJECT AS Code.gs. It does not replace
 * it and does not copy it: makeDoc_, sendMail_, rowData_ and the sheet helpers
 * are Code.gs's, and the VIKASANA HR menu still works exactly as before. Add
 * this file beside it (Apps Script editor → Files → +), do not paste it over.
 *
 * What it adds: /onboarding on the website posts here. This writes the
 * candidate's own details into their row and generates and sends the documents
 * in the same request. The generation is Code.gs's; the email is not — the PDFs
 * go to info@vikasanasystems.tech to be forwarded, so the candidate never sees
 * the @gmail.com account this script runs as. See FORWARD_INBOX below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPLOYING
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. Paste this into a new file in the project bound to the Candidates sheet.
 *  2. Run `setupWebForm` once from the editor and accept the prompts. It checks
 *     CONFIG is filled in and that the sheet is reachable, so a misconfiguration
 *     surfaces now rather than on an intern's submission.
 *  3. Deploy → New deployment → Web app, Execute as ME, Who has access ANYONE.
 *  4. Put the /exec URL in frontend/src/data/onboarding.js on the website.
 *
 * After ANY edit here: Deploy → Manage deployments → pencil → Version: NEW
 * VERSION. A deployment serves a frozen snapshot; saving the editor changes
 * nothing at the /exec URL.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GENERATE ON SUBMIT, EMAIL ON APPROVAL
 * ─────────────────────────────────────────────────────────────────────────────
 * A submission writes the row and generates both PDFs into Drive. It sends
 * nothing. The Status column reads "Generated — awaiting approval", and the
 * Approved column is where someone decides.
 *
 * Mailing is a separate, deliberate act: VIKASANA HR → "Email approved
 * candidates", or sendApprovedDocuments() from the editor. It emails every row
 * that is approved and not already sent, attaching the PDFs that were generated
 * at submission — not regenerated ones, so what arrives is what was approved.
 *
 * This replaces a random 5–15 minute delay implemented with a one-time trigger.
 * The delay existed to stagger a batch; an approval step does that and adds the
 * thing the delay never gave anyone — a chance to look at the documents before
 * a candidate does.
 */

/*
  A marker for WHICH COPY OF THIS FILE IS ACTUALLY DEPLOYED.

  Saving the editor does not change what /exec serves — a deployment is a frozen
  snapshot, and only Manage deployments → edit → Version: New version replaces
  it. That has now been missed three times, and each time the only way to find
  out was to submit a form and infer the answer from how the script behaved,
  which creates a test row and an email every attempt.

  doGet reports this, so one GET answers the question. Bump it whenever this file
  changes in a way worth confirming.
*/
var SCRIPT_VERSION = '2026-10-09-approval-gate';

/*
  Script property prefix used by the retired scheduled path. Kept only so
  clearPendingDeliveries() can tidy up triggers created before the approval gate
  replaced the delay.
*/
var PENDING_PREFIX = 'deliver:';

/*
  The approval column. A row is emailed only once this says yes.

  A checkbox (TRUE), or any of yes / y / approved, in any case. Several spellings
  because the column will be ticked by people, not by code, and a row that was
  approved but written "Yes " or "APPROVED" should not sit unsent while nobody
  can see why.
*/
var COL_APPROVED = 'Approved';

/*
  ─────────────────────────────────────────────────────────────────────────────
  THE DOCUMENTS GO TO HR, NOT TO THE CANDIDATE
  ─────────────────────────────────────────────────────────────────────────────

  This script runs as whichever account owns it, and Gmail will not let Apps
  Script send as a different address — so mail sent straight to a candidate
  arrives from a @gmail.com account. For an offer letter and an NDA that is the
  wrong return address.

  So the generated PDFs are sent to FORWARD_INBOX instead. Someone there presses
  Forward, puts the candidate in To and FORWARD_CC in Cc, and the candidate sees
  a vikasanasystems.tech address throughout.

  The body is therefore written TO THE CANDIDATE and contains nothing internal:
  it is meant to be forwarded verbatim, without anyone having to edit it first.
  Everything HR needs in order to route it — who it is for, their address — is
  in the subject line and in a block BELOW the signature, where it is easy to
  delete and obvious if it is not.
*/
var FORWARD_INBOX = 'info@vikasanasystems.tech';
var FORWARD_CC = 'mohanth.vikasana@gmail.com';

/*
  ON THE DIRECT PATH THIS IS A Bcc, NOT A Cc.

  A Cc header is visible to everyone who receives the message. With SEND_AS set,
  the candidate receives the mail itself — so a Cc to a @gmail.com address puts
  that address in front of them, which is the single thing this whole
  arrangement exists to prevent. Bcc copies the same mailbox without showing it.

  On the forwarding path it stays a Cc: that message goes to FORWARD_INBOX and
  no candidate sees it, and the Cc line is the instruction for whoever forwards.

  Change `bcc` back to `cc` in sendAsAlias_ if the copy should be visible, or
  better, point FORWARD_CC at a vikasanasystems.tech address and the question
  disappears.
*/

/*
  ─────────────────────────────────────────────────────────────────────────────
  SEND AS info@ DIRECTLY, AND SKIP THE FORWARDING ENTIRELY
  ─────────────────────────────────────────────────────────────────────────────

  Forwarding gets the sender right and the body wrong. Gmail puts a quoted
  header in a forwarded message —

      ---------- Forwarded message ---------
      From: VIKASANA Systems HR <vikasanasystems@gmail.com>

  — so the candidate sees info@ in the From line and the gmail address three
  lines below it, unless whoever forwards deletes that block every single time.

  Gmail can send as another address IF that address is verified on the account
  under Settings → Accounts and Import → "Send mail as". Once info@ is in that
  list, GmailApp will send as it and the candidate never has a gmail address to
  see, in the header or the body, and nobody has to forward anything.

  Put the alias here to switch to direct sending. Run listAliases() first — it
  logs exactly what this account may send as, and an alias that is not verified
  is silently ignored by Gmail, which would send from the gmail address while
  looking like it worked.

  Left blank, the forwarding flow above stays exactly as it is.
*/
var SEND_AS = 'info@vikasanasystems.tech';

/*
  Columns this file adds to the Candidates sheet, on top of the ones Code.gs's
  COL already names. ensureColumns_ appends any that are missing, so the sheet
  does not have to be edited by hand and an older sheet keeps working.

  The headers are also the {{TAGS}}: DOB becomes {{DOB}} and University becomes
  {{UNIVERSITY}} in the templates, because makeDoc_ replaces every key of the
  data object it is given.

  THE TEMPLATES DO NOT HAVE THOSE TAGS YET. Nothing breaks without them — a tag
  that is not in the document is simply never substituted — but the values will
  sit on the sheet and appear nowhere on the letter until {{DOB}} and
  {{UNIVERSITY}} are typed into the Google Doc templates where they belong.
*/
var COL_DOB = 'DOB';
var COL_UNIVERSITY = 'University';
var COL_AADHAAR = 'Aadhaar No';
var COL_AADHAAR_FILE = 'Aadhaar File';
var COL_TRANSCRIPT_FILE = 'Transcript File';

/*
  ─────────────────────────────────────────────────────────────────────────────
  THE UPLOADED DOCUMENTS DO NOT GO IN WITH THE LETTERS
  ─────────────────────────────────────────────────────────────────────────────

  An Aadhaar image and a transcript are identity documents. They are filed in a
  sub-folder of their own rather than beside the generated offer letters,
  because the two have different audiences: the letters are forwarded onward,
  and these are not.

  They are NOT attached to the email either — only linked. An attachment is
  copied into every mailbox the message passes through and cannot be withdrawn
  from any of them; a Drive link stays one file whose access can be changed or
  revoked later.
*/
var UPLOAD_SUBFOLDER = 'Candidate documents';

/* Accepted uploads. Checked against the filename AND the decoded bytes. */
var UPLOAD_EXT = ['pdf', 'jpg', 'jpeg', 'png'];
var MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/*
  ─────────────────────────────────────────────────────────────────────────────
  THE SPREADSHEET IS NAMED, NOT ASSUMED
  ─────────────────────────────────────────────────────────────────────────────

  Code.gs reaches the sheet with SpreadsheetApp.getActive(), which returns the
  document the script is BOUND to. That is right for the menu — it only ever
  runs from inside the sheet — and wrong for everything in this file:

    · a standalone project has no bound document, so getActive() is null and
      sheet_() throws "Cannot read properties of null";
    · a web app request and a time-based trigger run with no document open, so
      even in a bound project getActive() is not something to rely on.

  Paste the Candidates spreadsheet's ID here and both problems disappear,
  whether the project is bound or standalone. It is the noisy part of the URL:

    https://docs.google.com/spreadsheets/d/1AbC...XyZ/edit#gid=0
                                           └──── this ────┘

  Left blank, this falls back to Code.gs's getActive() so a bound project keeps
  working without being edited.
*/
var SPREADSHEET_ID = '14MNykpRqjrK6QFd-mGOhOfwB-NMnzgRw0LftBaKRKYs';

/**
 * The sheet, reached the way this file needs rather than the way the menu does.
 *
 * Returns the same { sheet, headers } shape as Code.gs's sheet_(), so every
 * helper there — cell_, setCell_, rowData_ — takes it unchanged.
 */
function sheetCtx_() {
  if (!SPREADSHEET_ID) {
    /* Bound project, no ID configured: Code.gs's version still works when the
       caller is the menu. It will throw for a web app or a trigger, and the
       message in setupWebForm names the fix. */
    return sheet_();
  }
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet tab "' + CONFIG.SHEET_NAME + '" not found in that spreadsheet. ' +
                    'Check the tab is named exactly that, and that SPREADSHEET_ID points at the right file.');
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) {
    return String(h).trim();
  });
  return { sheet: sheet, headers: headers };
}

/**
 * Appends any of our extra columns the sheet does not have yet, and returns a
 * fresh context so the caller's header list includes them.
 *
 * Headers are matched by name throughout — Code.gs's col_ looks them up rather
 * than assuming positions — so appending at the end cannot disturb anything.
 */
/**
 * The sub-folder identity documents are filed in, created on first use.
 *
 * Looked up by name inside the configured output folder rather than stored as
 * another id to paste: there is one of these and it is ours, so finding it is
 * cheaper than another line of setup that can be filled in wrongly.
 */
function uploadFolder_() {
  var parent = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
  var it = parent.getFoldersByName(UPLOAD_SUBFOLDER);
  return it.hasNext() ? it.next() : parent.createFolder(UPLOAD_SUBFOLDER);
}

/**
 * Decodes one uploaded file and files it in Drive.
 *
 * Returns { ok, url } or { ok:false, message }, never throws — the caller is a
 * web request that has to tell the intern which field was wrong.
 */
function storeUpload_(upload, personName, label, folder) {
  var given = String((upload && upload.name) || '').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  var ext = (given.split('.').pop() || '').toLowerCase();

  if (UPLOAD_EXT.indexOf(ext) === -1) {
    return { ok: false, message: 'Attach a PDF, JPG or PNG — "' + given + '" is not one.' };
  }

  var bytes;
  try {
    bytes = Utilities.base64Decode(String(upload.data));
  } catch (err) {
    return { ok: false, message: 'That file could not be read. Try attaching it again.' };
  }
  if (!bytes.length) return { ok: false, message: 'That file appears to be empty.' };
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, message: 'That file is over 5 MB. Please attach a smaller one.' };
  }
  if (!signatureAgrees_(ext, bytes)) {
    return { ok: false, message: 'That file does not look like a ' + ext.toUpperCase() + '. Please re-save it and try again.' };
  }

  var blob = Utilities.newBlob(bytes, upload.type || 'application/octet-stream', given);
  var stamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  /* Named so the folder is readable without opening anything, and so the two
     documents for one person sort together. */
  blob.setName(stamp + ' — ' + personName.replace(/[\\/:*?"<>|]/g, '_') + ' — ' + label + '.' + ext);

  var file = folder.createFile(blob);
  return { ok: true, url: file.getUrl() };
}

/**
 * Leading bytes must agree with the extension.
 *
 * Hygiene, not a security control — trivially defeated by anyone who cares, and
 * a file that passes can still be hostile. What it buys is that nobody in HR
 * double-clicks something claiming to be a PDF and is not. TREAT EVERYTHING IN
 * THAT FOLDER AS UNTRUSTED.
 */
function signatureAgrees_(ext, bytes) {
  function starts(sig) {
    if (bytes.length < sig.length) return false;
    for (var i = 0; i < sig.length; i++) {
      /* Apps Script byte arrays are signed; normalise before comparing. */
      if ((bytes[i] & 0xff) !== sig[i]) return false;
    }
    return true;
  }
  if (ext === 'pdf') return starts([0x25, 0x50, 0x44, 0x46]);            /* %PDF */
  if (ext === 'png') return starts([0x89, 0x50, 0x4e, 0x47]);            /* \x89PNG */
  if (ext === 'jpg' || ext === 'jpeg') return starts([0xff, 0xd8, 0xff]); /* JFIF/Exif */
  return true;
}

function ensureColumns_(ctx) {
  var wanted = [COL_DOB, COL_UNIVERSITY, COL_AADHAAR, COL_AADHAAR_FILE, COL_TRANSCRIPT_FILE, COL_APPROVED];
  var missing = wanted.filter(function (h) { return ctx.headers.indexOf(h) < 0; });
  if (!missing.length) return ctx;

  var start = ctx.sheet.getLastColumn() + 1;
  ctx.sheet.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
  Logger.log('Added column(s): %s', missing.join(', '));
  return sheetCtx_();
}

/* ───────────────────────────────────────────────────────────── first run */

function setupWebForm() {
  if (/^PASTE_/.test(CONFIG.OFFER_TEMPLATE_ID) || /^PASTE_/.test(CONFIG.NDA_TEMPLATE_ID) ||
      /^PASTE_/.test(CONFIG.OUTPUT_FOLDER_ID)) {
    throw new Error('CONFIG in Code.gs still has PASTE_ placeholders — fill in the two template IDs and the output folder ID first.');
  }
  /*
    SPREADSHEET_ID IS REQUIRED, EVEN IN A BOUND PROJECT.

    The first version of this check only complained when getActive() was also
    null — so a bound project passed setup with SPREADSHEET_ID empty, and then
    every form submission failed. getActive() returns the bound document when
    the code runs FROM the document, and null in a web app and in a trigger,
    which is where everything in this file runs. Setup passing therefore proved
    nothing about the thing that matters.
  */
  if (!SPREADSHEET_ID) {
    throw new Error(
      'SPREADSHEET_ID at the top of WebForm.gs is empty. It is required even if this project is ' +
      'bound to the sheet: SpreadsheetApp.getActive() is null inside a web app, so the form would ' +
      'fail on every submission while this setup check passed. Paste the Candidates spreadsheet ID ' +
      '— the part of its URL between /d/ and /edit.');
  }
  if (!SEND_AS && !FORWARD_INBOX) {
    throw new Error('Both SEND_AS and FORWARD_INBOX are empty, so generated documents would have ' +
                    'nowhere to go. Set SEND_AS to a verified alias, or FORWARD_INBOX to the mailbox ' +
                    'that forwards them.');
  }
  if (SEND_AS && GmailApp.getAliases().indexOf(SEND_AS) < 0) {
    /* Gmail ignores an unverified alias silently and sends from the account's
       own address, so this would otherwise be discovered by a candidate
       receiving mail from a @gmail.com address. */
    throw new Error('SEND_AS is "' + SEND_AS + '" but that is not a verified alias on this account. ' +
                    'Add and verify it under Gmail → Settings → Accounts and Import → "Send mail as", ' +
                    'or clear SEND_AS to use the forwarding flow. Run listAliases() to see the list.');
  }

  var ctx = ensureColumns_(sheetCtx_());
  DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
  checkTemplate_('OFFER_TEMPLATE_ID', CONFIG.OFFER_TEMPLATE_ID);
  checkTemplate_('NDA_TEMPLATE_ID', CONFIG.NDA_TEMPLATE_ID);
  Logger.log('Ready. Sheet "%s" has %s data row(s). Templates and output folder reachable.',
             CONFIG.SHEET_NAME, ctx.sheet.getLastRow() - 1);
}

/**
 * Opens one template and, when it will not open, says why.
 *
 * DocumentApp.openById answers "The document is inaccessible" for every failure
 * — wrong id, no permission, or a file that is not a Google Doc at all — and
 * names neither the file nor which of the two ids was at fault. The commonest
 * cause by far is the third: the setup uploads TEMPLATE_*.docx and says to open
 * each with Google Docs, which creates a SEPARATE Doc, and the id copied is
 * often still the .docx's.
 *
 * Drive can see the file even when DocumentApp cannot, so the mime type is
 * readable and the message can state the actual problem.
 */
function checkTemplate_(label, id) {
  if (!id || /^PASTE_/.test(id)) {
    throw new Error(label + ' is not filled in — paste the template Doc id into CONFIG in Code.gs.');
  }

  var file;
  try {
    file = DriveApp.getFileById(id);
  } catch (err) {
    throw new Error(label + ' (' + id + ') is not a file this account can open. ' +
                    'Check the id, and that the template is in this account\'s Drive or shared with it.');
  }

  var mime = file.getMimeType();
  if (mime !== MimeType.GOOGLE_DOCS) {
    throw new Error(
      label + ' points at "' + file.getName() + '", which is a ' + mime + ', not a Google Doc. ' +
      'Apps Script can only fill a Google Doc. In Drive, right-click that file → Open with → Google Docs; ' +
      'that creates a NEW Google Doc — copy ITS id from the URL (the part between /d/ and /edit) into CONFIG.');
  }

  DocumentApp.openById(id);
}

/* ───────────────────────────────────────────────────────────────── routing */

function doGet() {
  return jsonOut_({
    ok: true,
    service: 'vikasana-intern-onboarding',
    version: SCRIPT_VERSION,
    /* Reported so the deployed configuration can be checked without submitting
       anything: that nothing sends until a row is approved, and whether mail
       then goes direct or to the forwarding inbox. */
    sends: 'on approval — run sendApprovedDocuments()',
    sendsAs: SEND_AS || ('forward via ' + FORWARD_INBOX),
  });
}

function doPost(e) {
  try {
    /* text/plain on purpose: an application/json body makes the browser send a
       CORS preflight, and an Apps Script web app cannot answer OPTIONS. */
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return jsonOut_(receive_(body));
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    /*
      The commonest cause by far has one signature, and it is worth naming
      rather than hiding behind "something went wrong": SPREADSHEET_ID empty in
      a bound project, where getActive() is null in a web app and sheet_()
      dereferences it. Reported as a configuration error so whoever deployed it
      can act, rather than as a fault the intern might retry into.
    */
    var msg = String((err && err.message) || err);
    if (!SPREADSHEET_ID && /getSheetByName|null/.test(msg)) {
      return jsonOut_({ ok: false, error: 'config',
                        message: 'This form is not configured yet. Please write to info@vikasanasystems.tech.',
                        detail: 'SPREADSHEET_ID is empty in WebForm.gs' });
    }
    return jsonOut_({ ok: false, error: 'server', message: 'Something went wrong. Please try again.' });
  }
}

/* ────────────────────────────────────────────────────────────────── intake */

function receive_(body) {
  var name   = trim_(body.name, 120);
  var email  = trim_(body.email, 254);
  var mobile = trim_(body.mobile, 40);
  var addr1  = trim_(body.address1, 160);
  var addr2  = trim_(body.address2, 160);
  var addr3  = trim_(body.address3, 160);
  var dob    = trim_(body.dob, 40);
  var univ   = trim_(body.university, 160);
  var aadhaar = trim_(body.aadhaar, 32).replace(/[^0-9]/g, '');

  if (!name)  return { ok: false, error: 'name',  message: 'Please give your full name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: 'email', message: 'That email address does not look right.' };
  }
  if (!mobile) return { ok: false, error: 'mobile', message: 'A mobile number is required.' };
  if (!addr1)  return { ok: false, error: 'address1', message: 'Please give your address.' };
  if (!dob)    return { ok: false, error: 'dob', message: 'Please give your date of birth.' };
  if (!univ)   return { ok: false, error: 'university', message: 'Please give your university or college.' };
  /* Twelve digits, and nothing about which twelve. Verhoeff checksum validation
     is deliberately not done: a wrong-but-valid number passes it anyway, and a
     right number rejected by our arithmetic would be a dead end for someone who
     cannot argue with a form. HR checks the number against the image. */
  if (aadhaar.length !== 12) {
    return { ok: false, error: 'aadhaar', message: 'An Aadhaar number is twelve digits.' };
  }
  if (!body.aadhaarFile || !body.aadhaarFile.data) {
    return { ok: false, error: 'aadhaarFile', message: 'Please attach your Aadhaar card.' };
  }
  if (!body.transcriptFile || !body.transcriptFile.data) {
    return { ok: false, error: 'transcriptFile', message: 'Please attach your latest transcript or grade card.' };
  }

  /* One submission at a time. Two interns posting together would otherwise both
     read the last row and both append to it, and the second would overwrite the
     first — appendRow is atomic but find-then-write is not. */
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return { ok: false, error: 'busy', message: 'Someone else is submitting right now — please try again in a moment.' };
  }

  try {
    var ctx = ensureColumns_(sheetCtx_());
    var row = findRow_(ctx, name, email);

    if (row) {
      /* Already on the sheet: HR seeded the name, the role, the dates and the
         reference numbers. Only the fields the intern owns are written, so a
         submission cannot move a start date or renumber a letter. */
      var status = String(cell_(ctx.sheet, ctx.headers, row, COL.STATUS) || '');
      if (/^sent/i.test(status)) {
        return { ok: false, error: 'already', message: 'Your documents have already been sent. Please check your inbox, including spam.' };
      }
      if (/^generated/i.test(status) || /^with /i.test(status) || /^queued/i.test(status)) {
        return { ok: false, error: 'already', message: 'We already have your details. Your documents are being prepared and will be emailed to you.' };
      }
    } else {
      /* Not seeded. Append rather than refuse: an intern whose name HR spelled
         differently should not be turned away, and a row with the details in it
         is something HR can correct. Role, dates and refs fall back to the
         defaults rowData_ already applies. */
      ctx.sheet.appendRow([name]);
      row = ctx.sheet.getLastRow();
      setCell_(ctx.sheet, ctx.headers, row, COL.ROLE, CONFIG.DEFAULT_ROLE);
      setCell_(ctx.sheet, ctx.headers, row, COL.DOCS, 'Both');
    }

    setCell_(ctx.sheet, ctx.headers, row, COL.EMAIL, email);
    setCell_(ctx.sheet, ctx.headers, row, COL.MOBILE, mobile);
    setCell_(ctx.sheet, ctx.headers, row, COL.ADDR1, addr1);
    setCell_(ctx.sheet, ctx.headers, row, COL.ADDR2, addr2);
    setCell_(ctx.sheet, ctx.headers, row, COL.ADDR3, addr3);
    /* Written as text, not a Date. The form sends yyyy-mm-dd and the letter
       wants it readable; converting here would hand Sheets a value it reformats
       by locale, and the tag would then print whatever the cell happened to
       display. formatDob_ decides the wording once, visibly. */
    setCell_(ctx.sheet, ctx.headers, row, COL_DOB, formatDob_(dob));
    setCell_(ctx.sheet, ctx.headers, row, COL_UNIVERSITY, univ);

    /* Stored as text with a leading apostrophe. Twelve digits in a Sheets cell
       become 1.23457E+11 the moment the column is numeric, and an Aadhaar
       number rounded to six significant figures is not a number anybody can
       check against the image beside it. */
    setCell_(ctx.sheet, ctx.headers, row, COL_AADHAAR, "'" + aadhaar);

    var folder = uploadFolder_();
    var aad = storeUpload_(body.aadhaarFile, name, 'Aadhaar', folder);
    if (!aad.ok) return { ok: false, error: 'aadhaarFile', message: aad.message };
    setCell_(ctx.sheet, ctx.headers, row, COL_AADHAAR_FILE, aad.url);

    var tr = storeUpload_(body.transcriptFile, name, 'Transcript', folder);
    if (!tr.ok) return { ok: false, error: 'transcriptFile', message: tr.message };
    setCell_(ctx.sheet, ctx.headers, row, COL_TRANSCRIPT_FILE, tr.url);

    /*
      Generated here, emailed later. generateRow_ writes its own outcome to the
      Status column and returns { ok } rather than throwing, so the answer below
      reports what happened: an intern is not told their documents are ready
      when the generation has just failed.
    */
    var made = generateRow_(row);
    if (!made.ok) {
      return { ok: false, error: 'generate',
               message: 'We saved your details, but could not prepare the documents. ' +
                        'Please write to info@vikasanasystems.tech — there is no need to submit again.' };
    }
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Finds the intern's existing row.
 *
 * Email first because it is unique and typed by its owner. Name second, loosely
 * — the sheet was seeded by hand and "Samrudhi J Rai" should still match
 * "samrudhi j  rai". Punctuation and double spaces are collapsed; initials are
 * not, because "Apeksha I" and "Apeksha Rao" are two different people on this
 * sheet and a looser rule would merge them.
 */
function findRow_(ctx, name, email) {
  var last = ctx.sheet.getLastRow();
  var wantEmail = email.toLowerCase();
  var wantName = normaliseName_(name);

  for (var r = 2; r <= last; r++) {
    var e = String(cell_(ctx.sheet, ctx.headers, r, COL.EMAIL) || '').trim().toLowerCase();
    if (e && e === wantEmail) return r;
  }
  for (var r2 = 2; r2 <= last; r2++) {
    var n = normaliseName_(String(cell_(ctx.sheet, ctx.headers, r2, COL.NAME) || ''));
    if (n && n === wantName) return r2;
  }
  return null;
}

function normaliseName_(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ─────────────────────────────────────────────────────────────── delivery */

/**
 * Builds both PDFs for one row and records them. SENDS NOTHING.
 *
 * Returns { ok } rather than throwing: the caller is a web request that has to
 * answer the intern either way, and a failure here is already written to the
 * row's Status column for HR to find.
 *
 * The document filling is Code.gs's makeDoc_ — this does not reimplement it. It
 * cannot call processRows_, which opens a UI dialog a web request cannot show.
 */
function generateRow_(row) {
  var ctx = ensureColumns_(sheetCtx_());
  var name = String(cell_(ctx.sheet, ctx.headers, row, COL.NAME) || '').trim();
  if (!name) { console.error('Row %s has no name; nothing sent.', row); return { ok: false }; }

  try {
    var data = rowData_(ctx.sheet, ctx.headers, row);
    if (!data.EMAIL) throw new Error('no email on row ' + row);

    /* rowData_ is Code.gs's and knows nothing about these two. Added here so
       {{DOB}} and {{UNIVERSITY}} substitute like every other tag — makeDoc_
       replaces every key of this object. */
    data.DOB = String(cell_(ctx.sheet, ctx.headers, row, COL_DOB) || '').trim();
    data.UNIVERSITY = String(cell_(ctx.sheet, ctx.headers, row, COL_UNIVERSITY) || '').trim();
    /* Available as {{AADHAAR_NO}} if a template ever needs it. The leading
       apostrophe is a Sheets storage detail and is stripped here — it would
       otherwise print on the document. */
    data.AADHAAR_NO = String(cell_(ctx.sheet, ctx.headers, row, COL_AADHAAR) || '').replace(/^'/, '').trim();

    var folder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
    var docs = String(data._docs || 'Both').toLowerCase();

    if (docs === 'both' || docs.indexOf('offer') >= 0) {
      var offer = makeDoc_(CONFIG.OFFER_TEMPLATE_ID, 'Offer Letter — ' + name, data, folder);
      setCell_(ctx.sheet, ctx.headers, row, COL.OFFER_DOC, offer.getUrl());
    }
    if (docs === 'both' || docs.indexOf('nda') >= 0) {
      var nda = makeDoc_(CONFIG.NDA_TEMPLATE_ID, 'NDA — ' + name, data, folder);
      setCell_(ctx.sheet, ctx.headers, row, COL.NDA_DOC, nda.getUrl());
    }

    /* No email here. The row now waits for the Approved column; see
       sendApprovedDocuments(). */
    setCell_(ctx.sheet, ctx.headers, row, COL.STATUS, 'Generated — awaiting approval');
    return { ok: true };
  } catch (err) {
    /* The row records the failure so HR sees it on the sheet rather than only in
       an execution log nobody opens. */
    console.error('Generation failed for row %s: %s', row, err && err.stack ? err.stack : err);
    setCell_(ctx.sheet, ctx.headers, row, COL.STATUS, 'FAILED — ' + (err && err.message ? err.message : err));
    return { ok: false };
  }
}

/* ──────────────────────────────────────────────────────────── the approval */

/**
 * Emails every approved row that has not been sent. THE ONE THING THAT SENDS.
 *
 * Run it from VIKASANA HR → "Email approved candidates", or from the editor.
 * Attaches the PDFs generated at submission rather than regenerating them, so
 * what reaches the candidate is what was looked at and approved — a regenerated
 * document could differ if the template or the row changed in between, and the
 * approval would then apply to something nobody saw.
 */
function sendApprovedDocuments() {
  var ctx = ensureColumns_(sheetCtx_());
  var last = ctx.sheet.getLastRow();
  var sent = [], skipped = [], failed = [];

  for (var r = 2; r <= last; r++) {
    var name = String(cell_(ctx.sheet, ctx.headers, r, COL.NAME) || '').trim();
    if (!name) continue;

    var status = String(cell_(ctx.sheet, ctx.headers, r, COL.STATUS) || '').trim();
    if (/^sent/i.test(status)) continue;                 /* already gone, silently */
    if (!isApproved_(cell_(ctx.sheet, ctx.headers, r, COL_APPROVED))) {
      skipped.push(name + ' — not approved');
      continue;
    }

    try {
      var data = rowData_(ctx.sheet, ctx.headers, r);
      if (!data.EMAIL) throw new Error('no email on the row');
      data.DOB = String(cell_(ctx.sheet, ctx.headers, r, COL_DOB) || '').trim();
      data.UNIVERSITY = String(cell_(ctx.sheet, ctx.headers, r, COL_UNIVERSITY) || '').trim();
      data.AADHAAR_NO = String(cell_(ctx.sheet, ctx.headers, r, COL_AADHAAR) || '').replace(/^'/, '').trim();

      var pdfs = [];
      var offerUrl = String(cell_(ctx.sheet, ctx.headers, r, COL.OFFER_DOC) || '');
      var ndaUrl = String(cell_(ctx.sheet, ctx.headers, r, COL.NDA_DOC) || '');
      if (offerUrl) pdfs.push(fileFromUrl_(offerUrl));
      if (ndaUrl) pdfs.push(fileFromUrl_(ndaUrl));

      /* Refuse rather than send an empty envelope. A row approved before its
         documents existed is a mistake worth stopping at, not papering over. */
      if (!pdfs.length) throw new Error('no generated PDF on the row — generate before approving');

      sendForForwarding_(data, pdfs);
      setCell_(ctx.sheet, ctx.headers, r, COL.STATUS,
               SEND_AS ? 'Sent — awaiting signature' : 'With ' + FORWARD_INBOX + ' — to forward');
      setCell_(ctx.sheet, ctx.headers, r, COL.SENT_AT, new Date());
      sent.push(name);
    } catch (err) {
      console.error('Send failed for row %s: %s', r, err && err.stack ? err.stack : err);
      setCell_(ctx.sheet, ctx.headers, r, COL.STATUS, 'FAILED — ' + (err && err.message ? err.message : err));
      failed.push(name + ': ' + (err && err.message ? err.message : err));
    }
  }

  var summary = 'Sent ' + sent.length + (sent.length ? ': ' + sent.join(', ') : '') +
    (skipped.length ? '\nSkipped ' + skipped.length + ': ' + skipped.join(', ') : '') +
    (failed.length ? '\nFAILED ' + failed.length + ':\n  ' + failed.join('\n  ') : '');
  Logger.log(summary);

  /* Only when a person is watching. The same function runs from the editor and
     from a menu, and getUi() throws when there is no document open. */
  try {
    SpreadsheetApp.getUi().alert(summary);
  } catch (ignored) {
    /* editor run — the log is the output */
  }
  return summary;
}

/**
 * Whether the Approved cell says yes.
 *
 * A checkbox gives a real boolean; a person gives "Yes", "yes ", "Y" or
 * "Approved". All of them count, because the column is filled in by hand and a
 * row left unsent over its capitalisation is a fault nobody can see.
 */
function isApproved_(v) {
  if (v === true) return true;
  return /^(y|yes|approved|true)$/i.test(String(v == null ? '' : v).trim());
}

/**
 * The Drive file behind a URL written into the sheet.
 *
 * The PDF columns hold getUrl() values, so the id has to come back out of one.
 * Both shapes Drive uses are handled; anything else throws with the URL in the
 * message rather than returning undefined into an attachments array.
 */
function fileFromUrl_(url) {
  var m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(url) || /[?&]id=([a-zA-Z0-9_-]{20,})/.exec(url);
  if (!m) throw new Error('could not read a file id from "' + url + '"');
  return DriveApp.getFileById(m[1]);
}

/**
 * Logs every address this account is allowed to send as.
 *
 * Run it before setting SEND_AS. Gmail ignores an unverified alias without
 * complaining — it sends from the account's own address instead — so a typo or
 * an unfinished verification would look like success and leak the gmail address
 * to a candidate.
 */
function listAliases() {
  var aliases = GmailApp.getAliases();
  if (!aliases.length) {
    Logger.log('No send-as aliases on this account. Add info@vikasanasystems.tech under ' +
               'Gmail → Settings → Accounts and Import → "Send mail as", verify it, then run this again.');
    return;
  }
  Logger.log('This account can send as:\n  %s', aliases.join('\n  '));
  Logger.log(SEND_AS
    ? (aliases.indexOf(SEND_AS) >= 0
        ? 'SEND_AS "' + SEND_AS + '" is verified — direct sending will work.'
        : 'SEND_AS "' + SEND_AS + '" is NOT in that list. Gmail would ignore it and send from the account address.')
    : 'SEND_AS is empty, so documents go to ' + FORWARD_INBOX + ' to be forwarded.');
}

/**
 * Mails the PDFs to the candidate as SEND_AS, or to FORWARD_INBOX to be
 * forwarded when no alias is configured.
 *
 * In the forwarding case the subject names the candidate, so the inbox list is
 * readable and nobody has to open an attachment to find out who it is for.
 */
function sendForForwarding_(data, pdfs) {
  if (SEND_AS) return sendAsAlias_(data, pdfs);
  return sendToForwardInbox_(data, pdfs);
}

function sendToForwardInbox_(data, pdfs) {
  var subject = 'TO SEND — ' + data.NAME + ' <' + data.EMAIL + '> — Offer of Internship & NDA';

  /* Addressed to the candidate and signed off, so Forward needs no editing. */
  var html =
    '<p>Dear ' + data.NAME + ',</p>' +
    '<p>Congratulations. Please find attached your <b>Offer of Internship</b> and ' +
    '<b>Non-Disclosure Agreement</b> for the position of <b>' + data.ROLE + '</b> at ' +
    'VIKASANA Systems Private Limited, starting <b>' + data.START_DATE + '</b>.</p>' +
    '<p>To confirm, please:</p><ol>' +
    '<li>Sign and date the <b>Offer of Internship Accepted</b> page of the offer letter.</li>' +
    '<li>Sign and date the signature block on the last page of the NDA.</li>' +
    '<li>Reply to this email with the signed copies, scanned or photographed clearly.</li></ol>' +
    '<p>If you have any questions, simply reply to this email.</p>' +
    '<p>Regards,<br>' + CONFIG.SENDER_NAME + '<br>VIKASANA Systems Private Limited, Mangaluru</p>' +
    /* Below the signature and visibly internal, so it reads as something to
       delete rather than as part of the letter. */
    '<hr><p style="color:#777;font-size:12px">' +
    '<b>Internal — delete before forwarding.</b><br>' +
    'Send to: ' + data.EMAIL + '<br>' +
    'Cc: ' + FORWARD_CC + '<br>' +
    'Mobile: ' + (data.MOBILE || '—') + '<br>' +
    /* Linked, not attached. An attachment is copied into every mailbox the
       message reaches and cannot be withdrawn from any of them; these are
       identity documents and this email gets forwarded. */
    'Aadhaar / transcript: on Drive, see the candidate row — not attached here.<br>' +
    'Address: ' + [data.ADDRESS_LINE1, data.ADDRESS_LINE2, data.ADDRESS_LINE3].filter(String).join(', ') + '<br>' +
    'Refs: ' + data.OFFER_REF + ' / ' + data.NDA_REF +
    '</p>';

  var opts = {
    htmlBody: html,
    attachments: pdfs,
    name: CONFIG.SENDER_NAME,
    /* A reply to the notification reaches the person who owns the process, not
       the gmail account the script happens to run as. */
    replyTo: FORWARD_CC,
  };
  GmailApp.sendEmail(FORWARD_INBOX, subject, html.replace(/<[^>]+>/g, ' '), opts);
}

/**
 * Sends straight to the candidate, from the verified alias.
 *
 * The alias is checked against getAliases() rather than trusted: Gmail falls
 * back to the account's own address for an unverified one, which would put the
 * gmail address in front of a candidate while every log said the mail was sent.
 * Better to fail into the forwarding flow, which is known to be safe.
 */
function sendAsAlias_(data, pdfs) {
  if (GmailApp.getAliases().indexOf(SEND_AS) < 0) {
    /* The fallback needs somewhere to go. An empty FORWARD_INBOX would make
       GmailApp.sendEmail('') throw here, turning an unverified alias — a
       configuration mistake with a safe recovery — into a failed delivery. */
    if (!FORWARD_INBOX) {
      throw new Error('SEND_AS "' + SEND_AS + '" is not a verified alias and FORWARD_INBOX is empty, ' +
                      'so there is nowhere to send. Run listAliases(), and set one of the two.');
    }
    console.error('SEND_AS "%s" is not a verified alias on this account — falling back to %s. Run listAliases().',
                  SEND_AS, FORWARD_INBOX);
    return sendToForwardInbox_(data, pdfs);
  }

  var subject = 'VIKASANA Systems — Offer of Internship & NDA (' + data.ROLE + ')';
  var html =
    '<p>Dear ' + data.NAME + ',</p>' +
    '<p>Congratulations. Please find attached your <b>Offer of Internship</b> and ' +
    '<b>Non-Disclosure Agreement</b> for the position of <b>' + data.ROLE + '</b> at ' +
    'VIKASANA Systems Private Limited, starting <b>' + data.START_DATE + '</b>.</p>' +
    '<p>To confirm, please:</p><ol>' +
    '<li>Sign and date the <b>Offer of Internship Accepted</b> page of the offer letter.</li>' +
    '<li>Sign and date the signature block on the last page of the NDA.</li>' +
    '<li>Reply to this email with the signed copies, scanned or photographed clearly.</li></ol>' +
    '<p>If you have any questions, simply reply to this email.</p>' +
    '<p>Regards,<br>' + CONFIG.SENDER_NAME + '<br>VIKASANA Systems Private Limited, Mangaluru</p>';

  GmailApp.sendEmail(data.EMAIL, subject, html.replace(/<[^>]+>/g, ' '), {
    htmlBody: html,
    attachments: pdfs,
    name: CONFIG.SENDER_NAME,
    from: SEND_AS,
    /* bcc, not cc — see the note on FORWARD_CC. The candidate receives this
       message, and a Cc header would show them the address. */
    bcc: FORWARD_CC,
    replyTo: SEND_AS,
  });
}

function deleteTrigger_(uid) {
  if (!uid) return;
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getUniqueId() === uid) { ScriptApp.deleteTrigger(all[i]); return; }
  }
}

/**
 * ONE-OFF HOUSEKEEPING — run from the editor, then read the log.
 *
 * Deletes every row whose Name begins "ZZ TEST" (the submissions made while
 * wiring this up), then renumbers the Offer and NDA references of the rows that
 * remain so they run from 001 with no gaps, and sets the counters so the next
 * auto-generated reference continues from the last one used.
 *
 * SAFE TO RUN ONLY BEFORE REAL LETTERS GO OUT. Renumbering rewrites references
 * that may already be printed on a PDF someone is holding; this changes the
 * sheet and not the documents. The Status column is the test: it is blank on a
 * row nothing has been sent for. Rows that have been sent are renumbered too —
 * if any exist, stop and do this by hand instead.
 *
 * Deletions are bottom-up. Removing a row shifts every row below it up by one,
 * so a top-down loop reads the wrong rows after the first delete.
 */
function cleanupTestRowsAndRenumber() {
  var ctx = ensureColumns_(sheetCtx_());
  var last = ctx.sheet.getLastRow();

  var sentRows = [];
  for (var s1 = 2; s1 <= last; s1++) {
    var st = String(cell_(ctx.sheet, ctx.headers, s1, COL.STATUS) || '').trim();
    var nm = String(cell_(ctx.sheet, ctx.headers, s1, COL.NAME) || '').trim();
    if (st && !/^ZZ TEST/i.test(nm)) sentRows.push(nm + ' (row ' + s1 + '): ' + st);
  }
  if (sentRows.length) {
    Logger.log('STOPPED — these rows already have a Status, so a reference may be on a document that has left:\n  %s',
               sentRows.join('\n  '));
    Logger.log('Clear those Status cells first if the renumber is still what you want.');
    return;
  }

  var deleted = 0;
  for (var r = last; r >= 2; r--) {
    var name = String(cell_(ctx.sheet, ctx.headers, r, COL.NAME) || '').trim();
    if (/^ZZ TEST/i.test(name)) {
      ctx.sheet.deleteRow(r);
      deleted++;
    }
  }

  last = ctx.sheet.getLastRow();
  var n = 0;
  for (var r2 = 2; r2 <= last; r2++) {
    var nm2 = String(cell_(ctx.sheet, ctx.headers, r2, COL.NAME) || '').trim();
    if (!nm2) continue;
    n++;
    var pad = String(n).padStart(3, '0');
    setCell_(ctx.sheet, ctx.headers, r2, COL.OFFER_REF, CONFIG.OFFER_REF_PREFIX + pad);
    setCell_(ctx.sheet, ctx.headers, r2, COL.NDA_REF, CONFIG.NDA_REF_PREFIX + pad);
  }

  /* nextRef_ increments BEFORE it formats, so storing n makes the next
     generated reference n+1 — the first number not used above. */
  PropertiesService.getScriptProperties().setProperties({ REF_OFFER: String(n), REF_NDA: String(n) });

  Logger.log('Deleted %s test row(s). Renumbered %s candidate(s) from %s001. Next auto reference will be %s.',
             deleted, n, CONFIG.OFFER_REF_PREFIX, CONFIG.OFFER_REF_PREFIX + String(n + 1).padStart(3, '0'));
}

/**
 * Run by hand if triggers ever pile up — deletes every deliverScheduled_ trigger
 * and forgets the rows they were holding. Those rows stay Queued and can be sent
 * from the VIKASANA HR menu.
 */
function clearPendingDeliveries() {
  var props = PropertiesService.getScriptProperties();
  var all = ScriptApp.getProjectTriggers();
  var n = 0;
  for (var i = 0; i < all.length; i++) {
    if (all[i].getHandlerFunction() === 'deliverScheduled_') {
      props.deleteProperty(PENDING_PREFIX + all[i].getUniqueId());
      ScriptApp.deleteTrigger(all[i]);
      n++;
    }
  }
  Logger.log('Deleted %s pending delivery trigger(s).', n);
}

/* ────────────────────────────────────────────────────────────────── output */

/**
 * "1999-04-07" → "07 April 1999", matching plainDate_ in Code.gs so a date on a
 * letter reads the same wherever it came from. Anything unparseable is kept
 * verbatim rather than discarded — a date we cannot read is still the date the
 * person typed, and losing it would be worse than printing it oddly.
 */
function formatDob_(raw) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!m) return raw;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (isNaN(d.getTime())) return raw;
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'dd MMMM yyyy');
}

function trim_(v, max) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
