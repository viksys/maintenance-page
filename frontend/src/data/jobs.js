/*
  Open roles.

  ONE ROLE. Six engineering positions — software, embedded, robotics, computer
  vision, electronics and mechanical design — were listed here and removed on
  23 September 2026, by direction: the company is hiring the intern and nothing
  else, and a careers page advertising six roles it will not fill costs more
  than an empty one.

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
    required: [
      'Currently pursuing or recently completed a degree in Engineering, Computer Science or a related field',
      'Demonstrated programming ability in at least one language',
      'Evidence of something you have built — coursework, personal project, competition, or open source',
      'Able to work from Mangaluru or Bengaluru, or remotely with regular overlap',
      'Curiosity, and comfort saying when you do not know something',
    ],
    preferred: [
      'Robotics, drones or autonomous systems experience',
      'Participation in technical competitions or student teams',
      'Open-source contributions',
      'Exposure to Linux, ROS, or embedded development',
      'Interest in defence and indigenous technology',
    ],
    technologies: ['Python', 'C++', 'ROS2', 'Linux', 'Git', 'Docker'],
  },
].map((role) => ({ ...BASE, ...role }));
