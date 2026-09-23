/*
  SEO / entity registry — single source of truth for page metadata.

  Consumed by:
    - src/components/Seo.js   (runtime <head> management)
    - src/pages/*Detail.js    (detailMeta, for the data-driven detail routes)
    - src/data/searchIndex.js (ROUTES, for the site search index)
    - scripts/generate-seo.js (sitemap.xml + static prerendered head tags)

  Principles:
    - Every route has a unique, human-written title and description.
    - Descriptions read as sentences a person would want to see in a result,
      not keyword lists. Entity coverage comes from writing accurately about
      the subject, not from repetition.
    - No unverifiable superlatives ("first", "only", "largest", "best").

  This module must not import anything. Two reasons, both load-bearing:
  scripts/generate-seo.js evaluates this file directly in Node at build time,
  where a bundler alias like '@/components/Icon' cannot be resolved; and it is
  reached from the application shell, so an import of a data module would pull
  every page's content into the first chunk a visitor downloads. Metadata for
  the data-driven routes is derived by detailMeta() from a record the caller
  already holds, not by importing the data modules here.
*/

export const SITE = {
  name: 'VIKASANA Systems',
  legalName: 'VIKASANA Systems Private Limited',
  url: 'https://vikasanasystems.tech',
  logo: 'https://vikasanasystems.tech/assets/img/logo.webp',
  ogImage: 'https://vikasanasystems.tech/assets/img/og-card.jpg',
  email: 'info@vikasanasystems.tech',
  locality: 'Mangaluru',
  region: 'Karnataka',
  country: 'India',
  founded: '2026',
  /* Empty by direction: there is no published social presence, and
     Seo.js's setMeta() drops the twitter:site tag entirely when this is
     falsy rather than emitting content="". twitter:card, :image and :title
     stay — those format a shared link, they do not claim an account. */
  twitter: '',
  description:
    'VIKASANA Systems is a software-defined, hardware-enabled defence technology company building command and control, interoperability, and edge-intelligence software for autonomous defence systems. Based in Mangaluru, Karnataka, India.',
};

/*
  The default social card.

  A dedicated 1200×630 JPEG rather than one of the page images: card renderers
  crop to that ratio and several of them still refuse WebP, and every raster
  asset on the site is now WebP. The dimensions live here because they are
  declared to crawlers in og:image:width/height — a size we do not know is a
  size we must not assert, so anything else is published without them.
*/
export const SOCIAL_CARD = {
  url: SITE.ogImage,
  width: '1200',
  height: '630',
  alt: 'VIKASANA Systems — mission systems for autonomous defence',
};

/* Site-relative paths are stored throughout the data modules; crawlers require
   absolute URLs in og:image and friends. Already-absolute values pass through
   so a caller can point at an external asset. */
export function absoluteUrl(value) {
  if (!value) return '';
  const v = String(value).trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `${SITE.url}${v.startsWith('/') ? '' : '/'}${v}`;
}

/*
  The one normal form for a path.

  sitemap.xml lists /company. A visitor can arrive at /company/, /Company, or
  /company?utm_source=x, and a canonical tag that echoes the address bar
  declares each of those a separate URL — which is the duplication the canonical
  tag exists to prevent. Normalising here means the canonical, og:url and the
  ROUTES lookup all agree with the sitemap: lower case, no query, no fragment,
  no repeated slashes, and no trailing slash except at the root.
*/
export function canonicalPath(pathname) {
  const raw = pathname == null ? '/' : String(pathname);
  const bare = raw.split('#')[0].split('?')[0].toLowerCase().replace(/\/{2,}/g, '/');
  return bare.replace(/\/+$/, '') || '/';
}

/* Titles are suffixed with the brand automatically; keep the `title` field short. */
const suffix = (t) => (t ? `${t} | VIKASANA Systems` : 'VIKASANA Systems');

/*
  Route metadata. `type` selects the schema emitted by <Seo>:
    website | organization | product | service | article | collection | faq | legal
*/
export const ROUTES = {
  '/': {
    title: 'Mission Systems for Autonomous Defence',
    description:
      'VIKASANA Systems builds the command, control, interoperability, and edge-intelligence software — and the hardware to run it in the field — so heterogeneous autonomous systems operate as one coordinated force. Engineered in Mangaluru, India.',
    type: 'website',
    priority: 1.0,
  },

  /* --- Platforms ---------------------------------------------------------- */
  '/products/platform': {
    title: 'VIKASANA Control — Universal Command & Control',
    description:
      'VIKASANA Control is a universal command and control platform for heterogeneous unmanned systems, and the home of DRISHTIKON, a universal ground control and mission management platform built around interoperability and human authority.',
    type: 'product',
    breadcrumb: [['Products', '/products/platform'], ['VIKASANA Control', '/products/platform']],
    priority: 0.9,
  },
  '/products/field-station': {
    title: 'VIKASANA Edge — Tactical Edge Computing',
    description:
      'VIKASANA Edge brings distributed compute, local sensor fusion, and mesh communications to the tactical edge, so a unit stays functional when the link back to command is degraded or unavailable.',
    type: 'product',
    breadcrumb: [['Products', '/products/platform'], ['VIKASANA Edge', '/products/field-station']],
    priority: 0.9,
  },
  '/products/handheld': {
    title: 'VIKASANA CORE | AI-Enabled Command & Control for Multi-Domain Defence',
    description:
      'VIKASANA CORE is a multi-domain command and control platform for UAVs, UGVs, USVs and surveillance systems, combining sensor fusion, AI-enabled decision support, fleet management and distributed mission operations.',
    type: 'product',
    breadcrumb: [['Products', '/products/platform'], ['VIKASANA Core', '/products/handheld']],
    priority: 0.9,
  },


  /* --- Indexes ------------------------------------------------------------ */

  '/hardware': {
    title: 'Mission Computing Hardware',
    description:
      'The Rugged Mission PC, Tactical Tablet, and Edge Compute Module — purpose-built rugged hardware engineered to run the DRISHTIKON command-and-control stack in the field. Hardware built only where mission software performance depends on it.',
    type: 'collection',
    priority: 0.8,
  },


  /* --- Knowledge / editorial ---------------------------------------------- */
  '/knowledge': {
    title: 'Defence Technology Knowledge Base',
    description:
      'Clear definitions of the terms used across autonomous defence: ground control stations, command and control software, mission management, tactical edge computing, sensor fusion, multi-domain operations, and software-defined defence.',
    type: 'faq',
    priority: 0.9,
  },

  /* --- Company ------------------------------------------------------------ */
  '/company': {
    title: 'About VIKASANA Systems',
    description:
      'VIKASANA Systems is an indigenous defence technology company building the coordination layer above unmanned platforms — command, control, interoperability, and edge intelligence — from Mangaluru, Karnataka.',
    type: 'organization',
    priority: 0.9,
  },
  '/careers': {
    title: 'Careers — Build Mission Systems from Mangaluru',
    description:
      'Engineering roles in defence software, autonomy, embedded systems, and computer vision. Build mission-critical systems from Mangaluru, on India’s western coastline.',
    type: 'website',
    priority: 0.8,
  },
  '/software/drishtikon': {
    title: 'DRISHTIKON — Universal Ground Control & Interoperability Platform',
    description:
      'DRISHTIKON is VIKASANA’s flagship product inside the Control platform — a vendor-neutral command-and-control layer that lets heterogeneous UAV fleets operate through one common operational framework instead of one control station per vendor.',
    type: 'product',
    breadcrumb: [['Products', '/products/platform'], ['DRISHTIKON', '/software/drishtikon']],
    priority: 0.9,
  },

  /* The three VIKASANA Edge hardware devices. Titles carry the product name
     and the model designation, because procurement searches for one and
     operators search for the other. Descriptions state what the device is for,
     not what it is certified to — specifications are provisional and the pages
     say so. */
  '/hardware/gcs-x-l': {
    title: 'Rugged Mission PC (GCS-X-L) — Portable Operator Console',
    description:
      'The Rugged Mission PC is a portable operator console under VIKASANA Edge, engineered to run the full DRISHTIKON command-and-control stack on-device — built for heat, vibration, dust, intermittent power, and drop survival.',
    type: 'product',
    breadcrumb: [['Hardware', '/hardware'], ['Rugged Mission PC', '/hardware/gcs-x-l']],
    priority: 0.85,
  },
  '/hardware/gcs-x-h': {
    title: 'Tactical Tablet (GCS-X-H) — Rugged Handheld Command',
    description:
      'The Tactical Tablet is a ruggedised handheld under VIKASANA Edge, carrying the same DRISHTIKON command layer as the console in a form factor built for forward and dismounted operators.',
    type: 'product',
    breadcrumb: [['Hardware', '/hardware'], ['Tactical Tablet', '/hardware/gcs-x-h']],
    priority: 0.85,
  },
  '/hardware/ecm-x': {
    title: 'Edge Compute Module (ECM-X) — Headless Tactical Compute',
    description:
      'The Edge Compute Module is a headless, mountable compute node under VIKASANA Edge, running sensor fusion, inference, and mission processing at the point of collection with no reachback dependency.',
    type: 'product',
    breadcrumb: [['Hardware', '/hardware'], ['Edge Compute Module', '/hardware/ecm-x']],
    priority: 0.85,
  },
  /* The contact page. It answers where-we-are as well, but it is named and
     addressed for the question people actually come with.

     Moved from '/locations' on 23 September 2026, because a link labelled
     Contact Us that puts "locations" in the address bar reads as a
     misdirect. /locations redirects here — see the note in App.js.

     Priority 0.8, raised from 0.6: with the old /contact and /talk-to-sales
     retired, this is the site's only enquiry surface. */
  '/contact': {
    title: 'Contact Us',
    description:
      'For all queries and information, write to VIKASANA Systems at info@vikasanasystems.tech. Based in Mangaluru, Karnataka, with engineering, integration, and operations in one place.',
    type: 'organization',
    priority: 0.8,
  },

  /* --- Legal -------------------------------------------------------------- */
  '/privacy-policy': {
    title: 'Privacy Policy',
    description:
      'How VIKASANA Systems Private Limited collects, uses, maintains, and protects your information, and the rights available to you.',
    type: 'legal',
    priority: 0.3,
  },
  '/cookie-policy': {
    title: 'Cookie Policy',
    description:
      'How VIKASANA Systems Private Limited uses cookies and similar technologies, the categories in use, and how to manage or withdraw consent.',
    type: 'legal',
    priority: 0.3,
  },
  '/security-policy': {
    title: 'Security Policy & Responsible Disclosure',
    description:
      'How to report a security vulnerability to VIKASANA Systems: responsible disclosure process, security contact, safe harbor statement, and our response process.',
    type: 'legal',
    priority: 0.5,
  },
  '/terms-of-use': {
    title: 'Terms of Use',
    description:
      'Terms governing access to and use of the VIKASANA Systems website, alongside our privacy and cookie policies.',
    type: 'legal',
    priority: 0.2,
  },
  '/site-map': {
    title: 'Site Map',
    description:
      'A complete index of every public page on the VIKASANA Systems website, organised by products, company, resources, and legal.',
    type: 'collection',
    priority: 0.4,
  },
};

/*
  The data-driven route families. There is one: /hardware.

  ROUTES above covers the pages whose copy is written by hand. Anything under a
  detail index is generated from a data module instead, so the registry and the
  rendered page cannot disagree.

  This table once described seven families and fifty-six records. Six of those
  families and the eight records of the seventh were placeholder content for
  products the company does not build, and were removed. The mechanism is kept
  at one family rather than collapsed into a special case, because the cost of
  generality here is a four-line object and the cost of un-collapsing it later
  is every consumer.

  `label` and `index` are the breadcrumb text and the index page the family
  hangs off; `type` selects the schema, matching the vocabulary used by ROUTES.
*/
export const DETAIL_SECTIONS = {
  hardware: { label: 'Hardware', index: '/hardware', type: 'product' },
};

/* A title written as a sentence ends in a full stop. In a <title> the stop sits
   directly before the brand separator — "Collection is not the constraint. |
   VIKASANA Systems" — where it does nothing, so it is dropped here rather than
   by editing the copy the page displays. */
const trimTitle = (t) => String(t == null ? '' : t).trim().replace(/\.+$/, '');

/*
  Metadata for one detail page, derived from the record the page already holds.

  A detail page reads its item from the data module, then spreads the result of
  this call into <Seo>:

    const item = getHardwareProduct(slug);
    return <Seo {...detailMeta({ section: 'hardware', ...item })} />;

  The summary field is read through a chain of spellings — description, summary,
  excerpt, intro, lead. Only hardware.js feeds this today, and its records carry
  `intro`; the rest of the chain is tolerance for a second data module arriving
  with its own vocabulary, so a caller never has to rename a field to be read.

  Precedence is: what the caller passes, then a hand-written ROUTES entry for
  the same path, then the record. The three devices are written by hand as well
  as generated, and written copy beats derived copy, so calling this from those
  pages is safe rather than a downgrade. Adding a ROUTES entry for any other
  detail route takes effect the same way, with no change here.

  Returns {title, description, type, image, breadcrumb}. `description` is left
  undefined when the record carries nothing usable, so <Seo> falls through to
  its own defaults rather than being handed the boilerplate. An unrecognised
  section or a missing slug returns an empty object: that is a wiring mistake
  rather than a content state, and falling back to the registry is better than
  publishing a breadcrumb that points at a page which does not exist.
*/
export function detailMeta(item) {
  const it = item || {};
  const section = DETAIL_SECTIONS[it.section];
  if (!section || !it.slug) return {};

  const url = `${section.index}/${it.slug}`;
  const written = ROUTES[url] || {};

  const name = trimTitle(it.name || it.title);
  const summary = it.description || it.summary || it.excerpt || it.intro || it.lead;

  return {
    title: written.title || name || undefined,
    description: written.description || summary || undefined,
    type: it.type || written.type || section.type,
    /* The item's own image, so a shared card is the fallback rather than the
       rule. <Seo> makes it absolute and declares dimensions only for the
       default card, whose size it knows. */
    image: it.image || written.image || SOCIAL_CARD.url,
    breadcrumb: written.breadcrumb || [
      [section.label, section.index],
      [name || it.slug, url],
    ],
  };
}

/* Registry lookup. Normalised so /Company/ and /company resolve to the same
   entry rather than the second one silently falling through to the defaults. */
export function metaFor(pathname) {
  return ROUTES[canonicalPath(pathname)] || null;
}

export const pageTitle = suffix;

/* Hand-written routes, in registry order. Read by scripts/generate-seo.js when
   it builds sitemap.xml; detail routes are derived there from the data modules
   and appended. */
export const STATIC_ROUTES = Object.keys(ROUTES);
