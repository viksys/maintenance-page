/*
  Tests for the SEO / entity registry.

  Two different things are being protected here.

  The FUNCTION tests cover canonicalPath(), which is the only thing standing
  between this site and a set of self-declared duplicate URLs. A canonical tag
  that echoes the address bar tells a crawler that /Company/?utm_source=x is a
  distinct page from /company, which is the exact failure the tag exists to
  prevent.

  The REGISTRY test at the bottom is worth more than all of them. scripts/
  generate-seo.js fails the build when a route has no title; that failure
  currently arrives four minutes into `npm run build:seo`. Asserting the same
  invariant here moves it to two seconds, which is the difference between a
  check people run and a check people route around.
*/

import {
  SITE,
  SOCIAL_CARD,
  ROUTES,
  STATIC_ROUTES,
  DETAIL_SECTIONS,
  absoluteUrl,
  canonicalPath,
  detailMeta,
  metaFor,
  pageTitle,
} from '@/data/seo';

describe('canonicalPath()', () => {
  test('the root stays a single slash rather than collapsing to an empty string', () => {
    expect(canonicalPath('/')).toBe('/');
    expect(canonicalPath('//')).toBe('/');
    expect(canonicalPath('')).toBe('/');
  });

  test('a missing path resolves to the root instead of throwing', () => {
    expect(canonicalPath(null)).toBe('/');
    expect(canonicalPath(undefined)).toBe('/');
  });

  test('a trailing slash is removed everywhere except the root', () => {
    expect(canonicalPath('/company/')).toBe('/company');
    expect(canonicalPath('/company///')).toBe('/company');
    expect(canonicalPath('/hardware/gcs-x-l/')).toBe('/hardware/gcs-x-l');
  });

  test('repeated slashes inside the path collapse to one', () => {
    expect(canonicalPath('//company//about//')).toBe('/company/about');
    expect(canonicalPath('/hardware//gcs-x-l')).toBe('/hardware/gcs-x-l');
  });

  test('case is folded, because a crawler treats /Company and /company as two pages', () => {
    expect(canonicalPath('/Company')).toBe('/company');
    expect(canonicalPath('/HARDWARE/GCS-X-L')).toBe('/hardware/gcs-x-l');
  });

  test('a query string is dropped, so campaign tags do not fork the canonical', () => {
    expect(canonicalPath('/company?utm_source=x')).toBe('/company');
    expect(canonicalPath('/company/?utm_source=x&utm_medium=y')).toBe('/company');
  });

  test('a fragment is dropped, in either order relative to the query', () => {
    expect(canonicalPath('/knowledge#term-sensor-fusion')).toBe('/knowledge');
    expect(canonicalPath('/knowledge?a=1#term-sensor-fusion')).toBe('/knowledge');
    expect(canonicalPath('/knowledge#term-sensor-fusion?a=1')).toBe('/knowledge');
  });

  test('normalising an already-normal path changes nothing', () => {
    /* Idempotence matters: the value is written into a canonical tag and also
       used as a registry key, so a second pass must not shift it. */
    STATIC_ROUTES.forEach((route) => {
      expect(canonicalPath(canonicalPath(route))).toBe(canonicalPath(route));
    });
  });
});

describe('absoluteUrl()', () => {
  test('a site-relative path is prefixed with the canonical origin', () => {
    expect(absoluteUrl('/assets/img/logo.webp')).toBe(`${SITE.url}/assets/img/logo.webp`);
  });

  test('a path with no leading slash still produces one separator, not zero or two', () => {
    expect(absoluteUrl('assets/img/logo.webp')).toBe(`${SITE.url}/assets/img/logo.webp`);
  });

  test('an already-absolute URL passes through untouched', () => {
    expect(absoluteUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(absoluteUrl('http://example.com/a.jpg')).toBe('http://example.com/a.jpg');
  });

  test('empty and whitespace-only input yield an empty string, never a bare origin', () => {
    /* og:image pointing at the site root is worse than no og:image: the card
       renderer fetches an HTML document and shows a broken thumbnail. */
    expect(absoluteUrl('')).toBe('');
    expect(absoluteUrl('   ')).toBe('');
    expect(absoluteUrl(null)).toBe('');
    expect(absoluteUrl(undefined)).toBe('');
  });

  test('the default social card resolves to an absolute URL', () => {
    expect(absoluteUrl(SOCIAL_CARD.url)).toMatch(/^https:\/\//);
  });
});

describe('pageTitle()', () => {
  test('a page title is suffixed with the brand', () => {
    expect(pageTitle('Careers')).toBe('Careers | VIKASANA Systems');
  });

  test('an absent title falls back to the brand alone, with no dangling separator', () => {
    expect(pageTitle('')).toBe('VIKASANA Systems');
    expect(pageTitle(undefined)).toBe('VIKASANA Systems');
    expect(pageTitle(null)).toBe('VIKASANA Systems');
  });
});

describe('metaFor()', () => {
  test('a registered route resolves to its entry', () => {
    expect(metaFor('/company')).toBe(ROUTES['/company']);
  });

  test('a denormalised address resolves to the same entry rather than falling through', () => {
    expect(metaFor('/Company/')).toBe(ROUTES['/company']);
    expect(metaFor('/company?utm_source=x')).toBe(ROUTES['/company']);
  });

  test('an unregistered route returns null so the caller can use its own defaults', () => {
    expect(metaFor('/not-a-route')).toBeNull();
  });
});

describe('detailMeta()', () => {
  test('a written registry entry beats copy derived from the record', () => {
    const out = detailMeta({
      section: 'hardware',
      slug: 'gcs-x-l',
      name: 'Rugged Mission PC',
      summary: 'Derived summary that must not win.',
    });

    expect(out.title).toBe(ROUTES['/hardware/gcs-x-l'].title);
    expect(out.description).toBe(ROUTES['/hardware/gcs-x-l'].description);
    expect(out.breadcrumb).toBe(ROUTES['/hardware/gcs-x-l'].breadcrumb);
  });

  test('a record with no registry entry derives its own title, description and breadcrumb', () => {
    const out = detailMeta({
      section: 'hardware',
      slug: 'not-written',
      name: 'Some Device',
      summary: 'What the device is for.',
    });

    expect(out.title).toBe('Some Device');
    expect(out.description).toBe('What the device is for.');
    expect(out.type).toBe(DETAIL_SECTIONS.hardware.type);
    expect(out.breadcrumb).toEqual([
      ['Hardware', '/hardware'],
      ['Some Device', '/hardware/not-written'],
    ]);
  });

  test('a trailing full stop is dropped from a title that was written as a sentence', () => {
    /* In a <title> the stop lands immediately before the brand separator,
       where it reads as a typo rather than as punctuation. */
    const out = detailMeta({ section: 'hardware', slug: 's', name: 'Collection is not the constraint.' });

    expect(out.title).toBe('Collection is not the constraint');
  });

  test('a record with no usable description leaves it undefined for Seo to fill', () => {
    const out = detailMeta({ section: 'hardware', slug: 'bare', name: 'Bare' });

    expect(out.description).toBeUndefined();
  });

  test('the shared social card is the image of last resort', () => {
    const out = detailMeta({ section: 'hardware', slug: 'bare', name: 'Bare' });

    expect(out.image).toBe(SOCIAL_CARD.url);
  });

  test('an unrecognised section or a missing slug returns nothing at all', () => {
    /* Falling back to a half-built breadcrumb would publish a crumb pointing
       at a page that does not exist. An empty object lets <Seo> use defaults. */
    expect(detailMeta({ section: 'nope', slug: 'x' })).toEqual({});
    expect(detailMeta({ section: 'hardware' })).toEqual({});
    expect(detailMeta(null)).toEqual({});
    expect(detailMeta(undefined)).toEqual({});
  });
});

describe('the route registry is internally consistent', () => {
  test('every static route has a registry entry', () => {
    STATIC_ROUTES.forEach((route) => {
      expect(ROUTES[route]).toBeDefined();
    });
  });

  test('every route key is already in canonical form, or metaFor can never find it', () => {
    STATIC_ROUTES.forEach((route) => {
      expect(canonicalPath(route)).toBe(route);
    });
  });

  test('every route has a non-empty title, because generate-seo.js fails the build without one', () => {
    STATIC_ROUTES.forEach((route) => {
      const { title } = ROUTES[route];
      expect(typeof title).toBe('string');
      expect(title.trim()).not.toBe('');
    });
  });

  test('no two routes share a title', () => {
    /* Duplicate titles are the single most common cause of a "duplicate
       content" finding, and they are invisible in review because each page
       reads correctly on its own. */
    const titles = STATIC_ROUTES.map((r) => ROUTES[r].title);
    const seen = new Map();
    const collisions = [];

    titles.forEach((t, i) => {
      if (seen.has(t)) collisions.push(`${STATIC_ROUTES[seen.get(t)]} and ${STATIC_ROUTES[i]}`);
      else seen.set(t, i);
    });

    expect(collisions).toEqual([]);
  });

  test('every route has a non-empty description', () => {
    STATIC_ROUTES.forEach((route) => {
      const { description } = ROUTES[route];
      expect(typeof description).toBe('string');
      expect(description.trim()).not.toBe('');
    });
  });

  test('no two routes share a description', () => {
    const seen = new Map();
    const collisions = [];

    STATIC_ROUTES.forEach((route) => {
      const d = ROUTES[route].description;
      if (seen.has(d)) collisions.push(`${seen.get(d)} and ${route}`);
      else seen.set(d, route);
    });

    expect(collisions).toEqual([]);
  });

  test('every route declares a schema type from the documented vocabulary', () => {
    /* <Seo> switches on this to choose the JSON-LD it emits; an unrecognised
       value falls through and the page ships with no structured data. */
    const allowed = [
      'website', 'organization', 'product', 'service',
      'article', 'collection', 'faq', 'legal',
    ];

    STATIC_ROUTES.forEach((route) => {
      expect(allowed).toContain(ROUTES[route].type);
    });
  });

  test('every sitemap priority is a number within the range the spec allows', () => {
    STATIC_ROUTES.forEach((route) => {
      const { priority } = ROUTES[route];
      expect(typeof priority).toBe('number');
      expect(priority).toBeGreaterThanOrEqual(0);
      expect(priority).toBeLessThanOrEqual(1);
    });
  });

  test('every breadcrumb trail is a list of label/path pairs pointing at real paths', () => {
    STATIC_ROUTES.forEach((route) => {
      const { breadcrumb } = ROUTES[route];
      if (!breadcrumb) return;

      breadcrumb.forEach(([label, path]) => {
        expect(typeof label).toBe('string');
        expect(label.trim()).not.toBe('');
        expect(path.startsWith('/')).toBe(true);
        expect(canonicalPath(path)).toBe(path);
      });
    });
  });

  test('every detail section points at an index path that is itself a registered route', () => {
    Object.values(DETAIL_SECTIONS).forEach((section) => {
      expect(ROUTES[section.index]).toBeDefined();
    });
  });

  test('the site identity carries an absolute origin with no trailing slash', () => {
    /* absoluteUrl() concatenates onto SITE.url, so a trailing slash there
       produces a double slash in every og:image on the site. */
    expect(SITE.url).toMatch(/^https:\/\//);
    expect(SITE.url.endsWith('/')).toBe(false);
  });
});
