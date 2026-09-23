/*
  FAQ content — written to answer questions people and answer-engines actually
  ask, in plain language, without marketing padding.

  Rules followed here:
    - Each answer opens with a direct definition in the first sentence, so an
      LLM or featured snippet can extract it cleanly without context.
    - Generic questions are answered generically first, then related to what
      VIKASANA builds. A definition that only describes our product is not a
      definition, and answer engines discount it.
    - No superlatives, no claims about market position, no invented figures.
*/

export const GENERAL_FAQ = [
  {
    q: 'What is VIKASANA Systems?',
    a: 'VIKASANA Systems is an indigenous defence technology company based in Mangaluru, Karnataka, India. It builds the software layer that lets heterogeneous unmanned and autonomous systems operate as one coordinated force — command and control, interoperability, mission management, and edge intelligence — along with the purpose-built hardware needed to run that software in the field. It is deliberately not a drone manufacturer; it builds the coordination layer above platforms from any vendor.',
  },
  {
    q: 'What is DRISHTIKON?',
    a: 'DRISHTIKON is VIKASANA’s universal ground control and mission management platform, and the flagship product inside the VIKASANA Control platform. It gives an operator one interface to command unmanned systems from multiple vendors, instead of a separate ground control station per platform. Beneath the operator screen it acts as an interoperability, mission-management, safety, and common-data layer, architected around open interfaces and human authority rather than a single autopilot ecosystem.',
  },
  {
    q: 'What does software-defined, hardware-enabled mean?',
    a: 'It means the product is the software, and hardware exists only where software performance depends on it. Capability is delivered and upgraded in software — new platform integrations, new mission logic, new decision support — while purpose-built hardware such as ground control stations and edge compute units exists to run that software reliably in demanding field conditions. The practical benefit is that capability can improve without replacing physical equipment.',
  },
  {
    q: 'Does VIKASANA build drones?',
    a: 'No. VIKASANA builds the command, control, and coordination layer that operates unmanned systems built by others, plus the computing hardware to run it. The company integrates with the platforms a unit already operates through documented interfaces and vendor cooperation, rather than asking customers to replace them.',
  },
  {
    q: 'Where is VIKASANA Systems located?',
    a: 'VIKASANA Systems Private Limited is based in Mangaluru, Karnataka, on India’s western coastline, with engineering, integration, and operations in one place. The company is among the early indigenous defence technology companies emerging from the region and part of the growing Silicon Beach ecosystem across Coastal Karnataka.',
  },
  {
    q: 'Who are VIKASANA’s systems built for?',
    a: 'Defence organisations, government customers, and systems integrators operating mixed fleets of unmanned platforms. The same coordination layer also applies to border security, homeland security, disaster response, critical infrastructure protection, and industrial robotics, where multiple sensors and platforms must be operated as one picture.',
  },
];

export const CAREERS_FAQ = [
  /* Answers cut to one sentence each on 23 September 2026. The three of them
     ran to 130 words under a page that had just been reduced to a quarter of
     its length, and the detail they carried — the disciplines, the regional
     argument, the nature of the work — is stated once already in the sections
     above. An FAQ that repeats the page is not an FAQ.

     The third question, "what does working on defence software involve?", went
     with them. Its answer was the four culture pillars restated in a sentence,
     and it sat two screens below them. Two questions still emit FAQPage
     schema; a third that answers nothing new does not earn its words. */
  {
    q: 'What kinds of engineers does VIKASANA hire?',
    a: 'Mission software, embedded systems, robotics, computer vision, electronics and mechanical design.',
  },
  {
    q: 'Where are VIKASANA roles based?',
    a: 'Mangaluru and Bengaluru, Karnataka, with remote considered for the right person.',
  },
];
