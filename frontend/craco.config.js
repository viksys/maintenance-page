// craco.config.js
const path = require("path");

/*
  What this file is still for, after the 3 September 2026 hardening pass.

  Four things, and nothing else:

    1. The "@" alias, declared once for BOTH webpack and Jest.
    2. Compatibility shims for webpack-dev-server 5, which react-scripts 5.0.1
       does not know about.
    3. A filter on the dev error overlay.
    4. A vendor split, because react-scripts 5.0.1 ships no splitChunks
       configuration at all and put every library in main.js.

  Everything else that used to live here has been deleted rather than left
  switched off:

    - A health-check webpack plugin and its dev-server endpoints, gated on
      ENABLE_HEALTH_CHECK. Nothing set that variable, the plugin directory was
      dev-only, and a static marketing site has no health to report that the
      hosting platform does not already know. The require() was also
      conditional, so the branch would have thrown rather than degraded once
      the directory went.
    - A withVisualEdits() wrapper for @emergentbase/visual-edits, a package
      that is not in package.json and never was. It was wrapped in a try/catch
      that swallowed MODULE_NOT_FOUND and warned on every dev start.
    - require("dotenv").config(). Create React App loads .env itself, through
      config/env.js, before this file is read. The extra call read the same
      file a second time and its only unique effect was to pull in a
      dependency. Build-time variables now live in vercel.json's build.env,
      where CI can see them; .env is the local mirror.

  An inline ESLint config also used to live here. It extended
  "plugin:react-hooks/recommended" while .eslintrc.json extended "react-app",
  which bundles the same plugin — ESLint then sees react-hooks loaded from two
  configs resolved by different paths and refuses to run at all. That is a hard
  build failure, not a warning. The single .eslintrc.json is now the only
  source, so `npm run lint`, the webpack build and the editor all enforce
  exactly the same set.
*/

/*
  react-scripts 5.0.1 emits a dev-server config in webpack-dev-server 4 shape.
  The installed server is 5.2.2 (pinned in overrides, because 4.x carries
  advisories), and 5.x removed the lifecycle hooks below. This translates one
  to the other.
*/
function makeDevServerV5Compatible(devServerConfig) {
  const {
    https,
    onAfterSetupMiddleware,
    onBeforeSetupMiddleware,
    onListening,
    setupMiddlewares,
    ...compatibleConfig
  } = devServerConfig;

  compatibleConfig.server =
    typeof https === "object"
      ? { type: "https", options: https }
      : https
        ? "https"
        : "http";
  compatibleConfig.headers = {
    ...compatibleConfig.headers,
    "Cross-Origin-Resource-Policy": "same-origin",
  };

  if (onBeforeSetupMiddleware || setupMiddlewares) {
    compatibleConfig.setupMiddlewares = (middlewares, devServer) => {
      if (onBeforeSetupMiddleware) {
        onBeforeSetupMiddleware(devServer);
      }

      return setupMiddlewares
        ? setupMiddlewares(middlewares, devServer)
        : middlewares;
    };
  }

  compatibleConfig.onListening = (devServer) => {
    devServer.close ??= (callback) => devServer.stopCallback(callback);

    if (onListening) {
      onListening(devServer);
    }
    if (onAfterSetupMiddleware) {
      onAfterSetupMiddleware(devServer);
    }
  };

  return compatibleConfig;
}

module.exports = {
  /*
    The "@" alias, for Jest as well as for webpack.

    It was declared for webpack only, so every module in this project resolved
    at build time and none of them resolved under the test runner — a test that
    touches any page failed with "Cannot find module '@/pages/...'" before it
    ran a line of its own. That is not a test-authoring problem, it is a gap in
    the configuration: the two resolvers were describing different projects.

    moduleNameMapper is Jest's equivalent of an alias. Kept next to the webpack
    alias so the pair is visibly one decision — if the alias is ever renamed,
    both lines are on the same screen.
  */

  /*
    A FUNCTION, NOT AN OBJECT, AND THE DIFFERENCE IS NOT COSMETIC.

    craco merges an object-valued `jest.configure` into Create React App's
    config with deepMergeWithArray — see giveTotalControl() in
    @craco/craco/dist/lib/features/jest/merge-jest-config.js. Object keys merge
    the way anyone would expect. ARRAY KEYS CONCATENATE. They do not replace.

    transformIgnorePatterns is an array, and it is an OR: a path is left
    untransformed if ANY pattern matches it. So declaring a carve-out as an
    object merely appended a narrower pattern AFTER CRA's blanket
    `[/\\]node_modules[/\\].+\.(js|jsx|mjs|cjs|ts|tsx)$`, which still matched,
    which still won. The config resolved to four patterns rather than two and
    behaved exactly as if the carve-out had never been written — lenis was never
    transformed and every test that reached it died on `Unexpected token
    'export'` at node_modules/lenis/dist/lenis.mjs. A correct-looking
    configuration doing nothing at all, with no warning from anything.

    Passing a function instead means craco takes the returned object verbatim,
    so the array below is authoritative. The cost is that CRA's defaults are no
    longer merged in for us: anything still wanted has to be carried across
    explicitly, which is why moduleNameMapper spreads the incoming value rather
    than replacing it — CRA maps react-native and CSS modules there, and
    dropping those would trade this bug for a subtler one.

    THE RULE, FOR NEXT TIME: any array-valued key under jest.configure needs the
    function form. Object keys are safe either way.
  */
  jest: {
    configure: (jestConfig) => {
      /* Spread first, ours second: Jest applies the first pattern that
         matches, and this is the order craco's own merge produced. */
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,

        '^@/(.*)$': '<rootDir>/src/$1',

        /*
          react-router v7 publishes "./dom" through its package exports map.
          The Jest version CRA pins predates exports-map resolution, so
          react-router-dom's entry file requires "react-router/dom" and Jest
          cannot find it — every test that imports a page dies on the page's
          own `import { Link } from 'react-router-dom'`.

          Pointing the subpath at the file the exports map resolves to is the
          same answer, written where this resolver can read it.
        */
        '^react-router/dom$': '<rootDir>/node_modules/react-router/dist/development/dom-export.js',
      };

      /*
        Jest does not transform node_modules by default, which is right for
        the ninety-nine percent that ship CommonJS and wrong for the ones that
        publish ESM only. lenis is ESM only, so Jest reaches its `export`
        keyword and reports a syntax error in a dependency — which reads like
        a broken package rather than a missing transform.

        ASSIGNED, NOT APPENDED. CRA's blanket node_modules pattern is replaced
        by this pair rather than joined to it; see the note above for what
        happens otherwise. The negative lookahead keeps the default behaviour
        for everything except the packages named here. Add to the list rather
        than widening it: transforming all of node_modules makes a test run
        minutes slower.
      */
      jestConfig.transformIgnorePatterns = [
        '[/\\\\]node_modules[/\\\\](?!(lenis)[/\\\\])[^/\\\\]+[/\\\\].+\\.(js|mjs|jsx|ts|tsx)$',
        '^.+\\.module\\.(css|sass|scss)$',
      ];

      return jestConfig;
    },
  },

  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      /* Fewer watched directories, so a file save does not walk the build
         output and the public tree looking for changes that cannot be there. */
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };

      /*
        A VENDOR CHUNK, SO A COPY EDIT DOES NOT INVALIDATE REACT.

        Before this, main.js was 545 KB raw / 176 KB gzipped and held React,
        react-dom, react-router, framer-motion and gsap alongside every line of
        application code, under one content hash. Changing a single word of copy
        produced a new hash for the whole file, so every returning visitor
        re-downloaded 176 KB of libraries that had not changed. The libraries are
        the part of that file that is genuinely stable; separating them is the
        only thing that lets a cache do its job here.

        WHY CACHE GROUPS ALONE WOULD HAVE DONE NOTHING. webpack's default
        splitChunks uses `chunks: 'async'`, which considers only dynamically
        imported chunks. react-scripts 5.0.1 does not override that — its whole
        `optimization` block is `{ minimize, minimizer: [Terser, CssMinimizer] }`
        and nothing else — so the entry chunk was never a candidate for
        splitting and a cache group without `chunks: 'all'` would have compiled,
        shipped, and extracted precisely nothing. The setting is declared on each
        group rather than on splitChunks itself, so webpack's own `defaultVendors`
        and `default` groups keep their async-only behaviour for the route chunks
        that React.lazy already produces.

        THE RUNTIME MUST NOT BECOME ITS OWN FILE, and this change deliberately
        does not make it one. `optimization.runtimeChunk` is a separate option
        from splitChunks and react-scripts does not set it either, so the webpack
        runtime currently lives inside main.js and the build emits no
        `runtime-*.js`. That matters because react-scripts installs
        InlineChunkHtmlPlugin against /runtime-.+[.]js/ and inlines whatever it
        matches into index.html unless INLINE_RUNTIME_CHUNK=false — and an inline
        <script> is blocked by our own `script-src 'self'`, which serves a blank
        document to every visitor. Adding cache groups does not create a runtime
        chunk; adding `runtimeChunk` would, and would put the site one missing
        environment variable away from that failure. Do not add it. vercel.json
        and verify.yml both set INLINE_RUNTIME_CHUNK=false, and
        scripts/check-artifact.js asserts the result — that is belt and braces,
        not a licence to remove the braces.

        Merged field by field rather than assigned. Overwriting `optimization` or
        `optimization.splitChunks` wholesale would discard the two minimizers
        above, which is how a build silently stops minifying.

        TWO GROUPS, BECAUSE THEY MOVE AT DIFFERENT SPEEDS. React and the router
        change on a multi-year cadence and every route needs them. The animation
        libraries are larger, change more often, and are the likelier thing to be
        swapped or dropped. Kept apart, replacing framer-motion does not evict
        react-dom from anybody's cache. Everything else stays in main.js, which
        is free to churn with the copy.

        Two things about the regexes are load-bearing and both fail silently.
        Path separators are matched as [\\/] and not /, because the test runs
        against module.context, which is a native path — backslashes on a
        Windows workstation, forward slashes in CI; a / alone matches nothing on
        one of the two. And the package name is closed by (?:[\\/]|$), not by a
        separator alone: module.context for a file that sits at the root of its
        own package — gsap/gsap-core.js is one — ends AT the package directory
        with nothing after it, so a mandatory trailing separator drops exactly
        the modules the group exists to catch. The alternation is still ordered
        longest-first and every branch is closed, so react-is and
        react-router-dom are matched by the branch that names them rather than
        by the react prefix.

        Production only. The benefit is entirely a content-hash caching effect
        and dev serves unhashed files from memory, where an extra chunk boundary
        only adds requests to the hot-reload path.
      */
      if (webpackConfig.mode === 'production') {
        const optimization = webpackConfig.optimization || {};
        const splitChunks = optimization.splitChunks || {};

        webpackConfig.optimization = {
          ...optimization,
          splitChunks: {
            ...splitChunks,
            cacheGroups: {
              ...(splitChunks.cacheGroups || {}),

              'vendor-react': {
                test: /[\\/]node_modules[\\/](?:react-router-dom|react-router|react-dom|react|scheduler|use-sync-external-store)(?:[\\/]|$)/,
                name: 'vendor-react',
                chunks: 'all',
                /* Above webpack's defaultVendors (-10) and default (-20), so a
                   module claimed here is not swept into a generic vendors chunk
                   by whichever group is evaluated first. */
                priority: 40,
                reuseExistingChunk: true,
                enforce: true,
              },

              'vendor-motion': {
                test: /[\\/]node_modules[\\/](?:framer-motion|motion-dom|motion-utils|gsap)(?:[\\/]|$)/,
                name: 'vendor-motion',
                chunks: 'all',
                priority: 30,
                reuseExistingChunk: true,
                enforce: true,
              },
            },
          },
        };
      }

      return webpackConfig;
    },
  },

  devServer: (devServerConfig) => {
    /*
      Keep the dev error overlay for our own bugs, and only for our own bugs.

      The overlay listens on window error events, which means an exception
      thrown by any installed browser extension covers the whole page with a
      red screen attributing the failure to this app. That is not a
      hypothetical: extension frames (chrome-extension://…) are a common source
      of unhandled errors and the resulting overlay is indistinguishable, to
      the reader, from the site being broken.

      The filter below suppresses errors whose stack contains no frame from
      this origin. Anything thrown by our own bundle still stops the page,
      loudly.
    */
    devServerConfig.client = {
      ...(devServerConfig.client || {}),
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: (error) => {
          const stack = (error && error.stack) || '';
          if (!stack) return true;
          return !/(chrome|moz|safari-web)-extension:\/\//.test(stack);
        },
      },
    };

    return makeDevServerV5Compatible(devServerConfig);
  },
};
