import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Reveal from '@/components/Reveal';
import SectionLabel from '@/components/SectionLabel';

/*
  Site Map — a complete, hand-maintained index of every public route registered
  in App.js (plus the data-driven /hardware detail pages sourced
  from src/data). Organised for
  both human navigation and search-engine crawlability.
*/

const sections = [
  {
    label: 'Products',
    number: '01',
    groups: [
      {
        heading: 'Platforms',
        links: [
          { label: 'VIKASANA Control — Command & Control', to: '/products/platform' },
          { label: 'VIKASANA Edge — Tactical Edge Computing', to: '/products/field-station' },
          { label: 'VIKASANA Core — Mission Management & Intelligence', to: '/products/handheld' },
        ],
      },
      {
        heading: 'Software',
        links: [
          { label: 'DRISHTIKON', to: '/software/drishtikon' },
        ],
      },
      {
        heading: 'Hardware',
        links: [
          { label: 'Hardware Overview', to: '/hardware' },
          { label: 'Rugged Mission PC (GCS-X-L)', to: '/hardware/gcs-x-l' },
          { label: 'Tactical Tablet (GCS-X-H)', to: '/hardware/gcs-x-h' },
          { label: 'Edge Compute Module (ECM-X)', to: '/hardware/ecm-x' },
        ],
      },
    ],
  },
  {
    label: 'Company',
    number: '02',
    groups: [
      {
        heading: 'About',
        links: [
          { label: 'About Us', to: '/company' },
          { label: 'Contact Us', to: '/contact' },
        ],
      },
      {
        heading: 'Work With Us',
        links: [
          { label: 'Careers', to: '/careers' },
        ],
      },
    ],
  },
  {
    label: 'Resources',
    number: '03',
    groups: [
      {
        heading: 'Knowledge',
        links: [
          { label: 'Knowledge Base', to: '/knowledge' },
        ],
      },
    ],
  },
  {
    label: 'Legal',
    number: '04',
    groups: [
      {
        heading: 'Policies',
        links: [
          { label: 'Privacy Policy', to: '/privacy-policy' },
          { label: 'Cookie Policy', to: '/cookie-policy' },
          { label: 'Security Policy', to: '/security-policy' },
          { label: 'Terms of Use', to: '/terms-of-use' },
          { label: 'Site Map', to: '/site-map' },
        ],
      },
    ],
  },
];

export default function SiteMap() {
  return (
    <div>
      <Header variant="light" />
      <main id="main-content" tabIndex={-1}>
        <section className="relative" style={{ background: 'var(--white)' }}>
          <div className="absolute inset-0 grid-fine opacity-50" />
          <div className="container-x hero-x relative">
            <Reveal>
              <div className="meta mb-6">{'// Legal — Site Map'}</div>
            </Reveal>
            <Reveal delay={0.1}>
              <h1 className="h-display fs-hero-sm measure-hero">Site Map</h1>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="stack-lead measure-copy copy-lead" style={{ color: 'var(--text-tertiary)' }}>
                A complete index of every public page on vikasanasystems.tech, organised by section — for visitors
                and search engines alike.
              </p>
            </Reveal>
          </div>
        </section>

        {sections.map((s, si) => (
          <section key={s.label} style={{ background: si % 2 === 0 ? 'var(--text-on-dark)' : 'var(--stone-50)' }}>
            <div className="container-x section-y-sm">
              <Reveal>
                <SectionLabel number={`${s.number} / 08`} label={s.label} className="mb-10" />
              </Reveal>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
                {s.groups.map((g) => (
                  <Reveal key={g.heading}>
                    <div className="meta mb-5" style={{ color: 'var(--ink)' }}>{g.heading}</div>
                    <ul className="space-y-2.5">
                      {g.links.map((l) => (
                        <li key={l.to}>
                          <Link
                            to={l.to}
                            className="text-[13.5px] transition-colors"
                            style={{ color: 'var(--text-tertiary)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        ))}
      </main>
      <Footer variant="dark" />
    </div>
  );
}
