/**
 * VIKASANA Systems — intern detail form, web-app half
 * ---------------------------------------------------
 * A SECOND FILE IN THE SAME APPS SCRIPT PROJECT AS Code.gs. It does not replace
 * it and does not copy it: makeDoc_, sendMail_, rowData_ and the sheet helpers
 * are Code.gs's, and the VIKASANA HR menu still works exactly as before. Add
 * this file beside it (Apps Script editor → Files → +), do not paste it over.
 *
 * What it adds: /onboarding on the website posts here. This writes the
 * candidate's own details into their row, then schedules generation for a random
 * 10–15 minutes later. The generation is Code.gs's; the email is not — the PDFs
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
 * WHY THE DELAY IS A TRIGGER AND NOT A SLEEP
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities.sleep() inside doPost would hold the request open for a quarter of
 * an hour, and Apps Script kills an execution at six minutes — so the mail would
 * never be sent and the intern would watch a spinner until their browser gave
 * up. A one-time time-based trigger fires after the request has already
 * returned, which is also what lets the page answer immediately.
 */

/* The delay window, in minutes. Each submission draws a fresh value in between,
   so two interns submitting together do not receive their letters in the same
   second — which is what makes the batch look generated rather than sent. */
var DELAY_MIN_MINUTES = 10;
var DELAY_MAX_MINUTES = 15;

/* Script property prefix: one entry per pending delivery, keyed by trigger id. */
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

/* ───────────────────────────────────────────────────────────── first run */

function setupWebForm() {
  if (/^PASTE_/.test(CONFIG.OFFER_TEMPLATE_ID) || /^PASTE_/.test(CONFIG.NDA_TEMPLATE_ID) ||
      /^PASTE_/.test(CONFIG.OUTPUT_FOLDER_ID)) {
    throw new Error('CONFIG in Code.gs still has PASTE_ placeholders — fill in the two template IDs and the output folder ID first.');
  }
  var ctx = sheet_();
  DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
  DocumentApp.openById(CONFIG.OFFER_TEMPLATE_ID);
  DocumentApp.openById(CONFIG.NDA_TEMPLATE_ID);
  Logger.log('Ready. Sheet "%s" has %s data row(s). Templates and output folder reachable.',
             CONFIG.SHEET_NAME, ctx.sheet.getLastRow() - 1);
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
    var ctx = sheet_();
    var row = findRow_(ctx, name, email);

    if (row) {
      /* Already on the sheet: HR seeded the name, the role, the dates and the
         reference numbers. Only the fields the intern owns are written, so a
         submission cannot move a start date or renumber a letter. */
      var status = String(cell_(ctx.sheet, ctx.headers, row, COL.STATUS) || '');
      if (/^sent/i.test(status)) {
        return { ok: false, error: 'already', message: 'Your documents have already been sent. Please check your inbox, including spam.' };
      }
      if (/^queued/i.test(status)) {
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

    var minutes = DELAY_MIN_MINUTES + Math.random() * (DELAY_MAX_MINUTES - DELAY_MIN_MINUTES);
    var when = new Date(Date.now() + Math.round(minutes * 60 * 1000));

    var trigger = ScriptApp.newTrigger('deliverScheduled_').timeBased().at(when).create();
    PropertiesService.getScriptProperties().setProperty(PENDING_PREFIX + trigger.getUniqueId(), String(row));

    /* Status is written AFTER the trigger exists. If trigger creation throws —
       the quota is 20 per script — the row stays un-queued and the intern is
       told it failed, instead of a row that claims a delivery nobody scheduled. */
    setCell_(ctx.sheet, ctx.headers, row, COL.STATUS,
             'Queued — sending ' + Utilities.formatDate(when, CONFIG.TIMEZONE, 'HH:mm'));

    return { ok: true, minutes: Math.round(minutes) };
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
 * Fires once, some minutes after the submission that created it.
 *
 * Generation and email are Code.gs's — this does not reimplement either. It
 * cannot call processRows_ because that opens a UI dialog, and a trigger has no
 * UI: SpreadsheetApp.getUi() throws outside a document context.
 */
function deliverScheduled_(e) {
  var props = PropertiesService.getScriptProperties();
  var key = PENDING_PREFIX + (e && e.triggerUid);
  var rowStr = props.getProperty(key);

  /* Always clean up, whatever happens below. A one-time trigger survives its own
     firing, and the limit is 20 per script — leaking them eventually makes every
     further submission fail at the point of scheduling. */
  try {
    deleteTrigger_(e && e.triggerUid);
  } catch (err) {
    console.error('Could not delete trigger: %s', err);
  }
  props.deleteProperty(key);

  if (!rowStr) {
    console.error('Trigger fired with no pending row recorded (uid %s).', e && e.triggerUid);
    return;
  }
  deliverRow_(Number(rowStr));
}

function deliverRow_(row) {
  var ctx = sheet_();
  var name = String(cell_(ctx.sheet, ctx.headers, row, COL.NAME) || '').trim();
  if (!name) { console.error('Row %s has no name; nothing sent.', row); return; }

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
  } catch (err) {
    /* The row records the failure so HR sees it on the sheet rather than only in
       an execution log nobody opens. The intern was told to expect the email in
       10–15 minutes and will not get one; this is the trail for chasing it. */
    console.error('Delivery failed for row %s: %s', row, err && err.stack ? err.stack : err);
    setCell_(ctx.sheet, ctx.headers, row, COL.STATUS, 'FAILED — ' + (err && err.message ? err.message : err));
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
