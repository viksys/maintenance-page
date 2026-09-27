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
 * DEPLOYING IT — five steps, once
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  1. Go to https://script.google.com and create a new project. Paste this
 *     file over the contents of Code.gs.
 *
 *  2. Services (＋, left sidebar) → add "Google Calendar API" → identifier
 *     `Calendar`. THIS IS NOT OPTIONAL. CalendarApp, the simple service, cannot
 *     attach a Meet conference to an event; only the advanced service can, and
 *     a booking without a Meet link is not a booking.
 *
 *  3. Deploy → New deployment → type "Web app".
 *          Execute as:        Me
 *          Who has access:    Anyone
 *     "Anyone" is what lets an unauthenticated visitor book. It does not expose
 *     your calendar: the only thing reachable is doPost below, which refuses
 *     anything that is not one of the slots in SLOTS.
 *
 *  4. Authorise it when prompted. The warning screen is expected for a script
 *     that is not Google-verified — it is your own script.
 *
 *  5. Copy the /exec URL and put it in frontend/src/data/scheduler.js.
 *
 * To change the slots later, edit SLOTS and Deploy → Manage deployments → edit
 * → Version: New version. A new DEPLOYMENT gives a new URL; a new VERSION of the
 * existing deployment keeps it.
 */

/* ─────────────────────────────────────────────────────────── configuration */

/**
 * The bookable slots, and the only ones this script will accept.
 *
 * Written with an explicit +05:30 offset rather than as a local time, because
 * "what timezone is the script in" is a setting that can be changed by someone
 * who is not thinking about this file. An offset in the string cannot drift.
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

/* ───────────────────────────────────────────────────────────────── routing */

function doPost(e) {
  try {
    /* The page posts text/plain on purpose. A JSON content type would make the
       browser send a CORS preflight, and Apps Script has no way to answer an
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
     the check and the write one operation. 20s covers a slow Calendar call. */
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
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

    var event = Calendar.Events.insert(
      {
        summary: EVENT_TITLE + ' — ' + name,
        description: description,
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
        attendees: [{ email: email }],
        /* requestId must differ per conference or Google returns the SAME Meet
           link for two events. Derived from the slot, which is unique and is
           also what makes a retry of one booking idempotent. */
        conferenceData: {
          createRequest: {
            requestId: 'vikasana-' + slot.replace(/[^0-9]/g, ''),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        /* Marks the slot busy so isTaken() sees it, and so your own calendar
           shows it as a real commitment rather than a free-time note. */
        transparency: 'opaque',
      },
      'primary',
      {
        /* Without conferenceDataVersion:1 the conferenceData above is IGNORED
           SILENTLY — the event is created with no Meet link and no error. */
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      }
    );

    return {
      ok: true,
      slot: slot,
      meetLink: (event && event.hangoutLink) || '',
      /* The page tells the visitor to expect an invitation, so it needs to know
         whether one was actually sent rather than assuming. */
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

  var found = Calendar.Events.list('primary', {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: true,
    maxResults: 10,
  });

  var items = (found && found.items) || [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].status === 'cancelled') continue;
    if (items[i].transparency === 'transparent') continue;
    return true;
  }
  return false;
}

/* ────────────────────────────────────────────────────────────────── output */

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
