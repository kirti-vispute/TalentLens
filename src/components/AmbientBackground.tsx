"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * A fixed, decorative gradient wash behind every page — purely visual,
 * never intercepts clicks (pointer-events-none) and sits behind content
 * (negative z-index). Disabled for users who prefer reduced motion.
 */
export function AmbientBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="absolute -top-40 -left-32 h-[32rem] w-[32rem] rounded-full opacity-[0.16] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        animate={
          reduceMotion
            ? undefined
            : { x: [0, 40, -10, 0], y: [0, 20, 40, 0] }
        }
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--success), transparent 70%)" }}
        animate={
          reduceMotion
            ? undefined
            : { x: [0, -30, 10, 0], y: [0, -20, -40, 0] }
        }
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
