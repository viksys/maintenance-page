/*
  /meet-scheduler — slots and endpoint.

  ─────────────────────────────────────────────────────────────────────────────
  THIS FILE IS THE DISPLAY COPY. docs/meet-scheduler.gs IS THE AUTHORITY.
  ─────────────────────────────────────────────────────────────────────────────

  The same three slots are written twice: here, to render them, and in SLOTS in
  docs/meet-scheduler.gs, which is the allow-list the backend checks a booking
  against. That duplication is deliberate — a browser cannot be trusted to say
  which times are bookable, so the server cannot take its word for it — but it
  does mean EDITING ONE WITHOUT THE OTHER IS A BUG. Change a slot here and the
  page offers a time the backend will refuse with "that is not an available
  slot"; change it there only and the page never offers it.

  If the two ever need to diverge, they should not: delete from here and have
  the page read the list from the endpoint's GET instead.
*/

/*
  An explicit +05:30 offset, not a local time. `new Date('2026-09-28T12:00')`
  is parsed in the VIEWER'S timezone, so a reader in London would be shown
  12:00 BST — a slot that does not exist. The offset pins the instant, and the
  formatters below decide how it is displayed.

  India has no daylight saving, so +05:30 holds year-round.
*/
export const SLOTS = [
  '2026-09-28T12:00:00+05:30',
  '2026-09-28T13:00:00+05:30',
  '2026-09-28T15:00:00+05:30',
];

export const DURATION_MINUTES = 15;

/*
  The deployed Apps Script /exec URL. Empty until it is deployed — see the
  header of docs/meet-scheduler.gs for the five steps.

  While it is empty the page says so plainly and does not render a form. A
  booking form that posts nowhere is worse than an honest "not open yet": the
  visitor believes they have a meeting, and nobody finds out until the meeting
  does not happen.
*/
export const ENDPOINT = process.env.REACT_APP_SCHEDULER_ENDPOINT || '';

export const SCHEDULER_READY = Boolean(ENDPOINT);

/* --------------------------------------------------------------- formatting */

/*
  Asia/Kolkata is named explicitly rather than relying on the viewer's zone,
  because the slot times are an IST commitment: that is the timezone the person
  on the other end of the call is in, and it is what the confirmation email will
  say.
*/
export function istTime(iso) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export function istDate(iso) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

/*
  The same instant in the viewer's own timezone, and the zone's name so they can
  tell whether it is the one they expect.

  Shown only when it differs from IST. For a reader already in India the line
  would repeat the time they just read, and a restatement of the obvious is how
  a reader learns to skip the line that matters.
*/
export function viewerTime(iso) {
  const d = new Date(iso);
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone === 'Asia/Kolkata') return null;

    const time = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);

    const label =
      new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
        .formatToParts(d)
        .find((p) => p.type === 'timeZoneName')?.value || zone;

    return `${time} ${label}`;
  } catch {
    /* A missing local rendering costs a convenience line. It must not cost the
       booking, so this never throws upward. */
    return null;
  }
}

/* Whether every slot is already in the past, which is the state this page ends
   up in permanently once the date passes. The page says so rather than offering
   times that cannot be booked. */
export function allSlotsPast(now = Date.now()) {
  return SLOTS.every((iso) => new Date(iso).getTime() <= now);
}
