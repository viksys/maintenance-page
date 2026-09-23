/*
  DRISHTIKON — product page content.

  ---------------------------------------------------------------------------
  THIS PAGE IS NOT THE DOCUMENTATION
  ---------------------------------------------------------------------------
  The page answers four questions: what DRISHTIKON is, why it matters, what it
  does, and why the architecture is different. It is written to be understood
  in under a minute.

  The product guide answers everything else — how it works, which protocols,
  which specifications, which integration modes, what is fielded and what is
  planned. Those two layers stay separate. When a section here starts wanting
  a fifth sentence, that sentence belongs in the guide.

  The previous version of this file carried fifteen exports feeding fourteen
  sections, including a capability table and a specification block. Both were
  documentation living on a marketing page. They are gone from here and belong
  in the download.

  ---------------------------------------------------------------------------
  RULES CARRIED FROM DIRECTION
  ---------------------------------------------------------------------------
  1. NO STATUS LABELS. Nothing says live, active, GA, roadmap or in
     development. Every line below is true without a badge.

  2. NO UNVALIDATED COUNTS. No integration tallies, no platform counts, no
     percentages. Numbers on a product page are promises.

  3. AI IS NOT THE HEADLINE. Decision support is advisory and cannot hold
     command authority. It appears once, as a module, named for what it does.

  4. THE FIRST STATEMENT IS THE BUYER'S SENTENCE — "One operational interface
     for heterogeneous unmanned systems." The category name is the subtitle.

  5. EVERY SENTENCE EARNS ITS PLACE. One to three sentences per section. If a
     block does not carry a new idea, it comes out.

  Vocabulary is the company's own and is used sparingly: Common Operational
  Picture, Common Data Model, adapter layer, command authority, safety gate,
  mission replay, heterogeneous systems.
*/

/* ── Hero ─────────────────────────────────────────────────────────────── */

/* --- The platform section --------------------------------------------------
   What the product does, as a numbered index beside one large figure.

   THE ORDER IS THE MISSION, not a ranking. Planning, then control, then the
   data that informs it, then the assistance, then the management of it while
   it runs, then the domains it spans. A reader going 01 to 06 walks the same
   path an operator does.

   Six items, no more. The layout puts them against a single tall figure, and
   the figure sets the height — a seventh would either shrink the panel or
   leave the list running past the bottom of it. */
export const PLATFORM = {
  eyebrow: 'THE PLATFORM',
  /* The architecture figure. It replaced the square line schematic that used
     to sit beside this list: the schematic said "many systems, one link, one
     operator" and nothing more, where this states the whole path — what
     connects, what it connects into, and what the operator gets out of it.
     Drawn as vector artwork at 4K and delivered at 2560px; the original and
     its editable source are in _graphics/ at the repository root.

     Kept deliberately sparse — five platform families rather than ten
     individual systems, five outcomes rather than eight, and no title block
     or footer inside the drawing: the page around it already says whose it is
     and what it is called. The figure has to be read at a glance, not
     studied. */
  figure: {
    image: '/assets/img/vikasana-architecture.webp',
    /* Shortened from 394 characters on 23 September 2026: the copy check
       measures alt text against the site's 260-character paragraph limit, and
       an alt that recites all nine labels in the drawing is a list read aloud,
       not a description of the picture. It names the three columns and lets
       the caption beneath carry the rest. */
    alt:
      'VIKASANA system architecture: air, ground, surface and sensor platforms '
      + 'connect into the VIKASANA operating layer — the GCS-X console, mission '
      + 'tablet and ECM-X edge node — which delivers unified command and '
      + 'real-time mission intelligence.',
    caption: 'PLATFORMS & SENSORS · VIKASANA OPERATING LAYER · OPERATIONAL OUTCOME',
  },
  heading: 'Built for the mission.',
  lead:
    'From mission planning to execution, DRISHTIKON combines a common '
    + 'operational picture, real-time system data, AI-assisted planning and '
    + 'coordinated control. Missions can be managed across multiple platforms '
    + 'and domains from a single software environment.',
  items: [
    /* `icon` names a glyph in PLATFORM_ICONS (pages/Drishtikon.js); `wide`
       makes the card take two of the grid's four columns. The two wide cards
       are the two broadest claims, so the grid's shape follows the copy. */
    { t: 'Mission Planning', d: 'Plan objectives, routes, tasks and operating areas.', icon: 'layers', wide: true },
    { t: 'Multi-Platform Control', d: 'Coordinate compatible UAVs, UGVs, USVs and surveillance systems.', icon: 'autonomy' },
    { t: 'Sensor Fusion', d: 'Bring data from multiple sources into one operational picture.', icon: 'isr' },
    { t: 'AI-Assisted Operations', d: 'Support planning, analysis and operator decision-making.', icon: 'cpu' },
    { t: 'Real-Time Mission Management', d: 'Monitor assets, tasks and mission status as operations unfold.', icon: 'shield' },
    { t: 'Multi-Domain', d: 'Coordinate operations across air, ground and maritime systems.', icon: 'globe', wide: true },
  ],
  closing: 'One mission. Multiple systems. One command environment.',
};

export const HERO = {
  /* 'MISSION SOFTWARE' until 3 September 2026. The page's own copy rules cap
     "mission software" at zero uses — it is one of the phrases the brief calls
     worn out — and the eyebrow was spending the whole allowance before the
     body had said anything. 'SOFTWARE' also matches the section this page
     lives in, /software, which the eyebrow's job is to name. */
  eyebrow: 'SOFTWARE',
  title: 'DRISHTIKON',

  /* The category, stated plainly above the product's own description. It sits
     in the lower-left of the plate as a two-line block: what this class of
     thing is, then what this particular one is called. */
  kicker: 'COMMAND AND CONTROL',
  subtitle: 'Universal Ground Control & Interoperability Platform',

  /* TWO PARAGRAPHS, IN ORDER OF COMMITMENT. The first is the one-sentence
     definition someone repeats after leaving the page. The second is the
     detail that earns it — the platform types, the vendor spread, and what
     lands in the single picture.

     THE FIRST LINE IS FIXED AND IS CHECKED. scripts/check-drishtikon-copy.js
     asserts it byte for byte, because it is rule 4 of this file's own doctrine
     and the first thing anyone reads. A previous edit replaced it with
     "AI-powered mission software that integrates and controls heterogeneous
     systems across fleets and domains…" and moved the original into the second
     paragraph as a clause. Three rules broke at once and none of them were
     seen, because nothing ran the checker: "AI-powered" is banned vocabulary,
     "mission software" is capped at zero uses, and the statement itself is
     required. Do not paraphrase this line. If it genuinely has to change,
     change it in the checker in the same commit. */
  body: [
    'One operational interface for heterogeneous unmanned systems.',
    'DRISHTIKON gives operators one interface for UAVs, UGVs, USVs and '
    + 'surveillance systems from multiple vendors. Sensor feeds, asset status, '
    + 'planning and command workflows arrive in a single operational picture — '
    + 'observe, plan, coordinate, command, review.',
  ],

  /* The operating lifecycle, as five words. It is the page's table of
     contents: every section below is one of these, and the second paragraph
     above ends by naming them in the same order. */
  lifecycle: ['Observe', 'Plan', 'Coordinate', 'Command', 'Review'],
};

/*
  The full product guide.

  ONE FLAG CONTROLS THE PAGE'S SECOND-STRONGEST CALL TO ACTION. While
  `published` is false the button asks for the guide and routes to contact;
  when the PDF is dropped at the path below, flip it to true and the same
  button becomes the download. Nothing else changes.

  It is written this way because the alternative — pointing a prominent
  DOWNLOAD button at a file that is not there — produces a 404 for the exact
  reader the button exists to serve, and the defect is invisible until someone
  clicks it.
*/
export const PRODUCT_GUIDE = {
  published: false,
  href: '/assets/docs/DRISHTIKON-Product-Guide.pdf',
  labelWhenPublished: 'Download Full Product Guide',
  labelWhenPending: 'Request Full Product Guide',
};

/* ── 01 · The product in one glance ───────────────────────────────────── */

export const GLANCE = {
  heading: ['One console.', 'Multiple platforms.'],
  lead:
    'DRISHTIKON brings compatible unmanned systems into a common operational picture for mission planning, fleet management and command.',
  blocks: [
    { icon: 'globe', t: 'Common Operational Picture', d: 'See the fleet in one view.' },
    { icon: 'isr', t: 'Mission Planning', d: 'Plan and manage missions.' },
    { icon: 'layers', t: 'Fleet Management', d: 'Monitor assets, health and mission state.' },
    { icon: 'shield', t: 'Command', d: 'Control supported platforms through validated interfaces.' },
  ],
};

/* ── 02 · Architecture ────────────────────────────────────────────────── */

export const ARCHITECTURE = {
  heading: ['Different platforms.', 'One operational language.'],
  lead:
    'An adapter layer translates each platform’s native protocol into a Common Data Model, so the operator works with one vocabulary rather than one per vendor.',
  /* Rendered as the vertical flow diagram. `note` is the one-line gloss shown
     beside each stage — short enough to read while scrolling past. */
  stages: [
    { t: 'Platforms', note: 'Native protocols, unchanged.' },
    { t: 'Adapter Layer', note: 'Translation per platform.' },
    { t: 'Common Data Model', note: 'One normalized representation.' },
    { t: 'DRISHTIKON', note: 'Picture, planning, command.' },
    { t: 'Operator', note: 'One interface.' },
  ],
};

/* ── 03 · Command ─────────────────────────────────────────────────────── */

export const COMMAND = {
  heading: ['Command with control built in.'],
  lead:
    'Every supported command passes through authority and safety validation before it reaches a platform.',
  chain: ['Intent', 'Validate', 'Safety Gate', 'Command'],
  footnote: 'Human authority remains in control.',
};

/* ── 04 · Modular ─────────────────────────────────────────────────────── */

export const MODULAR = {
  heading: ['Built to extend.'],
  lead:
    'Adapters, plugins and mission-specific capabilities attach to the core without changing the operational environment beneath them.',
  /* What the modules attach to. Drawn as the solid bar BENEATH them — see
     the note at the markup in pages/Drishtikon.js. */
  core: {
    name: 'DRISHTIKON CORE',
    note: 'THE OPERATIONAL ENVIRONMENT · UNCHANGED BY WHAT ATTACHES TO IT',
  },
  modules: [
    { t: 'Mission', d: 'Planning and mission workflows.' },
    { t: 'Fleet', d: 'Asset state, health and availability.' },
    { t: 'Payload', d: 'Supported sensors and payloads.' },
    { t: 'Analytics', d: 'Advisory decision support.' },
    { t: 'Training', d: 'Replay-based review and instruction.' },
  ],
};

/* ── 05 · Field ───────────────────────────────────────────────────────── */

export const FIELD = {
  heading: ['Built for real operations.'],
  cards: [
    {
      t: 'Degraded networks',
      d: 'Designed for distributed and constrained operations.',
    },
    {
      t: 'Offline mission configuration',
      d: 'Mission configurations can be packaged and transferred.',
    },
    {
      t: 'Audit & replay',
      d: 'Mission activity can be reviewed and reconstructed.',
    },
  ],
};

/* ── 06 · Integration, guide, closing ─────────────────────────────────── */


export const GUIDE = {
  heading: 'Go deeper.',
  lead:
    'The architecture, capabilities, interfaces and technical specifications of DRISHTIKON.',
};

/*
  Media briefs.

  Each slot states its subject, treatment and aspect ratio so the person
  producing the asset infers nothing from surrounding copy, and so an unfilled
  slot reads as unfinished rather than as a design choice. No product
  screenshots are invented: where the real interface does not exist yet, the
  slot describes what it must show.
*/
export const MEDIA = {
  hero: {
    ratio: '16/9',
    label: '[ DRISHTIKON HERO UI — 16:9 ]',
    brief:
      'The operator console at rest: common operational picture centre, asset list left, mission panel right. Real interface, no device frame, no gradient wash. This is the product, not decoration.',
  },
  /* The console plate that used to open section 01 is gone: the architecture
     drawing in PLATFORM.figure contains the console, and the page was showing
     it twice. What survives is the caption, which qualifies that drawing. */
  picture: {
    caption: [
      'MULTI-VENDOR', 'MULTI-DOMAIN', 'UNIFIED CONTROL',
      'INTEGRATED DATA', 'REAL-TIME AWARENESS',
    ],
  },
  /* The operations figure, supplied. Three DRISHTIKON views in one render:
     the asset list, a vehicle's own page, and the live mission map with the
     swarm and quick-action panels. The render arrived on black; the flat
     ground was removed rather than repainted, so the file carries an alpha
     channel and the band behind it shows through — the same treatment as the
     architecture drawing in section 01. 2000x1415. */
  operations: {
    image: '/assets/img/drishtikon-ops.webp',
    alt:
      'Three DRISHTIKON views: the asset list with UAVs, UGVs, USVs and fixed '
      + 'posts; a single vehicle\'s overview with telemetry and its command '
      + 'actions; and the live mission map with active missions, swarm state '
      + 'and quick actions.',
  },
};
