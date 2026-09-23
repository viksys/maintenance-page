import { useEffect, useId } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE, SOCIAL_CARD, absoluteUrl, canonicalPath, metaFor, pageTitle } from '@/data/seo';

/*
  Seo — per-route <head> management.

  Deliberately dependency-free (no react-helmet) so nothing is added to the
  bundle. It sets title, description, canonical, Open Graph, Twitter card and
  a per-page JSON-LD block, and cleans up its own nodes on unmount.

  Note on coverage: this runs in the browser, so it serves users, Googlebot and
  Bingbot (which render JavaScript). Crawlers that do NOT run JavaScript are
  served the equivalent tags statically by scripts/generate-seo.js at build
  time. Both paths read from the same registry in src/data/seo.js, so they
  cannot drift apart.

  Two instances can be mounted at once: App renders a route-level <Seo /> and a
  page may render a second one carrying bespoke schema. Everything written here
  is a document-level directive, so nothing may be *added* — each tag is either
  rewritten in place or removed. A tag that is only ever added goes stale on the
  next navigation, and a stale `noindex` removes a real page from the index.
*/

const MANAGED = 'data-seo-managed';
const LD_ID = 'vk-jsonld';
const INDEXABLE = 'index, follow, max-image-preview:large, max-snippet:-1';

/* Declared so a crawler is not left guessing from the bytes. Absent for an
   extension we do not recognise, which is better than a wrong claim. */
const IMAGE_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(MANAGED, 'true');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

function removeMeta(selector) {
  const el = document.head.querySelector(selector);
  if (el) el.remove();
}

/* Writes the tag when there is a value and removes it when there is not.
   index.html ships site-wide defaults for most of these; leaving one behind
   because this route has nothing to say would attribute the previous route's
   value to this one. */
function setMeta(selector, attrs, value) {
  if (value) upsertMeta(selector, attrs);
  else removeMeta(selector);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute(MANAGED, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/*
  Document-level state contributed by every mounted instance.

  `noindex` and the JSON-LD graph cannot be owned by a single component. The
  404 page sets noindex while the route-level <Seo> above it does not, and
  React runs the two effects in tree order, not in the order that would happen
  to give the right answer. Each instance registers what it wants under its own
  key and the tag is recomputed from the whole set, so unmounting withdraws a
  claim and ordering stops mattering.
*/
const noindexClaims = new Set();
const graphNodes = new Map();

function publishRobots() {
  upsertMeta('meta[name="robots"]', {
    name: 'robots',
    content: noindexClaims.size ? 'noindex, follow' : INDEXABLE,
  });
}

/* One <script> for the document, rewritten in place and identified by a stable
   id. Appending a script per graph node left several competing blocks behind on
   every navigation. The static Organization/WebSite graph in index.html carries
   no id and is deliberately left alone. */
function publishGraph() {
  /* Both instances read the same registry entry, so a page that renders its own
     <Seo> for bespoke schema derives the same WebPage node the route-level one
     already produced. Identical nodes are folded rather than published twice. */
  const seen = new Set();
  const graph = [...graphNodes.values()].flat().filter((node) => {
    const key = JSON.stringify(node);
    return seen.has(key) ? false : seen.add(key);
  });

  let el = document.getElementById(LD_ID);
  if (!graph.length) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.id = LD_ID;
    el.type = 'application/ld+json';
    el.setAttribute(MANAGED, 'true');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

/* Nodes arrive from callers with their own '@context', which was correct when
   each was its own script and is redundant inside a graph that declares one. */
function graphNode(node) {
  if (!node || typeof node !== 'object') return null;
  const clean = { ...node };
  delete clean['@context'];
  return clean;
}

/* Schema selected to match what the page actually is — never a type the
   content does not support. */
function buildSchema({ type, title, description, url, image, breadcrumb, schema }) {
  const graph = [];
  const org = { '@id': `${SITE.url}/#organization` };

  if (breadcrumb && breadcrumb.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        ...breadcrumb.map(([name, href], i) => ({
          '@type': 'ListItem',
          position: i + 2,
          name,
          item: `${SITE.url}${href}`,
        })),
      ],
    });
  }

  /* Every node below is identified by its name. A route with no registry entry
     and no title prop previously produced `name: undefined`, which serialises
     away and leaves an anonymous node claiming to be a Product or a WebPage.
     No name, no node — the breadcrumb above still stands on its own. */
  if (title) {
    if (type === 'product') {
      graph.push({
        '@type': 'Product',
        name: title,
        description,
        url,
        image,
        brand: { '@type': 'Brand', name: SITE.name },
        manufacturer: org,
        category: 'Defence mission systems',
      });
    } else if (type === 'service' || type === 'collection') {
      graph.push({
        '@type': 'Service',
        name: title,
        description,
        url,
        provider: org,
        serviceType: 'Defence mission systems',
        areaServed: { '@type': 'Country', name: 'India' },
      });
    } else if (type === 'article') {
      graph.push({
        '@type': 'Article',
        headline: title,
        description,
        url,
        image,
        /* No datePublished: the data module carries a human month ("JUL 2026"),
           and a date guessed from it would be an assertion we cannot support. */
        author: org,
        publisher: org,
        isPartOf: { '@id': `${SITE.url}/#website` },
      });
    } else if (type === 'contact') {
      graph.push({
        '@type': 'ContactPage',
        name: title,
        description,
        url,
        mainEntity: {
          '@type': 'Organization',
          '@id': `${SITE.url}/#organization`,
          name: SITE.name,
          email: SITE.email,
          address: {
            '@type': 'PostalAddress',
            addressLocality: SITE.locality,
            addressRegion: SITE.region,
            addressCountry: 'IN',
          },
        },
      });
    } else if (type === 'organization') {
      graph.push({
        '@type': 'AboutPage',
        name: title,
        description,
        url,
        mainEntity: org,
      });
    } else if (type === 'legal' || type === 'faq' || type === 'website') {
      graph.push({
        '@type': 'WebPage',
        name: title,
        description,
        url,
        isPartOf: { '@id': `${SITE.url}/#website` },
        publisher: org,
      });
    }
  }

  if (schema) {
    (Array.isArray(schema) ? schema : [schema]).forEach((node) => {
      const clean = graphNode(node);
      if (clean) graph.push(clean);
    });
  }
  return graph;
}

export default function Seo({
  title,
  description,
  type,
  breadcrumb,
  schema,
  image,
  imageAlt,
  noindex,
}) {
  const { pathname } = useLocation();
  const instance = useId();

  useEffect(() => {
    /* Normalised before anything reads it, so the registry lookup, the
       canonical and og:url all agree with the URL listed in sitemap.xml. */
    const path = canonicalPath(pathname);
    const reg = metaFor(path) || {};
    const t = title || reg.title;
    const d = description || reg.description || SITE.description;
    const ty = type || reg.type || 'website';
    const bc = breadcrumb || reg.breadcrumb;
    const url = `${SITE.url}${path}`;
    const full = pageTitle(t);

    const img = absoluteUrl(image || reg.image) || SOCIAL_CARD.url;
    const isCard = img === SOCIAL_CARD.url;
    const alt = imageAlt || (isCard ? SOCIAL_CARD.alt : t || SITE.name);
    const ext = (img.match(/\.([a-z0-9]+)$/i) || [])[1];
    const mime = IMAGE_TYPES[(ext || '').toLowerCase()];

    document.title = full;
    upsertMeta('meta[name="description"]', { name: 'description', content: d });
    /*
      No canonical on a page that is declaring itself noindex.

      This was unconditional, so the 404 route wrote a self-referencing canonical
      the moment JavaScript ran — the page telling a crawler "do not index me"
      and "this URL is the authoritative version of itself" in the same head.
      The static 404.html the prerenderer emits is already correct and noindex
      dominates in practice, but a canonical on a 404 is a wrong statement and
      the two paths are supposed to agree.

      Removed rather than skipped, because a stale canonical left behind by the
      previous route would then be attributed to this one — the same reasoning
      the module header gives for never merely ADDING a tag.
    */
    if (noindex) removeMeta('link[rel="canonical"]');
    else upsertLink('canonical', url);

    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: full });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: d });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: ty === 'article' ? 'article' : 'website' });

    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: img });
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: alt });
    setMeta('meta[property="og:image:type"]', { property: 'og:image:type', content: mime }, mime);
    /* Dimensions are only declared for the card whose dimensions we know. Page
       images are various sizes; repeating 1200×630 for them would describe the
       crop a renderer applies, not the file it fetched. */
    setMeta(
      'meta[property="og:image:width"]',
      { property: 'og:image:width', content: SOCIAL_CARD.width },
      isCard
    );
    setMeta(
      'meta[property="og:image:height"]',
      { property: 'og:image:height', content: SOCIAL_CARD.height },
      isCard
    );

    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:site"]', { name: 'twitter:site', content: SITE.twitter }, SITE.twitter);
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: full });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: d });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: img });
    upsertMeta('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: alt });

    if (noindex) noindexClaims.add(instance);
    else noindexClaims.delete(instance);
    publishRobots();

    graphNodes.set(
      instance,
      buildSchema({ type: ty, title: t, description: d, url, image: img, breadcrumb: bc, schema })
    );
    publishGraph();
  }, [instance, pathname, title, description, type, breadcrumb, schema, image, imageAlt, noindex]);

  /* Unmount only. Withdrawing this instance's claims on every dependency change
     would delete and re-add them on each navigation for no benefit; withdrawing
     them here is what releases a noindex when the 404 page leaves the tree. */
  useEffect(
    () => () => {
      noindexClaims.delete(instance);
      graphNodes.delete(instance);
      publishRobots();
      publishGraph();
    },
    [instance]
  );

  return null;
}
