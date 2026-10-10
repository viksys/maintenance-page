/**
 * VIKASANA Systems — Offer Letter & NDA generator
 * -------------------------------------------------
 * Bound to the "Candidates" Google Sheet. For each selected row it:
 *   1. copies the Offer Letter and/or NDA template (Google Docs),
 *   2. fills every {{TAG}} with that candidate's details,
 *   3. exports a PDF of each into the output Drive folder,
 *   4. emails the PDFs to the candidate asking them to sign and return,
 *   5. writes the links, status and timestamp back to the sheet.
 *
 * Tags used in the templates:
 *   {{NAME}} {{EMAIL}} {{MOBILE}} {{ADDRESS_LINE1}} {{ADDRESS_LINE2}} {{ADDRESS_LINE3}}
 *   {{ROLE}} {{START_DATE}} {{END_DATE}} {{DATE}} {{OFFER_REF}} {{NDA_REF}}
 */

// ============ CONFIG — fill these in once ============
const CONFIG = {
  OFFER_TEMPLATE_ID: '122DRvbf-h25rQts2VFOnm8P7xyIGTFb_uJPbQngqI2w',
  NDA_TEMPLATE_ID:   '18sse0ikFcVYRUbl_xtjYIqTDLOFactl5J_1t3MZIauk',
  OUTPUT_FOLDER_ID:  '1cujlT8eauaq_rzSVQp10FZrxAmYBytcP',
  SHEET_NAME:        'Candidates',
  SENDER_NAME:       'VIKASANA Systems HR',
  CC:                '',                       // e.g. 'hr@vikasanasystems.tech'
  REPLY_TO:          '',                       // optional
  TIMEZONE:          'Asia/Kolkata',
  DEFAULT_ROLE:      'Defence System Intern',
  OFFER_REF_PREFIX:  'VSPL/HR/INT/2026/',
  NDA_REF_PREFIX:    'VSPL/LGL/NDA/2026/',
};

// Lines that are removed entirely from the document when the value is blank
const OPTIONAL_TAGS = ['EMAIL', 'MOBILE', 'ADDRESS_LINE1', 'ADDRESS_LINE2', 'ADDRESS_LINE3'];

// Sheet column headers (row 1) — matched by name, so column order does not matter
const COL = {
  NAME: 'Name', EMAIL: 'Email', MOBILE: 'Mobile',
  ADDR1: 'Address Line 1', ADDR2: 'Address Line 2', ADDR3: 'Address Line 3',
  ROLE: 'Role', START: 'Start Date', END: 'End Date', DATE: 'Letter Date',
  OFFER_REF: 'Offer Ref', NDA_REF: 'NDA Ref', DOCS: 'Documents',
  STATUS: 'Status', OFFER_DOC: 'Offer PDF', NDA_DOC: 'NDA PDF', SENT_AT: 'Sent At',
};

// ============ MENU ============
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('VIKASANA HR')
    .addItem('Generate + email — selected rows', 'sendSelected')
    .addItem('Generate only (no email) — selected rows', 'generateSelected')
    .addSeparator()
    .addItem('Generate + email — all rows not yet Sent', 'sendAllPending')
    .addSeparator()
    /* The website form's half: /onboarding generates on submission and sends
       nothing, so this is what actually mails those candidates. Defined in
       WebForm.gs; the menu lives here because a project gets one onOpen. */
    .addItem('Generate rows ' + GENERATE_FROM_ROW + '–' + GENERATE_TO_ROW + ' (no email)', 'generateRowRange')
    .addItem('Email approved candidates (from the form)', 'sendApprovedDocuments')
    .addToUi();
}

function sendSelected()    { processRows_(selectedRows_(), true); }
function generateSelected(){ processRows_(selectedRows_(), false); }
function sendAllPending() {
  const { sheet, headers } = sheet_();
  const rows = [];
  const last = sheet.getLastRow();
  for (let r = 2; r <= last; r++) {
    const name = cell_(sheet, headers, r, COL.NAME);
    const status = String(cell_(sheet, headers, r, COL.STATUS) || '');
    if (name && !/^sent/i.test(status)) rows.push(r);
  }
  processRows_(rows, true);
}

// ============ CORE ============
function processRows_(rows, sendEmail) {
  const ui = SpreadsheetApp.getUi();
  if (!rows.length) { ui.alert('No candidate rows selected.'); return; }
  const verb = sendEmail ? 'generate and EMAIL' : 'generate (no email)';
  if (ui.alert(`About to ${verb} documents for ${rows.length} candidate(s). Continue?`,
               ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;

  const { sheet, headers } = sheet_();
  const folder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
  const done = [], failed = [];

  rows.forEach(r => {
    const name = String(cell_(sheet, headers, r, COL.NAME) || '').trim();
    if (!name) return;
    try {
      const data = rowData_(sheet, headers, r);
      const docs = String(data._docs || 'Both').toLowerCase();
      const pdfs = [];

      if (docs === 'both' || docs.includes('offer')) {
        const pdf = makeDoc_(CONFIG.OFFER_TEMPLATE_ID, `Offer Letter — ${name}`, data, folder);
        setCell_(sheet, headers, r, COL.OFFER_DOC, pdf.getUrl());
        pdfs.push(pdf.getBlob());
      }
      if (docs === 'both' || docs.includes('nda')) {
        const pdf = makeDoc_(CONFIG.NDA_TEMPLATE_ID, `NDA — ${name}`, data, folder);
        setCell_(sheet, headers, r, COL.NDA_DOC, pdf.getUrl());
        pdfs.push(pdf.getBlob());
      }

      if (sendEmail) {
        if (!data.EMAIL) throw new Error('Email is blank');
        sendMail_(data, pdfs);
        setCell_(sheet, headers, r, COL.STATUS, 'Sent — awaiting signature');
        setCell_(sheet, headers, r, COL.SENT_AT, new Date());
      } else {
        setCell_(sheet, headers, r, COL.STATUS, 'Generated');
      }
      done.push(name);
    } catch (e) {
      setCell_(sheet, headers, r, COL.STATUS, 'ERROR: ' + e.message);
      failed.push(`${name}: ${e.message}`);
    }
  });

  ui.alert(`Done: ${done.length}` + (failed.length ? `\nFailed:\n${failed.join('\n')}` : ''));
}

/** Copy template → fill tags → save PDF to folder. Returns the PDF File. */
function makeDoc_(templateId, title, data, folder) {
  const copy = DriveApp.getFileById(templateId).makeCopy(title, folder);
  const doc = DocumentApp.openById(copy.getId());

  const sections = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean);
  sections.forEach(sec => {
    // 1. drop optional lines whose value is blank
    OPTIONAL_TAGS.forEach(tag => {
      if (!data[tag]) removeParagraphsWith_(sec, `{{${tag}}}`);
    });
    // 2. replace every tag
    Object.keys(data).forEach(tag => {
      if (tag.startsWith('_')) return;
      sec.replaceText(escapeRegex_(`{{${tag}}}`), String(data[tag] || ''));
    });
  });

  doc.saveAndClose();
  const pdfBlob = copy.getAs(MimeType.PDF).setName(`${title}.pdf`);
  return folder.createFile(pdfBlob);
}

function sendMail_(data, pdfs) {
  const subject = `VIKASANA Systems — Offer of Internship & NDA (${data.ROLE})`;
  const html =
    `<p>Dear ${data.NAME},</p>` +
    `<p>Congratulations! Please find attached your <b>Offer of Internship</b> and ` +
    `<b>Non-Disclosure Agreement</b> for the position of <b>${data.ROLE}</b> at ` +
    `VIKASANA Systems Private Limited, starting <b>${data.START_DATE}</b>.</p>` +
    `<p>To confirm, please:</p><ol>` +
    `<li>Sign and date the <b>Offer of Internship Accepted</b> page of the offer letter.</li>` +
    `<li>Sign and date the signature block on the last page of the NDA.</li>` +
    `<li>Reply to this email with the signed copies (scanned PDF or clear photos).</li></ol>` +
    `<p>If you have any questions, simply reply to this email.</p>` +
    `<p>Regards,<br>${CONFIG.SENDER_NAME}<br>VIKASANA Systems Private Limited, Mangaluru</p>`;
  const opts = { htmlBody: html, attachments: pdfs, name: CONFIG.SENDER_NAME };
  if (CONFIG.CC) opts.cc = CONFIG.CC;
  if (CONFIG.REPLY_TO) opts.replyTo = CONFIG.REPLY_TO;
  GmailApp.sendEmail(data.EMAIL, subject, html.replace(/<[^>]+>/g, ''), opts);
}

/** Build the tag → value map for one row (auto-fills refs and dates if blank). */
function rowData_(sheet, headers, r) {
  const v = c => cell_(sheet, headers, r, c);
  let offerRef = v(COL.OFFER_REF), ndaRef = v(COL.NDA_REF);
  if (!offerRef) { offerRef = nextRef_('OFFER', CONFIG.OFFER_REF_PREFIX); setCell_(sheet, headers, r, COL.OFFER_REF, offerRef); }
  if (!ndaRef)   { ndaRef   = nextRef_('NDA',   CONFIG.NDA_REF_PREFIX);   setCell_(sheet, headers, r, COL.NDA_REF, ndaRef); }

  return {
    NAME: String(v(COL.NAME)).trim(),
    EMAIL: String(v(COL.EMAIL) || '').trim(),
    MOBILE: String(v(COL.MOBILE) || '').trim(),
    ADDRESS_LINE1: String(v(COL.ADDR1) || '').trim(),
    ADDRESS_LINE2: String(v(COL.ADDR2) || '').trim(),
    ADDRESS_LINE3: String(v(COL.ADDR3) || '').trim(),
    ROLE: String(v(COL.ROLE) || CONFIG.DEFAULT_ROLE).trim(),
    START_DATE: ordinalDate_(v(COL.START)),        // e.g. 12th October 2026
    END_DATE: ordinalDate_(v(COL.END)),            // e.g. 12th February 2027
    DATE: plainDate_(v(COL.DATE) || new Date()),   // e.g. 09 October 2026
    OFFER_REF: String(offerRef),
    NDA_REF: String(ndaRef),

    /*
      Collected by the website form (/onboarding), and read here so BOTH paths
      produce the same document — this menu and WebForm.gs's generator.

      It matters because makeDoc_ only replaces tags it is given a value for. A
      tag with no key is left alone, so once {{DOB}} is added to a template, a
      letter generated from this menu without these would print the literal
      "{{DOB}}" on the page.

      optionalCell_ because these columns do not exist on a sheet that predates
      the form, and a missing column must read as blank rather than throw.
    */
    DOB: String(optionalCell_(sheet, headers, r, 'DOB') || '').trim(),
    UNIVERSITY: String(optionalCell_(sheet, headers, r, 'University') || '').trim(),
    /* The sheet stores this with a leading apostrophe so twelve digits are not
       rendered as 1.23457E+11; it is a storage detail and must not print. */
    AADHAAR_NO: String(optionalCell_(sheet, headers, r, 'Aadhaar No') || '').replace(/^'/, '').trim(),

    _docs: v(COL.DOCS),
  };
}

/** A cell whose column may not exist. Returns '' rather than throwing. */
function optionalCell_(sheet, headers, r, name) {
  const i = headers.indexOf(name);
  return i < 0 ? '' : sheet.getRange(r, i + 1).getValue();
}

// ============ HELPERS ============
function sheet_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${CONFIG.SHEET_NAME}" not found`);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());
  return { sheet, headers };
}
function col_(headers, name) {
  const i = headers.indexOf(name);
  if (i < 0) throw new Error(`Column "${name}" not found in row 1`);
  return i + 1;
}
function cell_(sheet, headers, r, name) { return sheet.getRange(r, col_(headers, name)).getValue(); }
function setCell_(sheet, headers, r, name, val) { sheet.getRange(r, col_(headers, name)).setValue(val); }

function selectedRows_() {
  const rows = new Set();
  const list = SpreadsheetApp.getActive().getActiveRangeList();
  if (!list) return [];
  list.getRanges().forEach(rg => {
    for (let r = rg.getRow(); r < rg.getRow() + rg.getNumRows(); r++) if (r > 1) rows.add(r);
  });
  return [...rows].sort((a, b) => a - b);
}

function removeParagraphsWith_(section, tag) {
  let found;
  const pattern = escapeRegex_(tag);
  while ((found = section.findText(pattern)) !== null) {
    let el = found.getElement();
    while (el && el.getType() !== DocumentApp.ElementType.PARAGRAPH &&
           el.getType() !== DocumentApp.ElementType.LIST_ITEM) el = el.getParent();
    if (!el) break;
    try { el.removeFromParent(); } catch (e) { el.setText(''); break; } // last paragraph can't be removed
  }
}

function toDate_(v) {
  if (v instanceof Date) return v;
  const d = new Date(v);
  if (isNaN(d)) throw new Error(`Bad date: "${v}"`);
  return d;
}
function plainDate_(v) { return Utilities.formatDate(toDate_(v), CONFIG.TIMEZONE, 'dd MMMM yyyy'); }
function ordinalDate_(v) {
  if (!v) return '';
  const d = toDate_(v);
  const day = Number(Utilities.formatDate(d, CONFIG.TIMEZONE, 'd'));
  const s = (day % 100 >= 11 && day % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
  return day + s + ' ' + Utilities.formatDate(d, CONFIG.TIMEZONE, 'MMMM yyyy');
}

/** Running reference counter stored in Script Properties (set the start in setRefCounters). */
function nextRef_(key, prefix) {
  const props = PropertiesService.getScriptProperties();
  const n = Number(props.getProperty('REF_' + key) || 1) + 1;
  props.setProperty('REF_' + key, String(n));
  return prefix + String(n).padStart(3, '0');
}
/** Run once from the editor if you want auto refs to continue after 008. */
function setRefCounters() {
  PropertiesService.getScriptProperties().setProperties({ REF_OFFER: '8', REF_NDA: '8' });
}

function escapeRegex_(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
