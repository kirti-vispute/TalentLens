"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function Card({
  children,
  className = "",
  hover = false,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  [key: string]: unknown;
}) {
  if (!hover) {
    return (
      <div className={`shadow-soft rounded-xl border border-border bg-surface ${className}`} {...rest}>
        {children}
      </div>
    );
  }
  return (
    <motion.div
      className={`shadow-soft cursor-pointer rounded-xl border border-border bg-surface ${className}`}
      whileHover={{ y: -3, boxShadow: "0 12px 28px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  loading = false,
  disabled,
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit" | "reset";
  className?: string;
  loading?: boolean;
  disabled?: boolean;
  [key: string]: unknown;
}) {
  const variants: Record<string, string> = {
    primary: "bg-accent text-accent-foreground shadow-soft hover:brightness-110",
    secondary: "bg-surface border border-border text-foreground hover:bg-accent-soft",
    danger: "bg-danger text-white shadow-soft hover:brightness-110",
    ghost: "text-muted hover:text-foreground hover:bg-accent-soft/50",
  };
  const isDisabled = disabled || loading;
  return (
    <motion.button
      type={type}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { scale: 1.02 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </motion.button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-3.5 w-3.5 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "success" | "warning" | "danger";
}) {
  const tones: Record<string, string> = {
    muted: "bg-border/60 text-muted",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 75 ? "success" : score >= 50 ? "warning" : "danger";
  return (
    <Badge tone={tone}>
      <span className="font-semibold">{score}</span>
      <span className="ml-1 opacity-70">/100</span>
    </Badge>
  );
}

export const STATUS_LABELS: Record<string, string> = {
  SOURCED: "Sourced",
  SCREENED: "Screened",
  SHORTLISTED: "Shortlisted",
  CLIENT_REVIEW: "With client",
  INTERVIEW: "Interview",
  OFFERED: "Offered",
  JOINED: "Joined",
  REJECTED: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "JOINED" || status === "OFFERED" || status === "SHORTLISTED"
      ? "success"
      : status === "REJECTED"
        ? "danger"
        : status === "CLIENT_REVIEW" || status === "INTERVIEW"
          ? "accent"
          : "muted";
  return <Badge tone={tone}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
    </motion.div>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1 text-sm text-danger"
    >
      {children}
    </motion.p>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} />;
}
