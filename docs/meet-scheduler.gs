/**
 * meet-scheduler.gs — the booking backend for /meet-scheduler
 *
 * WHY THIS EXISTS
 * ---------------
 * The website is static files on GitHub Pages. It cannot hold a credential and
 * cannot call the Google Calendar API, because doing either from the browser
 * would publish the credential to every visitor. This script is the smallest
 * thing that can: it runs as YOU, on Google's infrastructure, and the page only
 * ever sees the URL it is deployed at.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT NEEDS NO ADVANCED SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * An earlier version of this file used the "Google Calendar API" advanced
 * service (Services → +). That menu is not always available — a Workspace admin
 * can disable it, and it is absent from some editor states — so this version
 * calls the Calendar REST API over UrlFetchApp instead, authorising with the
 * script's own OAuth token from ScriptApp.getOAuthToken().
 *
 * The capability is identical. What makes a Meet link possible is the
 * conferenceDataVersion=1 query parameter, not the advanced service; the simple
 * CalendarApp service cannot attach a conference either way, which is why
 * neither version uses it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEPLOYING IT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. https://script.google.com → New project. Paste this file over Code.gs.
 *
 *  2. Declare the scopes. UrlFetchApp gives Apps Script no way to infer that
 *     this script needs calendar access, so it must be stated or the token
 *     comes back without it and every call returns 401.
 *
 *     Project Settings (the gear, left sidebar)
 *       → tick "Show appsscript.json manifest file in editor"
 *     then open appsscript.json and make it read:
 *
 *       {
 *         "timeZone": "Asia/Kolkata",
 *         "dependencies": {},
 *         "exceptionLogging": "STACKDRIVER",
 *         "runtimeVersion": "V8",
 *         "oauthScopes": [
 *           "https://www.googleapis.com/auth/calendar",
 *           "https://www.googleapis.com/auth/script.external_request"
 *         ]
 *       }
 *
 *  3. Run once from the editor to authorise: pick `authorise` in the function
 *     dropdown and press Run. Accept the prompts — the "Google hasn't verified
 *     this app" screen is expected for your own unpublished script; Advanced →
 *     Go to … (unsafe). Doing this BEFORE deploying means the web app is
 *     authorised the first time a visitor uses it rather than failing on them.
 *
 *  4. Deploy → New deployment → type "Web app".
 *         Execute as:      Me
 *         Who has access:  Anyone
 *     "Anyone" is what lets an unauthenticated visitor book. It does not expose
 *     your calendar: the only thing reachable is doPost below, which refuses
 *     anything that is not one of the slots in SLOTS.
 *
 *  5. Copy the /exec URL (it ends in /exec, not /dev) into
 *     REACT_APP_SCHEDULER_ENDPOINT — see frontend/src/data/scheduler.js.
 *
 * Changing the slots later: edit SLOTS, then Deploy → Manage deployments →
 * edit → Version: New version. A new DEPLOYMENT issues a new URL; a new VERSION
 * of the existing deployment keeps it. Edit frontend/src/data/scheduler.js to
 * match, or the page will offer a time this script refuses.
 */

/* ─────────────────────────────────────────────────────────── configuration */

/**
 * The bookable slots, and the only ones this script will accept.
 *
 * Written with an explicit +05:30 offset rather than as a local time, because
 * "what timezone is the script in" is a setting someone can change without
 * thinking about this file. An offset in the string cannot drift.
 *
 * India has no daylight saving, so +05:30 is correct year-round.
 */
var SLOTS = [
  '2026-09-28T12:00:00+05:30',
  '2026-09-28T13:00:00+05:30',
  '2026-09-28T15:00:00+05:30',
];

var DURATION_MINUTES = 15;

var EVENT_TITLE = 'VIKASANA Systems — introductory call';

var CAL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/* ──────────────────────────────────────────────────────── authorisation aid */

/**
 * Run this once from the editor, before deploying, to trigger the consent
 * screen. It books nothing — it performs the smallest real Calendar read so
 * that the scopes are exercised and granted.
 */
function authorise() {
  var probe = listBetween(new Date(), new Date(Date.now() + 60000));
  Logger.log('Authorised. Calendar reachable, %s event(s) in the next minute.', probe.length);
}

/* ───────────────────────────────────────────────────────────────── routing */

function doPost(e) {
  try {
    /* The page posts text/plain on purpose. A JSON content type would make the
       browser send a CORS preflight, and an Apps Script web app cannot answer an
       OPTIONS request — the booking would fail before it arrived. */
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json(book(body));
  } catch (err) {
    /* Never let a stack trace reach the page; it would be rendered to whoever
       is booking. Log it where only the owner can read it. */
    console.error(err && err.stack ? err.stack : err);
    return json({ ok: false, error: 'server', message: 'Something went wrong booking that slot.' });
  }
}

/**
 * Reports which slots are still free, so the page can grey out the taken ones
 * before anybody fills the form in. Read-only.
 */
function doGet() {
  var out = [];
  for (var i = 0; i < SLOTS.length; i++) {
    out.push({ slot: SLOTS[i], taken: isTaken(SLOTS[i]) });
  }
  return json({ ok: true, slots: out });
}

/* ───────────────────────────────────────────────────────────────── booking */

function book(body) {
  var slot = String(body.slot || '');
  var name = String(body.name || '').trim();
  var email = String(body.email || '').trim();
  var note = String(body.note || '').trim();

  /* The allow-list IS the authorisation. Without this check the endpoint would
     create an event at any time a caller named, which is a public write to your
     calendar. */
  if (SLOTS.indexOf(slot) === -1) {
    return { ok: false, error: 'slot', message: 'That is not an available slot.' };
  }
  if (!name) {
    return { ok: false, error: 'name', message: 'A name is required.' };
  }
  /* Deliberately loose. The address is confirmed by the invitation arriving,
     not by a pattern — and a rejected-but-valid address is worse than a typo. */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: 'email', message: 'That email address does not look right.' };
  }
  if (note.length > 2000) note = note.slice(0, 2000);

  /* Serialised against itself. Two people pressing Confirm in the same second
     would otherwise both pass isTaken() and both get the slot; the lock makes
     the check and the write one operation. 30s covers a slow Calendar call. */
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, error: 'busy', message: 'Someone else is booking right now — try again in a moment.' };
  }

  try {
    if (isTaken(slot)) {
      return { ok: false, error: 'taken', message: 'That slot has just been taken. Please choose another.' };
    }

    var start = new Date(slot);
    var end = new Date(start.getTime() + DURATION_MINUTES * 60 * 1000);

    var description =
      'Booked from vikasanasystems.tech/meet-scheduler\n\n' +
      'Name: ' + name + '\n' +
      'Email: ' + email + '\n' +
      (note ? '\nWhat they want to discuss:\n' + note + '\n' : '');

    var payload = {
      summary: EVENT_TITLE + ' — ' + name,
      description: description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: [{ email: email }],
      /* requestId must differ per conference or Google returns the SAME Meet
         link for two events. Derived from the slot, which is unique and also
         makes a retry of one booking idempotent. */
      conferenceData: {
        createRequest: {
          requestId: 'vikasana-' + slot.replace(/[^0-9]/g, ''),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      /* Marks the slot busy so isTaken() sees it, and shows on your own calendar
         as a real commitment rather than a free-time note. */
      transparency: 'opaque',
    };

    /* conferenceDataVersion=1 is what creates the Meet link. WITHOUT IT THE
       conferenceData ABOVE IS IGNORED SILENTLY — the event is created with no
       link and no error, which is the one failure nobody notices until the
       meeting starts. sendUpdates=all is what emails the invitation. */
    var res = fetchJson(CAL + '?conferenceDataVersion=1&sendUpdates=all', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Calendar insert failed: %s %s', res.status, res.text);
      return { ok: false, error: 'calendar', message: 'The calendar would not accept that booking.' };
    }

    return {
      ok: true,
      slot: slot,
      meetLink: (res.data && res.data.hangoutLink) || '',
      invited: true,
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Whether anything already occupies the slot.
 *
 * Checks the whole window rather than the start instant: a meeting that starts
 * five minutes in still collides, and an exact-start comparison would miss it.
 * Cancelled and transparent (free-time) events do not count.
 */
function isTaken(slot) {
  var start = new Date(slot);
  var end = new Date(start.getTime() + DURATION_MINUTES * 60 * 1000);
  var items = listBetween(start, end);

  for (var i = 0; i < items.length; i++) {
    if (items[i].status === 'cancelled') continue;
    if (items[i].transparency === 'transparent') continue;
    return true;
  }
  return false;
}

function listBetween(start, end) {
  var url =
    CAL +
    '?timeMin=' + encodeURIComponent(start.toISOString()) +
    '&timeMax=' + encodeURIComponent(end.toISOString()) +
    '&singleEvents=true&maxResults=10';

  var res = fetchJson(url, { method: 'get' });

  if (!res.ok) {
    /* Throw rather than return empty. An unreadable calendar must not be
       mistaken for a free one — that would double-book the slot. */
    throw new Error('Calendar read failed: ' + res.status + ' ' + res.text);
  }
  return (res.data && res.data.items) || [];
}

/* ──────────────────────────────────────────────────────────────── transport */

/**
 * One authorised JSON request. The token comes from the script's own
 * authorisation, so there is no key to store anywhere.
 */
function fetchJson(url, options) {
  var opts = options || {};
  opts.headers = { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
  /* Without this a 4xx throws, and the thrown message is less useful than the
     response body Google sends explaining what was wrong with the request. */
  opts.muteHttpExceptions = true;

  var response = UrlFetchApp.fetch(url, opts);
  var status = response.getResponseCode();
  var text = response.getContentText();

  var data = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    /* A non-JSON body only ever accompanies an error; status and text below
       carry everything the caller needs to log. */
  }

  return { ok: status >= 200 && status < 300, status: status, text: text, data: data };
}

/* ────────────────────────────────────────────────────────────────── output */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
