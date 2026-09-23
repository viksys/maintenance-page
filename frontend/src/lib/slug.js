/*
  Deterministic anchor slugs.

  Used by the FAQ and Knowledge components to give every question and term a
  stable id, and by the search index to build deep links to them. Both sides
  call the same function, so an indexed destination cannot drift from the
  anchor the page actually renders.

    "Does VIKASANA build drones?" -> "does-vikasana-build-drones"
*/
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[’'"“”]/g, '')            // drop quotes rather than turning them into gaps
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    /* Trimmed AGAIN after the slice, not only before it. The cut is at a fixed
       offset and lands wherever it lands — including on a separator — which
       silently undid the trim above and produced ids ending in a dash. Nothing
       in the corpus is long enough to reach 72 today, so this was latent rather
       than live; it is two characters to make it stay that way. */
    .replace(/-+$/, '');
}

/* Namespaced so an FAQ and a glossary term with similar wording cannot collide
   on a page that renders both. */
export const faqAnchor = (question) => `faq-${slugify(question)}`;
export const termAnchor = (term) => `term-${slugify(term)}`;
