import type { Transition, Variants } from "framer-motion";

// ── Durations ──────────────────────────────────────────
export const DURATION = {
  fast: 0.1,
  normal: 0.2,
  slow: 0.3,
} as const;

// ── Transition presets ─────────────────────────────────
export const TRANSITION: Record<string, Transition> = {
  fast: { duration: DURATION.fast, ease: [0.25, 0.1, 0.25, 1.0] },
  normal: { duration: DURATION.normal, ease: [0.25, 0.1, 0.25, 1.0] },
  slow: { duration: DURATION.slow, ease: [0.25, 0.1, 0.25, 1.0] },
  spring: { type: "spring", stiffness: 400, damping: 30 },
  gentle: { type: "spring", stiffness: 300, damping: 25 },
};

// ── Variant presets (for AnimatePresence) ──────────────
export const VARIANTS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  } satisfies Variants,

  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  } satisfies Variants,

  slideDown: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  } satisfies Variants,

  slideUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  } satisfies Variants,

  slideInRight: {
    initial: { width: 0, opacity: 0 },
    animate: { width: 400, opacity: 1 },
    exit: { width: 0, opacity: 0 },
  } satisfies Variants,

  contextMenu: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  } satisfies Variants,

  toast: {
    initial: { opacity: 0, x: 80, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 80, scale: 0.95 },
  } satisfies Variants,
} as const;
