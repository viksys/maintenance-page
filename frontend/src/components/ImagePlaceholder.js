import React from 'react';

/*
  Image placeholder. Consistent, engineered aesthetic so real images slot in
  cleanly later. Corner marks + a mono label + resolution hint.
*/
/*
  The corner marks on a dark slot, named rather than written out four times.

  It is NOT --night-line (#2E2E2E). The nearest palette token is one step
  darker, and the marks are already at the edge of visible on --night-2 — the
  slot's whole job is to say "an image belongs here", and it says it with four
  corners. Naming the value costs nothing; shifting it to reach a token would
  be a rendered change made for tidiness, which is the one reason this codebase
  does not accept for one.

  The marks are decoration and carry no information, so no contrast floor
  applies. The two TEXT lines inside the slot are a separate matter and are
  handled by the tokens noted below.
*/
const DARK_CORNER_MARK = '#3a3a3a';

export default function ImagePlaceholder({
  ratio = '16/9',
  label = 'IMAGE',
  spec,
  dark = false,
  className = '',
  children,
}) {
  return (
    <div
      className={`img-slot ${dark ? 'img-slot-dark' : ''} ${className}`}
      style={{ aspectRatio: ratio }}
    >
      <span className="corner-mark tl" style={dark ? { borderColor: DARK_CORNER_MARK } : {}} />
      <span className="corner-mark tr" style={dark ? { borderColor: DARK_CORNER_MARK } : {}} />
      <span className="corner-mark bl" style={dark ? { borderColor: DARK_CORNER_MARK } : {}} />
      <span className="corner-mark br" style={dark ? { borderColor: DARK_CORNER_MARK } : {}} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {/*
            These two lines are TEXT, and they were painted as if they were
            texture: #5a5a5a is 2.72:1 on --night-2 and #8a8a8a is about 3.0:1 on
            --stone-50, with the spec line a further step down at #3a3a3a /
            #b4b4b4 — 1.3:1 and 1.6:1, which is not dim, it is absent.

            The slot is not decoration. Where no <img> is passed it is the only
            thing standing in for the image, and the label says which image is
            missing; where an <img> IS passed it sits underneath and is never
            seen, so nothing is lost by making it legible. Both lines take the
            dimmest passing token for their surface — --text-on-dark-3 at 4.90:1
            on the dark slot, --text-secondary at 5.45:1 on paper.

            The label and the spec are the same colour now. They were separated
            by a second colour step; they are separated by size and tracking
            instead, which is a distinction that survives being readable.
          */}
          <div className="meta" style={{ color: dark ? 'var(--text-on-dark-3)' : 'var(--text-secondary)', letterSpacing: '0.3em' }}>{label}</div>
          {spec && <div className="meta mt-1" style={{ color: dark ? 'var(--text-on-dark-3)' : 'var(--text-secondary)', fontSize: 10, letterSpacing: '0.15em' }}>{spec}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}
