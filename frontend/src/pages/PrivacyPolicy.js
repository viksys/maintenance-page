import React from 'react';
import LegalLayout, { LegalContact, LegalLink, LegalList, LegalP, LegalSection } from '@/components/LegalLayout';

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="10 March 2026"
    >
      <LegalSection first>
        <LegalP>
          This Privacy Policy governs the manner in which VIKASANA Systems Private Limited (&ldquo;VIKASANA,&rdquo;
          &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo; or &ldquo;our&rdquo;) collects, uses, maintains and discloses information
          collected from users (each, a &ldquo;User&rdquo;) of the <strong>vikasanasystems.tech</strong> website
          (the &ldquo;Site&rdquo;). This Privacy Policy applies to the Site and all products and services offered by
          VIKASANA Systems Private Limited.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Personal Identification Information">
        <LegalP>
          We may collect personal identification information from Users in a variety of ways, including, but not
          limited to, when Users visit our Site, register interest, request a briefing, respond to a survey, fill
          out a form, and in connection with other activities, services, features or resources we make available
          on our Site.
        </LegalP>
        <LegalP>
          Users may be asked for, as appropriate, name, email address, phone number, mailing address, organisation
          or company information, role/designation, and/or government-issued identification where required by law
          (for example, to verify eligibility for defence or government engagement).
        </LegalP>
        <LegalP>
          Users may, however, visit our Site anonymously. We will collect personal identification information from
          Users only if they voluntarily submit such information to us. Users can always refuse to supply personal
          identification information, except that it may prevent them from engaging in certain Site-related
          activities, such as requesting a technical briefing or submitting a careers application.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Non-Personal Identification Information">
        <LegalP>
          We may collect non-personal identification information about Users whenever they interact with our Site.
          Non-personal identification information may include the browser name, the type of device and technical
          information about a User&rsquo;s means of connection to our Site, such as the operating system and the
          internet service provider utilised, and other similar information including, but not limited to, IP
          addresses, device identifiers, log files, location data, and usage patterns.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Web Browser Cookies and Similar Technologies">
        <LegalP>
          Our Site may use &ldquo;cookies&rdquo; and similar tracking technologies such as web beacons, pixels, and
          local storage to enhance User experience. A User&rsquo;s web browser places cookies on their device for
          record-keeping purposes and sometimes to track information about them. Users may choose to set their web
          browser to refuse cookies, or to alert them when cookies are being sent. If they do so, note that some
          parts of the Site may not function properly.
        </LegalP>
        <LegalP>
          We may use both session cookies (which expire when the browser is closed) and persistent cookies (which
          remain on a device until deleted). Third-party analytics partners may also use cookies and similar
          technologies on our Site. Please refer to our{' '}
          <LegalLink to="/cookie-policy">
            Cookie Policy
          </LegalLink>{' '}
          for further details on web browser cookies.
        </LegalP>
      </LegalSection>

      <LegalSection heading="How We Use Collected Information">
        <LegalP>VIKASANA Systems Private Limited may collect and use Users&rsquo; personal information for the following purposes:</LegalP>
        <LegalList
          items={[
            <><strong>To improve customer and partner service:</strong> information Users provide helps us respond to enquiries, technical briefing requests, and support needs more efficiently.</>,
            <><strong>To personalise User experience:</strong> we may use information in the aggregate to understand how our Users, as a group, use the services and resources provided on our Site.</>,
            <><strong>To improve our Site:</strong> we may use the feedback Users provide to improve our products and services.</>,
            <><strong>To process enquiries and requests:</strong> we may use the information Users provide when submitting a briefing request, careers application, or partnership enquiry only to fulfil that request.</>,
            <><strong>To run a survey or other Site feature.</strong></>,
            <><strong>To send Users information they agreed to receive</strong> about topics we believe will be of interest to them.</>,
            <><strong>To send periodic communications:</strong> we may use an email address to respond to inquiries, questions, and/or other requests, and to send updates a User has opted in to receive. If a User would like to unsubscribe from receiving future communications, unsubscribe instructions are included at the bottom of each email, or the User may contact us via our Site.</>,
            <><strong>To comply with legal obligations:</strong> we may use and disclose information to comply with applicable laws, regulations, legal processes, or enforceable governmental requests.</>,
            <><strong>To protect our rights and property:</strong> we may use information to protect the safety, rights, property, or security of VIKASANA Systems Private Limited, our Users, or the public.</>,
            <><strong>For business transfers:</strong> in the event of a merger, acquisition, reorganisation, or sale of assets, information may be transferred as part of that transaction.</>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="Third-Party Service Providers">
        <LegalP>
          We may employ third-party companies and individuals to facilitate our service, provide services on our
          behalf, perform Site-related services, or assist us in analysing how our Site is used. These third
          parties may have access to Users&rsquo; personal information only to perform these tasks on our behalf.
          Such third parties may include:
        </LegalP>
        <LegalList
          items={[
            'Cloud storage and infrastructure providers',
            'Analytics services',
            'Email service providers',
            'Customer and partner support platforms',
          ]}
        />
      </LegalSection>

      <LegalSection heading="Data Retention">
        <LegalP>
          We will retain personal information only for as long as necessary to fulfil the purposes outlined in this
          Privacy Policy, unless a longer retention period is required or permitted by law. When we no longer need
          personal information, we will securely delete or anonymise it.
        </LegalP>
      </LegalSection>

      <LegalSection heading="How We Protect Your Information">
        <LegalP>
          We adopt appropriate data collection, storage and processing practices and security measures to protect
          against unauthorised access, alteration, disclosure or destruction of personal information, credentials,
          and data stored on our Site.
        </LegalP>
        <LegalP>
          Sensitive and private data exchanged between the Site and its Users happens over an encrypted,
          SSL-secured communication channel. However, no method of transmission over the internet or electronic
          storage is 100% secure, and we cannot guarantee absolute security. In the event of a data breach that
          affects personal information, we will notify affected Users and relevant authorities as required by
          applicable law.
        </LegalP>
      </LegalSection>

      <LegalSection heading="International Data Transfers">
        <LegalP>
          Information may be transferred to and processed in countries other than a User&rsquo;s country of
          residence. These countries may have data protection laws that differ from the laws of the User&rsquo;s
          country. We take appropriate safeguards to ensure that personal information remains protected in
          accordance with this Privacy Policy, including through the use of standard contractual clauses or other
          approved transfer mechanisms, where applicable.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Children's Privacy">
        <LegalP>
          Our Site is not intended for children under the age of 18 (eighteen) years. We do not knowingly collect
          personal information from children. If a parent or guardian believes that their child has provided us
          with personal information, please contact us immediately and we will take steps to delete such
          information.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Links to Third-Party Websites">
        <LegalP>
          Our Site may contain links to third-party websites that are not operated by us. We have no control over,
          and assume no responsibility for, the content, privacy policies, or practices of any third-party sites or
          services. We encourage Users to review the privacy policy of every site they visit.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Changes to This Privacy Policy">
        <LegalP>
          VIKASANA Systems Private Limited has the discretion to update this Privacy Policy at any time. When we
          do, we will revise the &ldquo;Last Updated&rdquo; date at the top of this page. We encourage Users to
          frequently check this page for changes to stay informed about how we are helping to protect the personal
          information we collect. Users acknowledge and agree that it is their responsibility to review this
          Privacy Policy periodically and become aware of modifications.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Contact Information" divider>
        <LegalP>
          If you have any questions about this Privacy Policy, your personal information, or wish to exercise your
          rights, please contact us:
        </LegalP>
        <LegalContact />
      </LegalSection>
    </LegalLayout>
  );
}
