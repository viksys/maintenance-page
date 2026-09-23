/*
  Hardware product registry — Rugged Mission PC, Tactical Tablet, Edge Compute
  Module.

  Three devices share one page layout, so they share one data shape and one
  page component. Separate page files would look identical on the day they were
  written and would disagree within a month.

  Naming
  ------
  Each device carries a human product name (what a customer says) and an
  internal model designation (what a procurement document cites): GCS-X-L,
  GCS-X-H, ECM-X. The URL keeps the model designation because it is the stable
  identifier — product names are marketing surface and can be revised; a model
  code, once quoted in a specification, cannot.

  The product pages currently show the hero only, followed by a "Revealing
  soon" band; specifications and detail sections are withheld until release.
*/

export const HARDWARE = {
  'gcs-x-l': {
    slug: 'gcs-x-l',
    /* The DRISHTIKON-style plate. Five registers, in the order the eye takes
       them: category, model, product class, the one-line claim, then the
       paragraph that earns it — and the lifecycle line last, which is the
       page's table of contents in four words.

       `title` carries its own spacing as literal text. "GCS - X - L" is a
       model number read aloud one character at a time, and letter-spacing
       cannot express that: it would open every gap equally, including the ones
       inside GCS. */
    hero: {
      eyebrow: 'EDGE COMPUTING PLATFORM',
      title: 'GCS - X - L',
      kicker: 'MISSION COMPUTER',
      subtitle: 'Modular mission computing, built around the mission.',
      body: [
        'A rugged computing platform designed to run DRISHTIKON at the tactical '
        + 'edge. Its modular architecture lets forces configure the system around '
        + 'the mission — adding displays, operator controls, communications and '
        + 'mission-specific interfaces as required.',
      ],
      lifecycle: ['Configure', 'Connect', 'Compute', 'Deploy'],
    },
    model: 'GCS-X-L',
    eyebrow: 'HARDWARE · EDGE COMPUTING PLATFORM',
    name: 'Rugged Mission PC',
    subtitle: 'Mission computing, built for the field.',
    intro:
      'A rugged, modular operator workstation running the DRISHTIKON mission environment at the tactical edge. It exists to run mission software reliably where standard computing cannot — mission control, telemetry, planning and operator workflows in one field-deployable system.',
    bullets: [
      'On-device compute — the full DRISHTIKON mission environment runs locally.',
      'Offline capable — no hard dependency on connectivity or cloud.',
      'Field rugged — engineered for heat, vibration, dust, intermittent power and drop survival.',
    ],
    image: '/assets/img/hero-gcs.webp',
    /* The product-page render is a TRIMMED copy, and the box it gets is wider
       than the other two.

       hero-gcs.webp carries about 30% dead transparent space below the device
       — the laptop fills only 66% of its frame height, where the tablet fills
       99%. Sized by the same rules as the tablet it therefore read as much the
       smaller object, and simply raising the width could not fix it: the
       max-height cap binds on the tall empty frame and scales the whole thing
       straight back down.

       hero-gcs-trim.webp is the same render cropped to its own content box.
       At 980px it renders 980x528 against the tablet's 680x535 — the same
       height on screen, and wider, which is correct for a device that is
       wider. Both sit at 59% of a 900px window.

       The original is untouched and still used in fourteen other places. */
    heroImage: '/assets/img/hero-gcs-trim.webp',
    heroMaxWidth: 980,
    /* Index-card copy. Held beside the page copy so the collection page and
       the product page cannot describe the same device differently. */
    card: {
      kicker: 'HARDWARE · CONSOLE',
      summary:
        'A portable operator console running the full DRISHTIKON command-and-control stack on-device at the tactical edge.',
    },
  },

  'gcs-x-h': {
    slug: 'gcs-x-h',
    hero: {
      eyebrow: 'EDGE COMPUTING PLATFORM',
      title: 'GCS - X - H',
      kicker: 'TACTICAL MISSION CONTROLLER',
      subtitle: 'The command layer, carried forward.',
      body: [
        'A rugged handheld running the same mission environment as the fixed '
        + 'station, sized for the forward and dismounted operator. The full '
        + 'operational picture in hand — not a reduced companion view.',
      ],
      lifecycle: ['Carry', 'Connect', 'Command', 'Deploy'],
    },
    model: 'GCS-X-H',
    eyebrow: 'HARDWARE · EDGE COMPUTING PLATFORM',
    name: 'Tactical Tablet',
    subtitle: 'Rugged handheld for the forward and dismounted operator',
    intro:
      'The same command layer in a handheld form factor, carried by forward and dismounted operators who need the command post’s picture without the command post.',
    bullets: [
      'The full operational picture in hand, not a reduced companion view.',
      'Ruggedised for dismounted carry, weather, and rough handling.',
      'Runs the same command layer as the console — one interface to learn, not two.',
    ],
    image: '/assets/img/hero-tab.webp',
    card: {
      kicker: 'HARDWARE · TABLET',
      summary:
        'The same command layer in a handheld form factor, carried by forward and dismounted operators.',
    },
  },

  'ecm-x': {
    slug: 'ecm-x',
    hero: {
      eyebrow: 'EDGE COMPUTING PLATFORM',
      title: 'ECM - X',
      kicker: 'EDGE COMPUTE MODULE',
      subtitle: 'Compute at the point of collection.',
      body: [
        'A headless compute node that places processing where the sensors are, '
        + 'rather than at the far end of a link. Mounted on the platform, it runs '
        + 'detection, fusion and mission workloads on-device.',
      ],
      lifecycle: ['Mount', 'Ingest', 'Process', 'Relay'],
    },
    model: 'ECM-X',
    eyebrow: 'HARDWARE · EDGE COMPUTING PLATFORM',
    name: 'Edge Compute Module',
    subtitle: 'Headless compute node for the point of collection',
    intro:
      'A mountable compute node that runs sensor fusion, inference, and mission processing where the data is produced — with no operator screen, and no dependency on a link back to a data centre.',
    bullets: [
      'Runs fusion and inference at the point of collection, not in a data centre it may not reach.',
      'Headless and mountable — vehicle, mast, shelter, or forward node.',
      'Publishes into the same Common Data Model the console and tablet operate on.',
    ],
    /* No product render of its own. The page's render band is skipped
       rather than borrowing a generic scene — see HardwareProduct.js. */
    heroRender: false,
    image: '/assets/img/hero-scene.webp',
    card: {
      kicker: 'HARDWARE · COMPUTE',
      summary:
        'A headless compute node running fusion, inference, and mission processing at the point of collection — mounted, unattended, and offline-capable.',
    },
  },
};

/* Index order is deliberate: console, tablet, module — decreasing operator
   presence, which is the axis a reader is actually choosing along. */
export const HARDWARE_LIST = [HARDWARE['gcs-x-l'], HARDWARE['gcs-x-h'], HARDWARE['ecm-x']];

export const getHardwareProduct = (slug) => HARDWARE[slug] || null;
