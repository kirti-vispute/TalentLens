"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * A fixed, decorative gradient wash behind every page — purely visual,
 * never intercepts clicks (pointer-events-none) and sits behind content
 * (negative z-index). Users who prefer reduced motion still get a
 * gentle, much slower drift rather than nothing at all — the brief's
 * ask for a "live" feel wins out over fully freezing it.
 */
export function AmbientBackground() {
  const reduceMotion = useReducedMotion();
  const speed = reduceMotion ? 3 : 1;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="absolute -top-40 -left-32 h-[34rem] w-[34rem] rounded-full opacity-[0.22] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        animate={{ x: [0, 90, -30, 0], y: [0, 50, 90, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 9 * speed, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 -right-40 h-[30rem] w-[30rem] rounded-full opacity-[0.18] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--success), transparent 70%)" }}
        animate={{ x: [0, -70, 25, 0], y: [0, -45, -80, 0], scale: [1, 0.94, 1.06, 1] }}
        transition={{ duration: 11 * speed, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-10rem] left-1/3 h-[26rem] w-[26rem] rounded-full opacity-[0.14] blur-3xl"
        style={{ background: "radial-gradient(circle, var(--warning), transparent 70%)" }}
        animate={{ x: [0, 50, -60, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 13 * speed, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
