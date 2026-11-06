"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/** Shared easing/duration so every transition in the app feels the same. */
export const EASE = [0.16, 1, 0.3, 1] as const;

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

/** Fades + slides a block in once, on mount. Use for page-level content. */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={fadeUpVariants}
      transition={{ duration: 0.45, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.03 } },
};

/** Wraps a list so its direct children (use <StaggerItem>) cascade in. */
export function StaggerGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div initial="hidden" animate="show" variants={staggerContainerVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  layoutId,
}: {
  children: ReactNode;
  className?: string;
  layoutId?: string;
}) {
  return (
    <motion.div variants={fadeUpVariants} layout layoutId={layoutId} className={className}>
      {children}
    </motion.div>
  );
}

/** A right-side slide-over panel with a fading backdrop. Controlled by the
 * parent mounting/unmounting it inside an <AnimatePresence>. */
export function SlideOver({
  onClose,
  children,
}: {
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="h-full w-full max-w-lg overflow-y-auto bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export { AnimatePresence, motion };

/** A circular, animated progress ring used to present an AI score as
 * something glanceable rather than a plain number. */
export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const tone = score >= 75 ? "var(--success)" : score >= 50 ? "var(--warning)" : "var(--danger)";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={4}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        />
      </svg>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-foreground"
      >
        {score}
      </motion.span>
    </div>
  );
}

/** A horizontal fill bar variant of the same idea, for tight table rows. */
export function ScoreBar({ score, width = 72 }: { score: number; width?: number }) {
  const tone = score >= 75 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-danger";
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-border"
        style={{ width }}
      >
        <motion.div
          className={`h-full rounded-full ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, ease: EASE }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums text-foreground">{score}</span>
    </div>
  );
}
