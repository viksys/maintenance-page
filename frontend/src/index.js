import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/index.css';
import App from '@/App';

/*
  The application was previously wrapped in a react-query QueryClientProvider.
  Nothing in the tree ever called useQuery or useMutation — this is a static,
  content-driven site with no data fetching — so the provider was shipping a
  client, a cache and the whole library to every visitor to do nothing. The
  dependency has been removed rather than left in place "for later": if a data
  layer is introduced, adding it back is one line and one install, and until
  then it is bytes a visitor pays for and a dependency somebody has to patch.

  This file also carried a hydration branch: scripts/prerender.js drove a
  headless browser over every route, wrote the rendered markup back into the
  shell, and marked the container with data-prerendered so this entry point
  would hydrate rather than re-render. Both are gone as of 3 September 2026.

  The script required puppeteer and serve-handler, neither of which was ever
  installed — it was wired to a `prerender:install` step somebody had to run by
  hand, and nobody had. So the flag was never set on any artefact this project
  produced, and the branch below could not be reached. Meanwhile the path that
  IS wired, `npm run seo:heads`, now writes a correct static <head> and a
  <noscript> summary for all 108 routes, which is what a crawler that does not
  execute JavaScript actually needs.

  If full-DOM prerendering is wanted later, take it from git history and wire it
  to a real npm script with its dependencies declared — do not reintroduce a
  branch here that nothing sets.
*/

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
