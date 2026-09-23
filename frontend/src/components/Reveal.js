import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

/*
  Reveal-on-scroll wrapper. Uses framer-motion + IntersectionObserver.
  Keep animations subtle and deliberate.

  This component is used in more than two hundred places, which makes it the
  single largest motion surface on the site — and it previously ignored
  prefers-reduced-motion entirely. Framer Motion defaults to
  reducedMotion: 'never', so the OS setting had no effect unless a component
  asked for it. Every other animated surface here honours the setting; this one
  is the one that mattered most and did not.

  Under reduced motion the content is rendered in its final state rather than
  animated into it. It is not merely a faster animation: the initial opacity is
  1, so the content is present and readable even if the observer never fires.
*/
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  once = true,
  className = '',
  as = 'div',
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once, margin: '-10% 0px -10% 0px' });
  const MotionTag = motion[as] || motion.div;

  if (reduce) {
    return (
      <MotionTag ref={ref} className={className}>
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
