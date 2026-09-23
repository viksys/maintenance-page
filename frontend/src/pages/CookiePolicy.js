import React from 'react';
import LegalLayout, { LegalContact, LegalLink, LegalList, LegalP, LegalSection, LegalSubhead } from '@/components/LegalLayout';

function CookieTable() {
  const rows = [
    ['a.', 'Essential', 'Required for the Site to operate properly and to manage cookie consent preferences. Without these, core services such as consent storage and website security may not function.'],
    ['b.', 'Functional', 'Enable enhanced website functionality, such as tag management, embedded features, chat/support tools, font display, and interface preferences.'],
    ['c.', 'Analytics', 'Help us understand how Users interact with the Site, including pages visited, usage patterns, errors, and performance, so we can improve the Site and User experience.'],
    ['d.', 'Marketing', 'Used for advertising, remarketing, conversion tracking, and measuring the effectiveness of outreach campaigns across the Site and third-party platforms.'],
  ];
  return (
    <div className="mt-4 overflow-x-auto" style={{ border: '1px solid var(--stone-100)' }}>
      <table className="w-full text-[13.5px]" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--stone-50)' }}>
            {['Sr. No.', 'Category', 'Purpose'].map((h) => (
              <th key={h} className="meta text-left" style={{ padding: '12px 16px', borderBottom: '1px solid var(--stone-100)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--stone-100)', verticalAlign: 'top', color: 'var(--ink)', fontWeight: 600 }}>{r[0]}</td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--stone-100)', verticalAlign: 'top', color: 'var(--ink)', fontWeight: 600, whiteSpace: 'nowrap' }}>{r[1]}</td>
              <td style={{ padding: '14px 16px', borderBottom: '1px solid var(--stone-100)', verticalAlign: 'top', color: 'var(--text-tertiary)' }}>{r[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      lastUpdated="22 January 2026"
    >
      <LegalSection first>
        <LegalP>
          <strong>VIKASANA Systems Private Limited</strong> (the &ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo; or
          &ldquo;our&rdquo;) is committed to transparency about how we use cookies and similar tracking technologies on
          our website and related services (collectively, the &ldquo;Site&rdquo;). This Cookie Policy explains what
          cookies are, how we use them, what rights you have, and how you can manage or decline cookies.
        </LegalP>
        <LegalP>
          Please also refer to our{' '}
          <LegalLink to="/privacy-policy">Privacy Policy</LegalLink>,
          which governs the broader collection, use and disclosure of personal data on our website at{' '}
          <strong>vikasanasystems.tech</strong>.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Definitions">
        <LegalSubhead>What Are Cookies</LegalSubhead>
        <LegalP>
          A &ldquo;cookie&rdquo; is a small piece of text sent by the Site to your browser (or device) when you visit,
          which is then stored on your device and read back on subsequent visits. Cookies may help recognise your
          device when you return, and support functionality (e.g. log-in), site performance, analytics, or
          advertising. Some cookies are set by us (&ldquo;first-party cookies&rdquo;) and some by third parties (e.g.
          analytics partners) (&ldquo;third-party cookies&rdquo;).
        </LegalP>
        <LegalP>
          Cookies vary in lifespan: &ldquo;session cookies&rdquo; expire once you close your browser; &ldquo;persistent
          cookies&rdquo; remain on your device for a defined period (or until you delete them). Cookies may collect
          various types of information including technical data (browser type, operating system), usage data
          (pages visited, time spent), device identifiers, location information, IP address, preferences, and
          behavioural data.
        </LegalP>
      </LegalSection>

      <LegalSection heading="General Purpose">
        <LegalP>
          The primary purpose of this Policy is to inform Users about the use of cookies and similar tracking
          technologies on the Company&rsquo;s website. By explaining what cookies are, how they function, what
          types are used (session, persistent, or third-party), and the specific data they collect — such as
          preferences, browsing behaviour, or session status — this Policy empowers Users to make informed
          decisions about their privacy. It also outlines how Users can manage or disable cookies through browser
          settings or consent tools.
        </LegalP>
        <LegalP>
          We also use similar tracking technologies, such as web beacons, pixels, and local storage objects, which
          function similarly to cookies by collecting and storing information on your device to support the
          purposes described in this Policy.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Types of Cookies We Use and Purpose">
        <LegalP>We use the following categories of cookies and similar technologies on our Site for the purposes outlined below.</LegalP>
        <CookieTable />
      </LegalSection>

      <LegalSection heading="Information We Collect Through Cookies">
        <LegalP>Through cookies and similar technologies, we may collect or access the following:</LegalP>
        <LegalList
          items={[
            'Device identifiers (e.g. randomly generated identifiers, device ID)',
            'IP address or parts of it',
            'Browser and operating system type, screen resolution, device type',
            'Referrer URL, pages visited on our Site, time spent, navigation path, clicks',
            'Location data (in coarse form) from IP address or device settings',
            'Preference information (language selected, region)',
            'Data about your interaction with our Site and our services (e.g. whether you open a pop-up, respond to a survey)',
          ]}
        />
        <LegalP>
          For third-party cookies, additional information may be processed by third parties in accordance with
          their own policies.
        </LegalP>
        <LegalP>
          If any cookie collects personal data (i.e. information about an individual who is identified or
          identifiable) or sensitive personal data, that processing will be subject to the (Indian) Digital
          Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;), insofar as it applies, and consent will be
          required. We will retain cookie data only as long as needed for the purpose it was collected, or as
          required under our data retention practices.
        </LegalP>
        <LegalP>The following specific data points may be collected through cookies:</LegalP>
        <LegalList
          items={[
            'Authentication tokens and session identifiers',
            'User preferences and settings (language, timezone, display preferences)',
            'Clickstream data and navigation patterns',
            'Form submission data (where applicable)',
            'Timestamp of visits and interactions',
            'Unique browser or device fingerprints',
          ]}
        />
      </LegalSection>

      <LegalSection heading="How Cookies Are Used">
        <LegalP>
          At VIKASANA Systems Private Limited, we use cookies and similar tracking technologies (such as web
          beacons, pixels, and local storage) to enhance your experience, improve our website&rsquo;s
          functionality, and support our analytics efforts. Cookies help us:
        </LegalP>
        <LegalList
          items={[
            <><strong>Operate and secure our website</strong> — maintaining session integrity, load balancing, and security features (e.g. authentication tokens, fraud prevention).</>,
            <><strong>Improve performance</strong> — collecting statistical data about how Users interact with the Site (e.g. which pages are visited, how long Users stay, which links are clicked).</>,
            <><strong>Remember preferences</strong> — such as language, location, or display settings, to provide a more personalised browsing experience.</>,
            <><strong>Deliver relevant content</strong> — using insights from browsing patterns to show information likely to be of interest.</>,
            <><strong>Analyse and optimise User experience</strong> — identifying usability issues and improving design and navigation based on aggregate analytics.</>,
          ]}
        />
        <LegalSubhead>Additional Uses</LegalSubhead>
        <LegalList
          items={[
            'Providing customer and partner support, and troubleshooting technical issues.',
            'Complying with legal obligations and responding to lawful requests from authorities.',
            'Detecting, preventing, and addressing technical issues, security vulnerabilities, and fraudulent activity.',
            'Facilitating business communications such as processing enquiries and briefing requests.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="User Consent">
        <LegalSubhead>Basis of Consent</LegalSubhead>
        <LegalP>
          Under the DPDP Act, cookies that collect or process personal data require explicit and informed consent
          from the User — except for cookies strictly necessary for website operation. Accordingly, essential
          cookies (necessary for site functionality, security, or authentication) are used without requiring
          consent, and non-essential cookies (functional, analytics, marketing) are placed only after consent has
          been given through our cookie banner or preference settings.
        </LegalP>
        <LegalSubhead>How We Obtain Consent</LegalSubhead>
        <LegalP>When you visit our website for the first time, you will see a cookie consent banner. You can choose to:</LegalP>
        <LegalList items={['Accept all cookies', 'Deny all non-essential cookies', 'Manage preferences (choose categories you consent to)']} />
        <LegalSubhead>Withdrawing or Modifying Consent</LegalSubhead>
        <LegalP>You can modify or withdraw your consent at any time by:</LegalP>
        <LegalList items={['Visiting the "Cookie Settings" link in our website footer.', 'Adjusting your browser settings to refuse or delete cookies.']} />
        <LegalP>Upon withdrawal of consent:</LegalP>
        <LegalList
          items={[
            'We will immediately cease placing new cookies of the withdrawn categories.',
            'Existing cookies will be deleted or allowed to expire naturally.',
            'Your preference will be recorded and respected in future visits.',
            'You will continue to have full access to our Site (subject to essential cookies required for basic functionality).',
          ]}
        />
        <LegalP>
          <strong>Record keeping:</strong> we maintain a record of consents and preferences — including the
          timestamp of consent/withdrawal, categories consented to or rejected, an IP address or anonymised
          identifier, and consent-mechanism version — to demonstrate compliance with the DPDP Act and applicable
          data protection rules. These records are stored securely and retained in accordance with our data
          retention policy and applicable legal requirements.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Managing and Controlling Cookies">
        <LegalP>
          You may manage or disable cookies via your browser settings (for example, through &ldquo;Preferences&rdquo;
          or &ldquo;Settings&rdquo;) or via our cookie banner. Please note that if you disable or refuse certain
          cookies, the Site may not operate properly, or some services may degrade.
        </LegalP>
        <LegalSubhead>On Many Browsers You Can</LegalSubhead>
        <LegalList
          items={[
            'See what cookies are set and delete them',
            'Block cookies from being set in future',
            'Block third-party cookies',
            'Set the browser to prompt you each time a cookie is set',
          ]}
        />
        <LegalP>
          You may also use &ldquo;Do Not Track&rdquo; signals or privacy extensions, though we cannot guarantee our
          ability to respond, or that all third-party cookies will honour these signals.
        </LegalP>
        <LegalSubhead>Disabling Certain Cookies May Result In</LegalSubhead>
        <LegalList
          items={[
            'Inability to log in or maintain sessions',
            'Loss of personalised settings and preferences',
            'Reduced website functionality and User experience',
            'Inability to access certain features requiring authentication',
          ]}
        />
      </LegalSection>

      <LegalSection heading="Third-Party Cookies">
        <LegalP>
          Some cookies on our Site may be set by third-party partners (for analytics, embedded content, or social
          media integrations). These third parties may process cookies for their own purposes and may combine the
          information with other information they have collected about you. We do not fully control the setting of
          these third-party cookies and encourage you to review their cookie policies and how they manage your
          data.
        </LegalP>
        <LegalSubhead>Cross-Site Tracking</LegalSubhead>
        <LegalP>
          Some third-party cookies may track you across multiple websites to build advertising profiles. You can
          opt out of interest-based advertising through your browser or device settings.
        </LegalP>
        <LegalSubhead>Embedded Content</LegalSubhead>
        <LegalP>
          When you interact with embedded content from third-party platforms (such as video, social feeds, or
          maps), those platforms may set their own cookies. We have no control over these cookies.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Cookie Retention and Expiry">
        <LegalP>
          Each cookie has its own lifespan, which may vary depending on category and purpose. Some expire at the
          end of your session; others may persist for days, months, or until you proactively delete them. We
          periodically review all cookies used on our Site to ensure they remain necessary and relevant to our
          business operations.
        </LegalP>
        <LegalP>
          If you withdraw your consent from a particular cookie category, we will respect your choice and cease
          using those cookies for subsequent sessions. Data already collected through such cookies will continue to
          be processed or retained in accordance with our retention policy and applicable legal requirements.
        </LegalP>
        <LegalP>
          Cookie-derived data is generally organised into the categories set out above (Essential, Functional,
          Analytics, Marketing). Consent-management data is retained as required to store and manage preferences.
          Functional and analytics data is typically retained only as long as required for the underlying service,
          commonly on the order of session-length to several months depending on configuration. Where marketing or
          attribution cookies are used, retention is generally aligned with the configured campaign-attribution
          period of the relevant service.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Legal Basis and Compliance">
        <LegalSubhead>Compliance with Applicable Laws</LegalSubhead>
        <LegalP>
          The use of cookies and similar technologies by VIKASANA Systems Private Limited is governed by
          applicable data protection and information technology laws in India, including but not limited to the
          DPDP Act, the Information Technology Act, 2000, and the Information Technology (Reasonable Security
          Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (&ldquo;SPDI Rules&rdquo;).
        </LegalP>
        <LegalSubhead>Legal Basis for Processing</LegalSubhead>
        <LegalP>
          We process personal data obtained through cookies on the basis of explicit User consent, as required
          under Section 6 of the DPDP Act. Strictly necessary cookies are used under the legal principle of
          legitimate interest, as they are essential for the operation, security, and accessibility of our website.
          For non-essential cookies (analytics, functional, and marketing), we obtain prior and informed consent
          through our cookie banner or preference centre before deploying such technologies.
        </LegalP>
        <LegalSubhead>User Rights and Remedies</LegalSubhead>
        <LegalP>As a Data Principal under the DPDP Act, you have the right to:</LegalP>
        <LegalList
          items={[
            'Be informed of the use and purpose of cookies;',
            'Provide, refuse, or withdraw consent at any time;',
            'Seek correction, erasure, or grievance redressal related to cookie data.',
          ]}
        />
        <LegalP>
          Requests or complaints may be addressed to us at{' '}
          <LegalLink to="mailto:info@vikasanasystems.tech">info@vikasanasystems.tech</LegalLink>.
          We will acknowledge and respond to such requests in accordance with the timelines prescribed under
          applicable law.
        </LegalP>
        <LegalSubhead>Cross-Border Data Transfers</LegalSubhead>
        <LegalP>
          Certain third-party cookies (such as analytics tools) may transfer data outside India. Such transfers are
          made in compliance with Section 16 of the DPDP Act (as amended from time to time) and any
          government-notified restrictions. Where applicable, contractual and technical safeguards are in place to
          ensure equivalent protection of personal data.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Limitations of Liability">
        <LegalP>We are not liable for:</LegalP>
        <LegalList
          items={[
            'Third-party cookie practices beyond our reasonable control.',
            'Users who interact with third-party services at their own discretion.',
            'Any disputes with third parties regarding their cookie practices, which should be directed to those parties.',
          ]}
        />
        <LegalP>
          We take all reasonable steps to ensure compliance with applicable privacy and security laws; however, we
          are not responsible for the data practices of third-party cookie providers. Users are encouraged to
          review the privacy and cookie policies of such third parties to understand their respective obligations
          and data-handling practices.
        </LegalP>
        <LegalP>
          For cookies that are strictly necessary, we may place them without prior consent, because they are
          required for the Site to function. For non-essential cookies that process personal data or track User
          behaviour beyond what is strictly necessary, we will seek informed consent prior to placing those
          cookies. If you choose to refuse or withdraw consent for non-essential cookies, you may still use our
          Site, but some features might not work properly. We will keep records of your consent and preference
          settings, and honour them.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Children Under 18 Years">
        <LegalP>The DPDP Act provides special protection for children (individuals under 18 years). In line with this:</LegalP>
        <LegalList
          items={[
            'We do not knowingly collect personal data from children without verifiable parental or guardian consent.',
            'Our website is not directed at children, and we do not knowingly use targeting cookies for individuals under 18.',
            'If we become aware that we have collected data from a child without proper consent, we will delete such information promptly.',
          ]}
        />
        <LegalP>
          Parents or guardians can contact us at{' '}
          <LegalLink to="mailto:info@vikasanasystems.tech">info@vikasanasystems.tech</LegalLink>{' '}
          to request deletion of their child&rsquo;s data.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Intimation of Breach">
        <LegalP>In case of a personal data breach involving cookie data, we will:</LegalP>
        <LegalList
          items={[
            'Notify the Data Protection Board within 72 (seventy-two) hours of becoming aware, as required.',
            'Notify affected Users without undue delay if the breach is likely to result in high risk to their rights.',
            'Take immediate remedial measures to contain and mitigate the breach.',
          ]}
        />
      </LegalSection>

      <LegalSection heading="Policy Updates / Changes">
        <LegalP>
          We may update this Cookie Policy from time to time, for example to reflect changes in cookies used,
          third-party services, or applicable law. When we do, we will update the &ldquo;Last Updated&rdquo; date at
          the top of this Policy. We encourage you to review this Policy periodically. Your continued use of the
          Site after any change constitutes acceptance of the revised Policy.
        </LegalP>
      </LegalSection>

      <LegalSection heading="Contact Information" divider>
        <LegalP>
          If you have any questions, comments, grievances or requests regarding this Cookie Policy or our cookie
          practices, please contact us at:
        </LegalP>
        <LegalContact />
        <LegalP>
          <span className="block mt-6">
            This Cookie Policy shall be read in conjunction with our{' '}
            <LegalLink to="/privacy-policy">Privacy Policy</LegalLink>.
          </span>
        </LegalP>
      </LegalSection>
    </LegalLayout>
  );
}
