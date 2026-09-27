/*
  Routes that exist and are served, but are not published.

  ─────────────────────────────────────────────────────────────────────────────
  WHY THIS IS A FILE AND NOT A LITERAL IN EACH SCRIPT
  ─────────────────────────────────────────────────────────────────────────────

  Two scripts have to agree about this list, and they disagree by default:

    generate-seo.js   harvests every literal <Route> in App.js into sitemap.xml.
                      A hidden route would publish itself.
    check-links.js    asserts that every route IS in sitemap.xml, and reports
                      NOT IN SITEMAP for anything missing.

  So excluding a route from the sitemap without telling the link checker turns a
  deliberate omission into a build failure, and the obvious fix — deleting the
  assertion — would lose the check that catches a genuinely forgotten page. Both
  read this list instead.

  A route named here is STILL PRERENDERED. That is the point: it must answer
  HTTP 200 when someone opens the link they were sent. GitHub Pages has no
  rewrite rule, so a route with no built directory falls through to 404.html,
  which renders the app but answers 404.

  ─────────────────────────────────────────────────────────────────────────────
  THIS IS NOT ACCESS CONTROL
  ─────────────────────────────────────────────────────────────────────────────

  Unlisted is not private. The route is in the JavaScript bundle, which is
  public, so the URL is discoverable by anyone who reads it. Everything here is
  about not ADVERTISING the page — keeping it out of the sitemap, out of search
  results and out of the navigation. If a page needs to be restricted, that has
  to be enforced by whatever it talks to, not by leaving it off a list.

  A route added here must also carry <Seo noindex> in its component, and nothing
  in the header, the footer or /site-map may link to it.
*/

const HIDDEN_ROUTES = new Set([
  /* Booking page for a specific set of interview slots. Shared by direct link
     only. See src/pages/MeetScheduler.js and docs/meet-scheduler.gs. */
  '/meet-scheduler',
]);

module.exports = { HIDDEN_ROUTES };
