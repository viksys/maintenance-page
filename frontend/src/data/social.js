/*
  Where the company is, off this site.

  One list, three surfaces — the footer, the header's contact panel and the
  contact page. They used to disagree: a SOCIAL column in the header listed five
  networks as inert text, two of which had no icon and none of which had a link,
  and it was deleted on 23 September 2026 rather than corrected.

  ONLY ACCOUNTS THAT EXIST BELONG HERE. That is what the deleted column got
  wrong, and the rule that keeps this file honest: a row here renders a link, and
  a link that 404s is worse than an absent icon.
*/

import { IconX, IconLinkedIn } from '@/components/Icon';

export const SOCIAL = [
  /* `label` is the accessible name, not a caption — the links are icon-only, so
     it is the ONLY name a screen reader has for them. "X" alone is a letter;
     "VIKASANA Systems on X" says what following it does. */
  { key: 'x', label: 'VIKASANA Systems on X', href: 'https://x.com/vikasanasystems', Icon: IconX },
  {
    key: 'linkedin',
    label: 'VIKASANA Systems on LinkedIn',
    href: 'https://www.linkedin.com/company/vikasana-systems/',
    Icon: IconLinkedIn,
  },
];
