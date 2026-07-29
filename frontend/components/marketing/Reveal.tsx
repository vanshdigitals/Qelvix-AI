'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

import {
  DURATION,
  EASE_OUT,
  REDUCED_VARIANTS,
  REVEAL_VARIANTS,
  STAGGER_CHILDREN,
  VIEWPORT,
  type RevealVariant,
} from '@/lib/motion/tokens';

type Element = 'div' | 'li' | 'section' | 'p' | 'h2' | 'span' | 'ul' | 'ol';

interface RevealProps {
  children: ReactNode;
  index?: number;
  delayStep?: number;
  className?: string;
  as?: Element;
  variant?: RevealVariant;
  duration?: number;
}

/** Scroll reveal: transform + opacity only, fires once, lazily on view. */
export function Reveal({
  children,
  index = 0,
  delayStep = STAGGER_CHILDREN,
  className,
  as = 'div',
  variant = 'up',
  duration = DURATION.slow,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={reduceMotion ? REDUCED_VARIANTS : REVEAL_VARIANTS[variant]}
      transition={{
        duration: reduceMotion ? DURATION.fast : duration,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : index * delayStep,
      }}
      className={className}
    >
      {children}
    </Component>
  );
}

/**
 * Parent that staggers its RevealChild descendants. Use when children should
 * cascade rather than each computing its own delay.
 */
export function RevealGroup({
  children,
  className,
  as = 'div',
  stagger = STAGGER_CHILDREN,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  as?: Element;
  stagger?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduceMotion ? 0 : stagger,
            delayChildren: reduceMotion ? 0 : delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </Component>
  );
}

export function RevealChild({
  children,
  className,
  as = 'div',
  variant = 'up',
  duration = DURATION.slow,
}: {
  children: ReactNode;
  className?: string;
  as?: Element;
  variant?: RevealVariant;
  duration?: number;
}) {
  const reduceMotion = useReducedMotion();
  const Component = motion[as];

  return (
    <Component
      variants={reduceMotion ? REDUCED_VARIANTS : REVEAL_VARIANTS[variant]}
      transition={{ duration: reduceMotion ? DURATION.fast : duration, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </Component>
  );
}
