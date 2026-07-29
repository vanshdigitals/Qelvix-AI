import type { SpringOptions, Transition, Variants } from 'framer-motion';

/** Standard easing from 05 §3.3. Every transition on the page uses it. */
export const EASE = [0.2, 0, 0, 1] as const;
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.12,
  base: 0.2,
  slow: 0.32,
} as const;

export const SPRING: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 0.8 };
export const SPRING_SOFT: Transition = { type: 'spring', stiffness: 140, damping: 22, mass: 0.9 };

/** useSpring takes SpringOptions, not a full Transition. */
export const SPRING_OPTIONS: SpringOptions = { stiffness: 260, damping: 30, mass: 0.8 };
export const SPRING_SOFT_OPTIONS: SpringOptions = { stiffness: 140, damping: 22, mass: 0.9 };

export type RevealVariant = 'up' | 'left' | 'right' | 'scale' | 'blur' | 'fade';

const OFFSET = 16;

export const REVEAL_VARIANTS: Record<RevealVariant, Variants> = {
  up: {
    hidden: { opacity: 0, y: OFFSET },
    visible: { opacity: 1, y: 0 },
  },
  left: {
    hidden: { opacity: 0, x: -OFFSET },
    visible: { opacity: 1, x: 0 },
  },
  right: {
    hidden: { opacity: 0, x: OFFSET },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.97 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(8px)', y: OFFSET * 0.5 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
};

/** Reduced motion collapses every variant to a plain opacity change. */
export const REDUCED_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

/** Fires once, at 15% into the viewport — never re-animates on scroll-up. */
export const VIEWPORT = { once: true, amount: 0.15 } as const;

export const STAGGER_CHILDREN = 0.06;
