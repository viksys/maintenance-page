/* --- Product hero plates -----------------------------------------------------
   The light opening plate for the four product pages.

   ONE FILE FOR FOUR HEROES so the set can be read as a set. These are the
   plates a visitor compares — DRISHTIKON against CONTROL against EDGE against
   CORE — and the thing that matters most is that the four are saying different
   things at the same level of specificity. Split across four page files that is
   impossible to check; here it is one screen.

   EVERY LINE IS LIFTED, NOT WRITTEN. The kickers, subtitles and paragraphs are
   the copy already on each page's old dark hero, reorganised into the plate's
   two-column shape. Nothing here makes a claim the site was not already making.

   titleScale: the wordmark clamp in index.css is solved for "DRISHTIKON" at ten
   characters. The other three are two-word names of sixteen, thirteen and
   thirteen characters set on two lines, so they take a smaller multiple — see
   the note on .dk-hero__title.
*/

export const PRODUCT_HEROES = {
  control: {
    eyebrow: 'PLATFORM ARCHITECTURE',
    title: ['VIKASANA', 'CONTROL'],
    titleScale: 0.62,
    kicker: 'SOFTWARE-DEFINED. HARDWARE-ENABLED.',
    subtitle: 'The software foundation for coordinated multi-platform defence operations.',
    body: [
      'VIKASANA CONTROL is the core software stack behind VIKASANA’s mission '
      + 'systems. It provides the common architecture for mission control, fleet '
      + 'management, mission planning, data, communications, plugins, simulation, '
      + 'AI-enabled decision support and edge execution.',
      'That common architecture is what allows compatible UAVs, UGVs, USVs and '
      + 'surveillance systems to operate through one software environment rather '
      + 'than through one integration per platform.',
    ],
    lifecycle: ['One foundation', 'Multiple platforms', 'Multiple missions'],
  },

  edge: {
    eyebrow: 'EDGE COMPUTING',
    title: ['VIKASANA', 'EDGE'],
    titleScale: 0.66,
    kicker: 'COMPUTE WHERE THE MISSION HAPPENS.',
    subtitle: 'Edge mission computing for unmanned and distributed defence systems.',
    body: [
      'VIKASANA EDGE brings processing closer to the sensors, platforms and '
      + 'operators that generate mission data.',
      'Instead of moving every observation back to a remote command centre before '
      + 'it can be processed, selected workloads execute closer to the point of '
      + 'collection. This reduces dependency on backhaul, lowers data-transfer '
      + 'latency, and maintains useful mission functions when communications are '
      + 'intermittent or degraded.',
    ],
    lifecycle: ['Sense locally', 'Process locally', 'Decide faster'],
  },

  core: {
    eyebrow: 'COMMAND & CONTROL',
    title: ['VIKASANA', 'CORE'],
    titleScale: 0.66,
    kicker: 'EVERY SENSOR. EVERY SYSTEM.',
    subtitle: 'AI-enabled command and control for multi-platform defence operations.',
    body: [
      'VIKASANA CORE is the command-and-control environment at the centre of the '
      + 'VIKASANA architecture. It brings compatible UAVs, UGVs, USVs, surveillance '
      + 'systems and mission sensors into a common operational environment — giving '
      + 'operators a unified view of the mission and the tools to plan, coordinate '
      + 'and manage multiple assets from a single system.',
      'From command centres to remote vehicle stations, VIKASANA CORE puts mission '
      + 'information where decisions are made.',
    ],
    lifecycle: ['Sense', 'Fuse', 'Understand', 'Decide', 'Act'],
  },
};

export default PRODUCT_HEROES;
