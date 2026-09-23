import React from 'react';

/*
  Section marker: number, label, and a rule running out to the container edge.

  Contrast on the NUMBER was wrong in both themes and is corrected here.

    light   was #A3ADAA — 2.34:1 on white, against a 4.5:1 floor for text at
            12px. Now --stone-500 (#5F6355), 5.43:1, which is the value .meta
            already defaults to and the same correction SpecList records.
    dark    was #4A5148 — 2.35:1 on #0D0F10. Now --stone-300 (#848C89),
            5.44:1.

  The number is meant to read quieter than the label, and it still does: on
  light it sits at 5.43:1 against the label's 8.20:1, on dark at 5.44:1 against
  8.15:1. The hierarchy was being carried by a contrast failure; it is carried
  by a smaller, legible step now.

  The LABEL keeps the two values it already had, named rather than written out:
  --text-on-dark-2 (8.13:1 on ink) and --text-tertiary (7.21:1 on paper). Both
  were correct; the literals were the risk, since a literal does not follow the
  palette when the palette moves. The amber branch splits the same way the
  palette does — full-strength accent on ink, --amber-text on paper.

  gap-6 (24px), not gap-5 (20px) — the one off-eight value in a component every
  section on the site opens with.
*/
export default function SectionLabel({ number, label, dark = false, amber = false, className = '' }) {
  const color = amber
    ? (dark ? 'var(--amber)' : 'var(--amber-text)')
    : dark ? 'var(--text-on-dark-2)' : 'var(--text-tertiary)';
  const numColor = dark ? 'var(--stone-300)' : 'var(--stone-500)';
  return (
    <div className={`flex items-center gap-6 ${className}`}>
      {number && <span className="meta" style={{ color: numColor }}>{number}</span>}
      <span className="meta" style={{ color }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: dark ? 'var(--night-line)' : '#C7CFCB' }} />
    </div>
  );
}
