import type { Transition, Variants } from "framer-motion";

export const CINEMATIC_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const MOTION_TIMINGS = {
  commandant: 1.2,
  image: 0.84,
  textStagger: 0.12,
  textDelay: 0.3,
  microTapScale: 0.97,
  microHoverScale: 1.03,
  microHoverY: -5,
} as const;

export const cinematicTransition = (
  duration: number,
  overrides?: Partial<Transition>,
): Transition => ({
  duration,
  ease: CINEMATIC_EASE,
  ...overrides,
});

export const layeredSlideVariants: Variants = {
  initial: (direction: 1 | -1 = 1) => ({
    opacity: 0,
    x: direction * 210,
    y: 14,
    scale: 0.94,
    rotateZ: direction * 0.7,
    filter: "blur(11px)",
  }),
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotateZ: 0,
    filter: "blur(0px)",
  },
  exit: (direction: 1 | -1 = 1) => ({
    opacity: 0,
    x: -direction * 170,
    y: -10,
    scale: 0.965,
    rotateZ: -direction * 0.45,
    filter: "blur(9px)",
  }),
};

export const textStaggerContainer: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: MOTION_TIMINGS.textStagger,
      delayChildren: MOTION_TIMINGS.textDelay,
    },
  },
};

export const textStaggerItem: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export const activeCardStates = {
  active: { opacity: 1, scale: 1 },
  inactive: { opacity: 0.55, scale: 0.93 },
} as const;
