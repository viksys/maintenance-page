/*
  Homepage content.

  Separated from the page for the same reason every other section of this site
  is: the layout should not have to be edited to change a sentence. Section
  order here matches section order on the page.

  Doctrine note (MASTER_CONTEXT §21, §23): nothing below states a capability
  beyond current integration state, and no product name is used to introduce
  the company.
*/

/* --- 1b. Ecosystem ---------------------------------------------------------
   The three things a visitor can actually go and look at: the software, and
   the two operator machines built to run it. Deliberately three, not the whole
   hardware line — the Edge Compute Module is headless and belongs on the
   hardware index, not in a row of operator-facing renders. Images are assets
   already in public/assets/img — this layout introduces no new art. */
/* One software product and the two machines it runs on.

   Two registers only, by direction: `t` is the product name, rendered
   uppercased by the card, and `d` is what it is in three or four words. The
   card carries nothing else.

   The prose sentence each entry used to hold (`body`) and the link label
   (`cta`) are both gone. The row is scanned, not read — three names and three
   tags compare at a glance, where three sentences have to be worked through
   one at a time — and the whole card is a link, so a label saying so was
   restating the affordance rather than adding one.

   Do not reintroduce a paragraph here without reworking the card: the caption
   is centred over the photograph, and prose would cover it.

   ---------------------------------------------------------------------------
   EACH CARD NOW SHOWS ITS OWN PRODUCT
   ---------------------------------------------------------------------------
   The three ecosystem-*.webp field photographs are gone. They were scenes
   rather than products — the GCS-X L card showed a tracked UGV, not the
   mission computer — and a reader had no way to connect the picture to the
   name set over it.

   Each card now carries the same plate its own page does: the DRISHTIKON
   console screen, the GCS-X L laptop, the GCS-X H tablet. `fit` is what makes
   that possible. The console render is a 3:2 screenshot on its own near-black
   ground and fills the card as a cover crop loses almost nothing of it. The
   two hardware renders are devices on a TRANSPARENT ground, and a cover crop
   would cut the corners off the hardware — they are contained instead, so the
   whole device is in frame and the card's own background shows through around
   it. */
export const ECOSYSTEM = [
  {
    id: 'drishtikon',
    t: 'DRISHTIKON',
    d: 'Mission Control Software',
    /* The console screens, TRANSPARENT — drishtikon-ops.webp is the same
       artwork as drishtikon-console1.webp with its black ground cut away, and
       that is the only reason this card matches its neighbours.

       Three things were tried here. -hd covered the card edge to edge, which
       made this card a full-bleed screenshot beside two renders floating on
       the card ground: three cards, two components. -console1 contained fixes
       the composition but not the ground — it is a black rectangle sitting on
       --night-2, and a straight edge across a large flat dark field is visible
       long before the two shades either side of it can be named. Only the
       transparent file has nothing to see at the join, which is exactly the
       property that makes the laptop and the tablet work. */
    image: '/assets/img/drishtikon-ops.webp',
    fit: 'contain',
    to: '/software/drishtikon',
  },
  {
    id: 'gcs-x-l',
    t: 'GCS-X L',
    d: 'Modular Mission Computer',
    /* The trimmed laptop render the product page uses — same plate, same
       crop. Transparent ground, so it is contained, not covered. */
    image: '/assets/img/hero-gcs-trim.webp',
    fit: 'contain',
    to: '/hardware/gcs-x-l',
  },
  {
    id: 'gcs-x-h',
    t: 'GCS-X H',
    d: 'Tactical Mission Controller',
    /* The tablet render the product page uses. Also transparent. */
    image: '/assets/img/hero-tab.webp',
    fit: 'contain',
    to: '/hardware/gcs-x-h',
  },
];

/* --- 1c. Why VIKASANA ------------------------------------------------------
   Four positions, not four features. Each is a statement about how the
   company builds, which is why none of them names a product. */
export const WHY_VIKASANA = [
  { n: '01', t: 'Software-Defined', d: 'Mission software is the foundation. Hardware delivers it where operations demand.' },
  { n: '02', t: 'Open Integration', d: 'Connect compatible multi-vendor systems through one operational environment.' },
  { n: '03', t: 'Built for Operations', d: 'Engineered for contested environments, degraded communications, and real missions — not demonstrations.' },
  { n: '04', t: 'Designed & Built in India', d: 'Sovereign mission software and mission computing developed for India’s defence ecosystem.' },
];

/* --- 2b. Capability domains ------------------------------------------------
   The seven-column band. `icon` is a key resolved to a component on the page
   rather than a component stored here, so this file stays content and imports
   no JSX.

   Maturity is stated inside each description rather than implied by inclusion
   in the row (MASTER_CONTEXT §23): air is the active focus, ground and
   maritime are architected and on the roadmap. Do not edit those qualifiers
   out — the row would then read as seven shipped domains. */
/* The `icon` key is the join to CAP_ICONS in pages/Home.js. Labels and copy
   change freely; these seven keys must not, or the icons move. */
export const CAPABILITIES = [
  { icon: 'air', label: 'Air', d: 'UAV command & coordination' },
  { icon: 'ground', label: 'Ground', d: 'UGV mission operations' },
  { icon: 'maritime', label: 'Maritime', d: 'USV mission control' },
  { icon: 'isr', label: 'ISR', d: 'Unified sensor fusion' },
  { icon: 'counter', label: 'Counter-UAS', d: 'Detection & response' },
  { icon: 'autonomy', label: 'Mission AI', d: 'Human-assisted decisions' },
  { icon: 'comms', label: 'Connectivity', d: 'Edge-ready communications' },
];

/* --- 2c. Integration ecosystem ---------------------------------------------
   Only logos already shipped in public/assets/img/logos. Nothing here is a
   claim of endorsement or partnership — these are the open standards and
   ecosystems the architecture integrates through.

   width/height are the INTRINSIC pixel dimensions of each file, read from the
   .webp headers rather than estimated. They are not optional decoration:
   LogoCarousel lays a `width: max-content` track and translates it by -50% of
   its own width, so a logo that measures zero until it decodes changes the
   distance a running marquee is travelling over. With the pair present the box
   is reserved from the true ratio and nothing moves when the image lands.

   They belong here, with the data, and LogoCarousel prefers them. The table it
   falls back to — keyed on src, in that file — exists only for logo lists that
   have not been given dimensions yet, and can be deleted once none remain.
   A file replaced at one of these paths must have its pair updated here. */
export const PARTNER_LOGOS = [
  { name: 'MAVLink', src: '/assets/img/logos/mavlink.webp', width: 437, height: 88 },
  { name: 'PX4', src: '/assets/img/logos/px4.webp', width: 640, height: 305 },
  { name: 'ArduPilot', src: '/assets/img/logos/ardupilot.webp', width: 640, height: 94 },
  { name: 'ROS', src: '/assets/img/logos/ros.webp', width: 416, height: 110 },
  { name: 'ATAK', src: '/assets/img/logos/atak.webp', width: 464, height: 506 },
];
