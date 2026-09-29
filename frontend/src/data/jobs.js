/*
  Open roles.

  TWO ROLES. Six engineering positions — software, embedded, robotics, computer
  vision, electronics and mechanical design — were listed here and removed on
  23 September 2026, by direction: the company is hiring interns and nothing
  else, and a careers page advertising six roles it will not fill costs more
  than an empty one. Social Media Intern was added on 29 September 2026.

  Roles need not be shaped alike. Social Media Intern declares no
  `responsibilities` and no `required` because neither was given, and JobDetails
  omits an empty section rather than throwing on it.

  BASE and the `.map` that merges it are kept rather than folded into the
  single remaining role. They are what makes adding the next role a matter of
  writing what differs about it, and inlining them now would mean unpicking
  them again the first time a second role is posted.

  A BENEFITS array also lived here and was merged in as `benefits`. The careers
  page section that rendered it was removed in the same pass, and no other
  component ever read `job.benefits`, so the data went with the section.

  A six-step HIRING_PROCESS array also lived here and was merged in as
  `process`. Nothing read it — not JobDetails, not Careers, not any other page —
  so every visitor downloaded six interview stages that no component could
  render. Removed on 3 September 2026. If the careers page should describe the
  interview loop, and JobDetails' own comment suggests someone intended it to,
  that needs a section written and rendered; reinstating the data alone would
  put it straight back into the same state.
*/

const BASE = {
  employment: 'Full-time',
  /* Mangaluru and Bengaluru, and remote is on the table — stated here rather
     than per role, because it is true of all of them. */
  location: 'Mangaluru & Bengaluru, Karnataka, India',
  workplace: 'On-site or hybrid, with remote considered',
  travel: 'Occasional, for trials and integration support',
  /* `visa` was here. The WORK AUTH row that rendered it was removed, and it is
     deleted rather than left as data the bundle carries to every visitor for
     no one to render — the same reasoning as HIRING_PROCESS before it. */
  /* `team` and its TEAM_BLURB were here. The "About the Team" block that
     rendered them was removed, and the data goes with it rather than staying in
     the bundle for no one to render — as with `visa` above. */
  clearance: 'Not required at application. May be required for specific programmes.',
};

export const jobs = [
  {
    slug: 'defence-systems-intern',
    title: 'Defence Systems Intern',
    tags: ['INTERNSHIP', 'MANGALURU · BENGALURU · REMOTE'],
    experience: 'Students and recent graduates',
    employment: 'Internship, 3–6 months',
    summary: [
      'As a Defence Systems Intern you will work on a real component of the system alongside the engineering team, not a side project kept away from the product.',
      'You will be given a defined problem, the context to understand why it matters, and an engineer who is responsible for helping you land it.',
    ],
    responsibilities: [
      'Own a scoped component of the mission software or hardware stack',
      'Work through design, implementation and testing with review',
      'Participate in engineering discussions and design reviews',
      'Write tests and documentation for what you build',
      'Present your work to the team at the end of the internship',
    ],
    /* The technical list is as supplied on 29 September 2026. The three
       non-technical lines around it are kept: eligibility and location are
       conditions of the internship and are not implied by a skills list. */
    required: [
      'Python',
      'HTML & CSS',
      'JavaScript',
      'React / React.js',
      'REST APIs and backend development',
      'Good programming and problem-solving skills',
      'Git and basic software development practices',
      'Currently pursuing or recently completed a degree in Engineering, Computer Science or a related field',
      'Able to work from Mangaluru or Bengaluru, or remotely with regular overlap',
      'Curiosity, and comfort saying when you do not know something',
    ],
    preferred: [
      'MAVLink',
      'Computer networking',
      'Experience with autonomous systems, drones/UAVs or robotics',
      'AI/ML and computer vision',
      'FastAPI or similar backend frameworks',
      'Cloud platforms and Docker',
      'Interest in defence and indigenous technology',
    ],
    /* Chips, so the stack is legible before the panel is opened. C++ and ROS2
       are dropped: neither appears in the supplied lists, and a technology
       shown here that no requirement mentions invites the wrong applicant. */
    technologies: ['Python', 'JavaScript', 'React', 'REST APIs', 'FastAPI', 'Git', 'Docker', 'MAVLink', 'Linux'],
  },
  {
    slug: 'social-media-intern',
    title: 'Social Media Intern',
    tags: ['INTERNSHIP', 'MANGALURU · BENGALURU · REMOTE'],
    experience: 'Students and recent graduates',
    employment: 'Internship, 3–6 months',
    summary: [
      'We are looking for candidates who are creative, proactive and interested in building the digital presence of an emerging defence technology startup.',
    ],
    /*
      NO `responsibilities` AND NO `required`.

      Neither was supplied, and JobDetails now omits a section whose list is
      empty rather than throwing, so the panel shows what is actually known
      about this role. Writing plausible duties and qualifications to fill the
      layout would mean advertising conditions nobody has agreed to — a
      candidate reads them as the job, and they would not be.

      Add them here when they exist; the section returns on its own.
    */
    preferred: [
      'Social media management and content creation',
      'Content writing and communication',
      'Basic graphic design and video editing',
      'Knowledge of platforms such as LinkedIn, Instagram and YouTube',
      'Digital marketing and branding',
      'Creative thinking and strong communication skills',
    ],
    technologies: ['LinkedIn', 'Instagram', 'YouTube'],
  },
].map((role) => ({ ...BASE, ...role }));
