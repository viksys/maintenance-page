import React from 'react';
import LegalLayout, { LegalLink, LegalP, LegalSection } from '@/components/LegalLayout';

export default function TermsOfUse() {
  return (
    <LegalLayout
      title="Terms of Use"
      /* Every other legal page carries this line, and its absence here was a
         visible difference: the mono "LAST UPDATED" rule under the title is the
         most distinctive type on these pages. A legal document that does not
         say when it last changed is also asking the reader to take its currency
         on trust. The date is the imagery disclosure below — the first
         substantive clause this page has published. */
      lastUpdated="16 August 2026"
    >
      <LegalSection first>
        <LegalP>
          Our Terms of Use are currently being finalised and will be published on this page. The Terms of Use will
          govern access to and use of the vikasanasystems.tech website, and will sit alongside our{' '}
          <LegalLink to="/privacy-policy">Privacy Policy</LegalLink> and{' '}
          <LegalLink to="/cookie-policy">Cookie Policy</LegalLink>.
        </LegalP>
        <LegalP>
          If you have a question in the meantime about permitted use of this Site, please write to{' '}
          <LegalLink to="mailto:info@vikasanasystems.tech">info@vikasanasystems.tech</LegalLink>.
        </LegalP>
      </LegalSection>

      {/*
        Imagery disclosure. Published now rather than held back with the rest of
        the Terms, because it describes the Site as it stands today and the
        reason for saying it does not depend on the surrounding document being
        finished.

        This is the only place the disclosure is stated. It was briefly carried
        in the site footer as well; a notice repeated on every page of a site is
        read on none of them, and two copies of a legal statement are two things
        that can disagree.
      */}
      <LegalSection heading="Imagery on this Site" divider>
        <LegalP>
          Imagery on this site is AI-generated and does not depict real people, places, equipment
          or events. If anything here appears inaccurate or misrepresented, please write to{' '}
          <LegalLink to="mailto:info@vikasanasystems.tech">info@vikasanasystems.tech</LegalLink>.
        </LegalP>
        <LegalP>
          This applies to photographic imagery throughout the Site, including images of personnel,
          vehicles, aircraft, sensors, terrain and operational settings. Such images are
          illustrative of the environments and system types VIKASANA designs for. They should not
          be read as evidence of a deployment, a trial, a customer, or a fielded configuration.
        </LegalP>
        <LegalP>
          Product renders and interface screenshots are representations of designs and software in
          development, and may differ from any delivered system. Nothing shown in an image
          constitutes a specification, a certification, or a commitment; where a page states
          technical figures, those figures and their stated status govern, not the picture beside
          them.
        </LegalP>
        <LegalP>
          The same applies to material you may hold rights in: if you believe an image on this Site
          reproduces your work, write to us at the address above and we will review it.
        </LegalP>
      </LegalSection>
    </LegalLayout>
  );
}
