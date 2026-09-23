/*
  Search corpus.

  Built by deriving from the data modules that already drive the pages
  (hardware, FAQs,
  knowledge terms, SEO registry). Nothing here is a second copy of page copy —
  if a summary changes on a page, the index changes with it.

  Each document carries:
    id, type, title, url, breadcrumb, summary, body, tags, aliases

  `aliases` exist so operator vocabulary finds the right page: someone typing
  "GCS" should land on the ground control station.
*/

import { HARDWARE_LIST } from '@/data/hardware';
import { GENERAL_FAQ, CAREERS_FAQ } from '@/data/faqs';
import { ROUTES } from '@/data/seo';
import { prepare } from '@/lib/search';
import { faqAnchor, termAnchor } from '@/lib/slug';

/* Domain vocabulary — abbreviations and synonyms operators actually type. */
const ALIASES = {
  'sensor-fusion': ['fusion', 'data fusion', 'track correlation', 'multi sensor', 'tracking'],
  'edge-computing': ['edge', 'tactical edge', 'edge intelligence', 'on board compute', 'edge ai',
    'edge inference'],
  'mission-planning': ['planning', 'route planning', 'mission plan', 'tasking'],
  'fleet-management': ['fleet', 'asset management', 'fleet ops', 'readiness', 'availability'],
  interoperability: ['interop', 'open standards', 'vendor neutral', 'integration', 'mosa',
    'modular open systems'],
  /* The three built devices. People search the model code, the product name,
     and the generic category — all three have to resolve.

     "ground station", "control station" and "edge unit" were carried over from
     the retired hardware-module records so the generic vocabulary still finds a
     device. "drishtikon" deliberately did not come with them: it names the
     software platform, and /products/platform is where that search belongs. */
  'gcs-x-l': ['gcs-x-l', 'gcsxl', 'mission pc', 'rugged pc', 'rugged laptop', 'operator console',
    'command station', 'ground control station', 'ground station', 'control station', 'gcs'],
  'gcs-x-h': ['gcs-x-h', 'gcsxh', 'tactical tablet', 'rugged tablet', 'handheld', 'tablet',
    'dismounted'],
  'ecm-x': ['ecm-x', 'ecmx', 'edge compute module', 'edge compute', 'compute module',
    'edge unit', 'edge node', 'headless compute', 'edge server'],
  'counter-uas': ['cuas', 'c-uas', 'counter uas', 'counter drone', 'anti drone'],
};

const alias = (slug, extra = []) => [...(ALIASES[slug] || []), ...extra];

const flat = (v) => (Array.isArray(v) ? v.join(' ') : String(v || ''));

const DOCS = [];

/* ---- Platforms (top-ranked products) ------------------------------------ */
DOCS.push(
  {
    id: 'p-control', type: 'product', title: 'VIKASANA Control', url: '/products/platform',
    breadcrumb: 'Products / Platforms',
    summary: 'Universal command and control for heterogeneous unmanned systems. Home of DRISHTIKON, our universal ground control and mission management platform.',
    body: 'One operator experience across multiple UAV platforms instead of one control station per vendor. Vendor-neutral interoperability through documented interfaces. Safety-gated command with human authority retained. One common operational picture, one fleet dashboard, one audit trail.',
    tags: ['command', 'control', 'c2', 'ground control', 'drishtikon', 'platform'],
    aliases: ['drishtikon', 'c2', 'command and control', 'gcs', 'ground control station'],
  },
  {
    /* DRISHTIKON is a named product in its own right, not just a mention inside
       Control. Without its own entry, searching the product name surfaced the
       FAQ that happens to have it in the question title. */
    id: 'p-drishtikon', type: 'product', title: 'DRISHTIKON', url: '/products/platform',
    breadcrumb: 'Products / VIKASANA Control',
    summary: 'VIKASANA’s universal ground control and mission management platform — one operator interface across unmanned systems from multiple vendors.',
    body: 'Beneath the operator screen DRISHTIKON is an interoperability, mission-management, safety and common-data layer, architected around open interfaces and human authority rather than a single autopilot ecosystem. One framework across a mixed fleet.',
    tags: ['drishtikon', 'ground control station', 'gcs', 'mission management', 'flagship'],
    aliases: ['gcs', 'ground control station', 'universal ground control', 'control station', 'ugcs'],
  },
  {
    id: 'p-edge', type: 'product', title: 'VIKASANA Edge', url: '/products/field-station',
    breadcrumb: 'Products / Platforms',
    summary: 'Distributed compute, local sensor fusion, and mesh communications at the tactical edge, built to keep a unit functional when the link to command is degraded.',
    body: 'Local inference and sensor fusion run on the node rather than in a data centre it may not reach. Mesh communications keep units connected when the link is degraded. No hard dependency on connectivity. Data synchronises upward opportunistically.',
    tags: ['edge', 'compute', 'mesh', 'tactical', 'offline'],
    aliases: ['tactical edge computing', 'edge intelligence', 'edge compute'],
  },
  {
    id: 'p-core', type: 'product', title: 'VIKASANA Core', url: '/products/handheld',
    breadcrumb: 'Products / Platforms',
    summary: 'Mission management and battlefield intelligence — the Common Operational Picture, mission planning, and fleet management across the force.',
    body: 'One common operational picture across the force rather than a wall of disconnected feeds. Mission planning, fleet management, and cross-platform workflows. AI-assisted decision support that recommends while humans decide. Digital mission replay, audit and traceability.',
    tags: ['mission management', 'cop', 'intelligence', 'planning', 'fleet'],
    aliases: ['cop', 'common operational picture', 'mission management', 'mission intelligence'],
  },
);

/* ---- Hardware --------------------------------------------------------------- */
/* The three built devices, from the product registry — the only hardware the
   company ships, and the only hardware URLs that exist. */
HARDWARE_LIST.forEach((h) =>
  DOCS.push({
    id: `hw-${h.slug}`, type: 'product', title: `${h.name} (${h.model})`, url: `/hardware/${h.slug}`,
    breadcrumb: 'Products / Hardware',
    summary: h.card.summary,
    body: [h.intro, flat(h.bullets), h.subtitle].filter(Boolean).join(' '),
    tags: [h.card.kicker, 'hardware', 'mission computing'].filter(Boolean),
    aliases: alias(h.slug),
  })
);

/* ---- Knowledge base ------------------------------------------------------- */
const KNOWLEDGE = [
  ['Ground Control Station (GCS)', 'A ground control station is the system an operator uses to plan, command, and monitor an unmanned vehicle and its payloads.', ['gcs', 'ground station', 'control station']],
  ['Command and Control (C2)', 'Command and control is the exercise of authority over assigned forces and assets, and the systems that make that authority possible.', ['c2', 'command control']],
  ['Mission Management', 'The layer that plans, coordinates, and tracks a mission across its full lifecycle rather than flying a single vehicle moment to moment.', ['mission lifecycle']],
  ['Tactical Edge Computing', 'Processing data on or near the device that collected it, at the forward edge of operations, instead of sending it to a central data centre.', ['edge computing', 'edge']],
  ['Sensor Fusion', 'Combining data from multiple sensors into a single, more reliable picture than any one sensor could produce alone.', ['fusion', 'multi sensor']],
  ['Common Operational Picture (COP)', 'A single shared display of the operational situation, used by everyone involved so all parties work from the same information.', ['cop', 'shared picture']],
  ['Interoperability', 'The ability of systems from different manufacturers to work together without bespoke rework for every pairing.', ['interop', 'open standards']],
  ['Multi-Domain Operations (MDO)', 'Coordinating activity across more than one operational domain — air, land, sea, space, and cyber — as one effort.', ['mdo', 'multi domain']],
  ['ISR — Intelligence, Surveillance, Reconnaissance', 'The collection and processing of information about an operating environment in order to support decisions.', ['isr', 'surveillance', 'reconnaissance']],
  ['Software-Defined Defence', 'An approach where capability is delivered, changed, and upgraded primarily through software rather than through new physical platforms.', ['software defined', 'sdd']],
  ['Mission Planning', 'Defining objectives, routes, timings, payload tasking, and contingencies before an operation begins.', ['planning']],
  ['Safety Gating', 'Validating commands against defined safety rules before they reach a platform, so unsafe actions are blocked rather than discouraged.', ['safety gate', 'command validation']],
];

/* Deep-linked to the individual definition, not the page top. The anchor is
   generated by the same helper Knowledge.js uses to render the ids. */
KNOWLEDGE.forEach(([title, summary, aliases], i) =>
  DOCS.push({
    id: `kb-${i}`, type: 'knowledge', title, url: `/knowledge#${termAnchor(title)}`,
    breadcrumb: 'Knowledge Base',
    summary, body: '', tags: ['definition', 'glossary', 'knowledge base'], aliases,
  })
);

/* ---- FAQ ------------------------------------------------------------------
   FAQs are contextual: each set belongs to the page it is about, and search
   sends the user to where that content actually lives rather than funnelling
   everything to one page.

   Each entry deep-links to its individual question. The anchor comes from the
   same helper the FAQ component uses to render ids, so a destination cannot
   drift from the anchor that exists on the page. */
[
  [GENERAL_FAQ, '/company', 'Company / FAQ'],
  [CAREERS_FAQ, '/careers', 'Careers / FAQ'],
].forEach(([set, base, crumb]) =>
  set.forEach((f, i) =>
    DOCS.push({
      id: `faq-${crumb}-${i}`,
      type: 'faq',
      title: f.q,
      url: `${base}#${faqAnchor(f.q)}`,
      breadcrumb: crumb,
      summary: f.a,
      body: '',
      tags: ['faq', 'question'],
      aliases: [],
    })
  )
);

/* ---- Company, careers, legal and remaining routes -------------------------- */
const ROUTE_TYPE = {
  '/company': ['company', 'Company'],
  '/careers': ['company', 'Company'],
  '/contact': ['company', 'Company'],
  /* '/partners' and '/talk-to-sales' were here and are deleted. Their ROUTES
     entries are gone, so this loop would skip them anyway; the lines are
     removed rather than left as no-ops that read like live routes.

     '/contact' was in that list too, and is live again — it is the line
     directly above. The old Contact page is still deleted; the path was reused
     on 23 September 2026 for the page that had been at /locations, which the
     navigation already called Contact Us. See the note on the route in
     App.js. */
  '/knowledge': ['knowledge', 'Knowledge Base'],
  '/hardware': ['product', 'Products'],
  '/privacy-policy': ['legal', 'Legal'],
  '/cookie-policy': ['legal', 'Legal'],
  '/security-policy': ['legal', 'Legal'],
  '/terms-of-use': ['legal', 'Legal'],
  '/site-map': ['legal', 'Legal'],
};

/*
  Route-page aliases.

  A map rather than the chain of ternaries this used to be. Two entries was
  readable; a third made it a nested conditional that had to be re-parsed to
  add a fourth, and the vocabulary below is going to keep growing.

*/
const ROUTE_ALIASES = {
  '/careers': ['jobs', 'hiring', 'work with us', 'vacancies'],
};

Object.entries(ROUTES).forEach(([url, meta]) => {
  const mapped = ROUTE_TYPE[url];
  if (!mapped) return;
  const [type, crumb] = mapped;
  DOCS.push({
    id: `route-${url}`, type, title: meta.title, url,
    breadcrumb: crumb, summary: meta.description, body: '',
    tags: [crumb.toLowerCase(), 'page'],
    aliases: ROUTE_ALIASES[url] || [],
  });
});

/* Tokenised once at module load. */
export const SEARCH_INDEX = prepare(DOCS);
