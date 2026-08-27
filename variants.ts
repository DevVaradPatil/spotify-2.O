import type { Variants } from "framer-motion";

/**
 * Shared framer-motion variants.
 *
 * Converted from variants.js: framer-motion 13 types `transition.type` as a
 * union rather than a plain string, so an untyped `type` argument no longer
 * satisfies it. The `type` parameter is now constrained, and callers that
 * passed an empty string get the sensible default instead.
 */
export type Direction = "left" | "right" | "up" | "down" | "";
export type TransitionType = "spring" | "tween" | "keyframes" | "inertia";

const resolveType = (type?: string): TransitionType =>
  type === "spring" || type === "tween" || type === "keyframes" || type === "inertia"
    ? type
    : "tween";

export const textVariant = (delay: number): Variants => ({
  hidden: {
    y: -50,
    opacity: 0,
  },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      duration: 0.3,
      delay,
    },
  },
});

export const fadeIn = (
  direction: Direction,
  type: string,
  delay: number,
  duration: number
): Variants => ({
  hidden: {
    x: direction === "left" ? 100 : direction === "right" ? -100 : 0,
    y: direction === "up" ? 100 : direction === "down" ? -100 : 0,
    opacity: 0,
  },
  show: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: {
      type: resolveType(type),
      delay,
      duration,
      ease: "easeOut",
    },
  },
});

export const zoomIn = (delay: number, duration: number): Variants => ({
  hidden: {
    scale: 0,
    opacity: 0,
  },
  show: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "tween",
      delay,
      duration,
      ease: "easeOut",
    },
  },
});

export const slideIn = (
  direction: Direction,
  type: string,
  delay: number,
  duration: number
): Variants => ({
  hidden: {
    x: direction === "left" ? "-100%" : direction === "right" ? "100%" : 0,
    y: direction === "up" ? "100%" : direction === "down" ? "100%" : 0,
    opacity: 0,
  },
  show: {
    x: 0,
    y: 0,
    opacity: 1,
    transition: {
      type: resolveType(type),
      delay,
      duration,
      ease: "easeOut",
    },
  },
});

export const staggerContainer = (
  staggerChildren: number,
  delayChildren = 0
): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren,
      delayChildren,
    },
  },
});
