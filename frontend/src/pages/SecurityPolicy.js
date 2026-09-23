import React from 'react';
import LegalLayout, { LegalLink, LegalList, LegalP, LegalSection, LegalSubhead } from '@/components/LegalLayout';

export default function SecurityPolicy() {
  return (
    <LegalLayout
      title="Security Policy"
      lastUpdated="8 August 2026"
    >
      <LegalSection first heading="Our Commitment to Security">
        <LegalP>
          VIKASANA Systems Private Limited builds command, control, and interoperability software for defence and
          mission-critical environments — security is foundational to that work, not an afterthought. We take
          reports of potential vulnerabilities in our website, products, and infrastructure seriously, and we value
          the work of independent researchers who report issues to us responsibly and in good faith.
        </LegalP>
        <LegalP>
          This page describes our responsible disclosure process for security researchers, customers, and the
          public. It is a public-facing disclosure policy, not a technical security architecture document.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Reporting a Vulnerability">
        <LegalP>
          If you believe you have discovered a security vulnerability affecting VIKASANA Systems Private Limited&rsquo;s
          website or public-facing systems, please report it to us privately before disclosing it anywhere else.
        </LegalP>
        <LegalP>To make a report, please include as much of the following as you can:</LegalP>
        <LegalList
          items={[
            'A clear description of the vulnerability and its potential impact.',
            'Step-by-step instructions to reproduce the issue, including the affected URL, endpoint, or component.',
            'Any proof-of-concept code, screenshots, or logs that support the report.',
            'The date and time the testing was performed, and the IP address or account used, if applicable.',
            'Your preferred contact details for follow-up (a PGP-encrypted channel is available — see below).',
          ]}
        />
      </LegalSection>

      <LegalSection heading="Security Contact">
        <div className="text-[14.5px]" style={{ color: 'var(--ink)' }}>
          {/* One published address for the whole site. A second inbox is a
              second thing to watch, and a security report that lands in an
              unwatched mailbox is worse than one that lands in the general
              one — so the purpose is carried by the subject line instead. This
              address and the one in /.well-known/security.txt must agree. */}
          <div>Email: <LegalLink to="mailto:info@vikasanasystems.tech">info@vikasanasystems.tech</LegalLink></div>
          <div className="mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Mark the subject line &ldquo;Security Disclosure&rdquo; so the report is
            triaged ahead of general correspondence.
          </div>
        </div>
        <LegalSubhead>PGP Key</LegalSubhead>
        <LegalP>
          For sensitive reports, we encourage the use of encrypted email. Our PGP public key will be published at
          this location:
        </LegalP>
        <div
          className="mt-3 px-5 py-4 text-[12.5px] font-mono"
          /* --text-tertiary, not #5F6355 (--stone-500's value). This block is
             the only place on the site where a muted grey sits on --stone-50
             rather than on paper, and the extra step of ground costs it: the
             token measures 4.52:1 there against 5.43:1 on white. It clears the
             floor either way now, but only just, and --text-tertiary is 6.01:1
             here. It is a key fingerprint set in 12.5px mono — the hardest
             thing on the page to read and the one a reader has to transcribe. */
          style={{ background: 'var(--stone-50)', border: '1px solid var(--stone-100)', color: 'var(--text-tertiary)', letterSpacing: '0.02em' }}
        >
          PGP Key ID: [to be published] · Fingerprint: [to be published]<br />
          Key location: vikasanasystems.tech/.well-known/pgp-key.txt (coming soon)
        </div>
      </LegalSection>

      <LegalSection heading="What We Ask of Researchers">
        <LegalP>To help us investigate and resolve issues quickly and safely, please:</LegalP>
        <LegalList
          items={[
            'Give us a reasonable amount of time to investigate and remediate an issue before disclosing it publicly.',
            'Make a good-faith effort to avoid privacy violations, data destruction, and disruption or degradation of our services during your research.',
            'Only interact with accounts and data you own, or for which you have explicit permission from the account holder.',
            'Do not access, modify, download, or exfiltrate data that does not belong to you.',
            'Do not perform testing that could impact the availability of our systems, such as denial-of-service testing, spam, or automated high-volume scanning without prior coordination.',
            'Avoid social engineering, phishing, or physical-security testing against our employees, contractors, or facilities unless explicitly authorised in writing in advance.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="Safe Harbor">
        <LegalP>
          VIKASANA Systems Private Limited considers security research conducted consistent with this policy to be
          authorised, and we will not pursue civil or criminal legal action against researchers for good-faith
          efforts that comply with the guidance above. This safe harbor applies only to conduct that stays within
          the scope described in this policy; it does not extend to actions that violate the law, harm third
          parties, or exceed the bounds of good-faith security research. If legal action is initiated by a third
          party against a researcher who has acted in accordance with this policy, we will take steps to make it
          known that the research was authorised by us.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Our Response Process">
        <LegalList
          items={[
            <><strong>Acknowledgement</strong> — we aim to acknowledge receipt of a valid report within a reasonable timeframe of submission.</>,
            <><strong>Triage</strong> — our team assesses the report to confirm the vulnerability, determine severity, and identify affected systems.</>,
            <><strong>Remediation</strong> — we work to resolve confirmed issues in line with their severity and potential impact, and may follow up with the reporter for clarification during this stage.</>,
            <><strong>Resolution &amp; Disclosure</strong> — once an issue is resolved, we will update the reporter, and may coordinate on public disclosure timing where relevant.</>,
          ]}
        />
        <LegalP>
          Response and remediation timelines vary with the complexity and severity of the issue reported. We
          prioritise vulnerabilities that pose the greatest risk to our Users and systems.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Scope">
        <LegalP>
          This policy applies to vikasanasystems.tech and other public-facing infrastructure operated by VIKASANA
          Systems Private Limited. It does not apply to third-party services we link to or integrate with, which
          should be reported directly to the relevant provider. Vulnerabilities in software delivered privately to
          specific customers under contract should be reported through the applicable contractual or programme
          channel, in addition to (or instead of) this process, as directed by that engagement.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Our Security Commitment">
        <LegalP>
          We design our systems with defence-grade expectations around confidentiality, integrity, and
          availability, and we review our security posture on an ongoing basis. We are grateful to the researchers
          and members of the public who help us keep our systems, our customers, and our users secure by reporting
          issues responsibly.
        </LegalP>
      </LegalSection>
    </LegalLayout>
  );
}
