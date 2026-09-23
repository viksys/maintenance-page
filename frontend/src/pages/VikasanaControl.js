import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ProductHero } from '@/components/ui/product-hero';
import { PRODUCT_HEROES } from '@/data/product-heroes';

/*
  VIKASANA CONTROL — the hero only.

  The shared light product plate. Content is in data/product-heroes.js; the
  reasoning for the treatment is on the component.

  .landing sets --font-sans on the wrapper and drives the `.landing .vk-bar`
  navigation recolour.
*/
export default function VikasanaControl() {
  return (
    <div className="landing">
      <Header />
      <main id="main-content" tabIndex={-1}>
        <ProductHero {...PRODUCT_HEROES.control} />
      </main>
      <Footer variant="dark" />
    </div>
  );
}
