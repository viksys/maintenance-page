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
 * NO DELAY, AND NO TRIGGER
 * ─────────────────────────────────────────────────────────────────────────────
 * An earlier version waited a random 10–15 minutes and used a one-time
 * time-based trigger to do it, because Utilities.sleep() cannot hold a request
 * that long — Apps Script kills an execution at six minutes.
 *
 * The delay is gone, so the trigger is too: generation and sending happen inside
 * the request. That removes the whole machinery around it — the script
 * properties that remembered which row a trigger belonged to, the deletion after
 * firing, and the 20-trigger quota that made leaking them fatal.
 *
 * The cost is that the intern waits for it. Two document copies, two PDF
 * exports and a send take tens of seconds, and the page has to allow for that —
 * see TIMEOUT_MS in src/pages/Onboarding.js on the website.
 */

/* Script property prefix used by the retired scheduled path. Kept only so
   clearPendingDeliveries() can tidy up triggers created before this change. */
var PENDING_PREFIX = 'deliver:';

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
var FORWARD_CC = 'mohanth@vikasanasystems.tech';

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
var SPREADSHEET_ID = '';

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

/* ───────────────────────────────────────────────────────────── first run */

function setupWebForm() {
  if (/^PASTE_/.test(CONFIG.OFFER_TEMPLATE_ID) || /^PASTE_/.test(CONFIG.NDA_TEMPLATE_ID) ||
      /^PASTE_/.test(CONFIG.OUTPUT_FOLDER_ID)) {
    throw new Error('CONFIG in Code.gs still has PASTE_ placeholders — fill in the two template IDs and the output folder ID first.');
  }
  if (!SPREADSHEET_ID && !SpreadsheetApp.getActive()) {
    throw new Error(
      'This project is not bound to a spreadsheet, so SpreadsheetApp.getActive() is null. ' +
      'Paste the Candidates spreadsheet ID into SPREADSHEET_ID at the top of WebForm.gs — ' +
      'it is the part of the sheet URL between /d/ and /edit.');
  }
  var ctx = sheetCtx_();
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
  return jsonOut_({ ok: true, service: 'vikasana-intern-onboarding' });
}

function doPost(e) {
  try {
    /* text/plain on purpose: an application/json body makes the browser send a
       CORS preflight, and an Apps Script web app cannot answer OPTIONS. */
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return jsonOut_(receive_(body));
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
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

  if (!name)  return { ok: false, error: 'name',  message: 'Please give your full name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: 'email', message: 'That email address does not look right.' };
  }
  if (!mobile) return { ok: false, error: 'mobile', message: 'A mobile number is required.' };
  if (!addr1)  return { ok: false, error: 'address1', message: 'Please give your address.' };

  /* One submission at a time. Two interns posting together would otherwise both
     read the last row and both append to it, and the second would overwrite the
     first — appendRow is atomic but find-then-write is not. */
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return { ok: false, error: 'busy', message: 'Someone else is submitting right now — please try again in a moment.' };
  }

  try {
    var ctx = sheetCtx_();
    var row = findRow_(ctx, name, email);

    if (row) {
      /* Already on the sheet: HR seeded the name, the role, the dates and the
         reference numbers. Only the fields the intern owns are written, so a
         submission cannot move a start date or renumber a letter. */
      var status = String(cell_(ctx.sheet, ctx.headers, row, COL.STATUS) || '');
      if (/^sent/i.test(status)) {
        return { ok: false, error: 'already', message: 'Your documents have already been sent. Please check your inbox, including spam.' };
      }
      if (/^with /i.test(status) || /^queued/i.test(status)) {
        return { ok: false, error: 'already', message: 'We already have your details — your documents are on their way.' };
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

    /*
      Generated and sent in this request, not scheduled.

      deliverRow_ records its own outcome in the Status column and does not
      throw, so the return below reports what actually happened rather than
      what was intended: an intern is not told their documents are on the way
      when the generation has just failed.
    */
    var sent = deliverRow_(row);
    if (!sent.ok) {
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
 * Generates both documents and mails them to FORWARD_INBOX.
 *
 * Returns { ok } rather than throwing: the caller is a web request that has to
 * answer the intern either way, and a failure here is already written to the
 * row's Status column for HR to find.
 *
 * Generation and the document filling are Code.gs's — this does not
 * reimplement either. It cannot call processRows_, which opens a UI dialog that
 * a web request has no way to show.
 */
function deliverRow_(row) {
  var ctx = sheetCtx_();
  var name = String(cell_(ctx.sheet, ctx.headers, row, COL.NAME) || '').trim();
  if (!name) { console.error('Row %s has no name; nothing sent.', row); return { ok: false }; }

  try {
    var data = rowData_(ctx.sheet, ctx.headers, row);
    if (!data.EMAIL) throw new Error('no email on row ' + row);

    var folder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
    var docs = String(data._docs || 'Both').toLowerCase();
    var pdfs = [];

    if (docs === 'both' || docs.indexOf('offer') >= 0) {
      var offer = makeDoc_(CONFIG.OFFER_TEMPLATE_ID, 'Offer Letter — ' + name, data, folder);
      setCell_(ctx.sheet, ctx.headers, row, COL.OFFER_DOC, offer.getUrl());
      pdfs.push(offer);
    }
    if (docs === 'both' || docs.indexOf('nda') >= 0) {
      var nda = makeDoc_(CONFIG.NDA_TEMPLATE_ID, 'NDA — ' + name, data, folder);
      setCell_(ctx.sheet, ctx.headers, row, COL.NDA_DOC, nda.getUrl());
      pdfs.push(nda);
    }

    /* sendForForwarding_, not Code.gs's sendMail_. The menu path in Code.gs is
       deliberately left alone — it still mails the candidate directly, which is
       the right behaviour when a person has chosen the row and can see who it
       is going to. */
    sendForForwarding_(data, pdfs);
    setCell_(ctx.sheet, ctx.headers, row, COL.STATUS, 'With ' + FORWARD_INBOX + ' — to forward');
    setCell_(ctx.sheet, ctx.headers, row, COL.SENT_AT, new Date());
    return { ok: true };
  } catch (err) {
    /* The row records the failure so HR sees it on the sheet rather than only in
       an execution log nobody opens. The intern was told to expect the email in
       10–15 minutes and will not get one; this is the trail for chasing it. */
    console.error('Delivery failed for row %s: %s', row, err && err.stack ? err.stack : err);
    setCell_(ctx.sheet, ctx.headers, row, COL.STATUS, 'FAILED — ' + (err && err.message ? err.message : err));
    return { ok: false };
  }
}

/**
 * Mails the PDFs to FORWARD_INBOX, ready to be forwarded to the candidate.
 *
 * Subject names the candidate so the inbox list is readable and so whoever
 * forwards it does not have to open the attachments to find out who it is for.
 */
function sendForForwarding_(data, pdfs) {
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

function deleteTrigger_(uid) {
  if (!uid) return;
  var all = ScriptApp.getProjectTriggers();
  for (var i = 0; i < all.length; i++) {
    if (all[i].getUniqueId() === uid) { ScriptApp.deleteTrigger(all[i]); return; }
  }
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

function trim_(v, max) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  return s.length > max ? s.slice(0, max) : s;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
