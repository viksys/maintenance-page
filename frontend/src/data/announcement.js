/*
  The one announcement the site is carrying, and the date it stops carrying it.

  ONE RECORD, NOT A LIST. Two announcements running at once is two things
  competing for the same strip of the homepage, and the answer to "which is more
  important" is a decision nobody wants to encode. When the next event comes,
  this record is replaced.

  ---------------------------------------------------------------------------
  IT EXPIRES BY ITSELF, AND THAT IS THE POINT
  ---------------------------------------------------------------------------
  "We are attending" is true for sixteen days and then it is a lie on the front
  page. A banner like this one is always removed late, because removing it is
  nobody's task and nothing breaks when it is missed — so `through` is honoured
  in code rather than written in a comment as a reminder to a future editor.

  The component reads isLive(); past the closing date it renders nothing and the
  band disappears without a deploy. Replacing the record is still the right
  thing to do — an expired record is dead weight — but the site does not depend
  on it happening on time.
*/

export const ANNOUNCEMENT = {
  /* The eyebrow. Short, because it sits on one line beside the message at every
     width, including a 360px phone. */
  label: 'On the road',

  /*
    THE MESSAGE IS ONE SENTENCE AND IT SCROLLS, so it has no second line to put
    a qualification on. Dates and venue are in it rather than beneath it.

    17–19 November 2026 at the Bangalore International Exhibition Centre, the
    29th edition. En dash in the date range, not a hyphen.
  */
  text: 'VIKASANA Systems is attending Bengaluru Tech Summit 2026 — 17–19 November, BIEC Bengaluru.',

  /*
    Last day the band is shown, inclusive, as a plain calendar date.

    Deliberately NOT an ISO timestamp. A `Z` instant would retire the banner
    mid-afternoon on the closing day for a reader in India, which is the one
    timezone that matters for an event in Bengaluru; see isLive() for how the
    boundary is drawn.
  */
  through: '2026-11-19',
};

/*
  Is the announcement still current?

  THE COMPARISON IS DRAWN IN IST, for a reason that is not stylistic. The build
  machine, the CDN and the reader are in three different timezones, and a UTC
  date would turn the banner off at 05:30 IST on the closing morning — while the
  summit is open and while the team is standing at it.

  +05:30 is hard-coded rather than read from the runtime: Intl's timezone data
  is not available in every environment this bundle runs in (the prerender step
  and the jsdom checks among them), and India has no daylight saving, so the
  offset is a constant and not an approximation.

  `now` is injectable so this is testable without touching the system clock.
*/
export function isLive(now = new Date()) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  /* End of the closing day in IST, expressed as a UTC instant: midnight UTC on
     the day after, minus the offset. */
  const endOfDayIst = Date.parse(`${ANNOUNCEMENT.through}T00:00:00Z`) + 24 * 60 * 60 * 1000 - IST_OFFSET_MS;
  const t = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(t)) return false;
  return t <= endOfDayIst;
}
