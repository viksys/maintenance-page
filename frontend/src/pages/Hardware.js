import React from 'react';
import CollectionPage from '@/components/CollectionPage';
import { HARDWARE_LIST } from '@/data/hardware';

/*
  Hardware index.

  Lists the devices VIKASANA actually builds — three — rather than the older
  catalogue of described modules. A module concept is an engineering note; a
  product index is a promise. The two should not share a page.

  Card copy is read from the same registry the product pages render from, so
  the index and the page cannot describe a device differently.
*/
const items = HARDWARE_LIST.map((h) => ({
  slug: h.slug,
  name: h.name,
  kicker: h.card.kicker,
  summary: h.card.summary,
  image: h.image,
  imageFit: 'contain',
}));

export default function Hardware() {
  return (
    <CollectionPage
      eyebrow="// Products / Hardware"
      title="Purpose-built hardware for"
      titleAmber="the field."
      intro="DRISHTIKON runs on any suitable operator machine — and on VIKASANA's own rugged hardware, built to run the full stack where consumer or generic enterprise hardware was not designed to survive. Hardware is built only where software performance depends on it."
      items={items}
      basePath="/hardware"
      sectionLabel="Hardware"
      cardCols="lg:grid-cols-3"
      bandImage="/assets/img/hero-gcs.webp"
      bandFit="cover"
      bandLabel="VIKASANA HARDWARE · GROUND CONTROL"
      note="Specifications published on these pages are provisional configuration targets, not certifications. Final specification is confirmed per deployment."
      ctaTitle="Field-ready by design."
    />
  );
}
