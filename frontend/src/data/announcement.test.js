/*
  Tests for the announcement's expiry.

  The band on the homepage is there because of isLive(), and it goes away
  because of isLive() — no deploy, no editor, no reminder. That makes the
  boundary this function draws the only thing standing between the front page
  and a claim that stopped being true overnight, so it is worth asserting rather
  than reasoning about.

  THE IST BOUNDARY IS THE POINT OF THESE TESTS. Comparing in UTC retires the
  banner at 05:30 on the closing morning in the one timezone that matters for an
  event in Bengaluru, which is a plausible bug that no amount of looking at the
  function would catch — both versions read correctly.
*/

import { ANNOUNCEMENT, isLive } from './announcement';

/* The closing day, as the record states it. Read from the record rather than
   written out again: a test that hard-codes the date passes against its own
   copy of it after the record is replaced. */
const CLOSING = ANNOUNCEMENT.through;

describe('ANNOUNCEMENT', () => {
  it('states a closing date as a plain calendar date', () => {
    expect(CLOSING).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('carries a label and a message', () => {
    expect(ANNOUNCEMENT.label.length).toBeGreaterThan(0);
    expect(ANNOUNCEMENT.text.length).toBeGreaterThan(0);
  });
});

describe('isLive', () => {
  it('is live well before the closing date', () => {
    expect(isLive(new Date(`${CLOSING}T00:00:00Z`))).toBe(true);
  });

  /* 23:59 IST on the closing day is 18:29Z the same day. The band is still up:
     the summit has not closed for anyone standing at it. */
  it('is live at the last minute of the closing day in IST', () => {
    expect(isLive(new Date(`${CLOSING}T18:29:00Z`))).toBe(true);
  });

  /* 00:01 IST the next morning is 18:31Z on the closing day. Down. */
  it('has expired one minute into the next IST day', () => {
    expect(isLive(new Date(`${CLOSING}T18:31:00Z`))).toBe(false);
  });

  /*
    The regression this function exists to avoid: a UTC-dated comparison is
    false by 06:00Z on the closing day, which is 11:30 in Bengaluru.
  */
  it('is still live during the closing day in Bengaluru, not only before dawn', () => {
    expect(isLive(new Date(`${CLOSING}T06:00:00Z`))).toBe(true);
    expect(isLive(new Date(`${CLOSING}T12:00:00Z`))).toBe(true);
  });

  it('has expired a week later', () => {
    const week = Date.parse(`${CLOSING}T00:00:00Z`) + 7 * 24 * 60 * 60 * 1000;
    expect(isLive(new Date(week))).toBe(false);
  });

  /* An unparseable clock is not a reason to show a stale claim. */
  it('treats an invalid date as expired', () => {
    expect(isLive(new Date('not a date'))).toBe(false);
  });
});
