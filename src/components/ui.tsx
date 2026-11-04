import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit" | "reset";
  className?: string;
  [key: string]: unknown;
}) {
  const variants: Record<string, string> = {
    primary: "bg-accent text-accent-foreground hover:opacity-90",
    secondary: "bg-surface border border-border text-foreground hover:bg-accent-soft",
    danger: "bg-danger text-white hover:opacity-90",
    ghost: "text-muted hover:text-foreground",
  };
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
    </div>
  );
}

export function FieldError({ children }: { children?: string | null }) {
  if (!children) return null;
  return <p className="mt-1 text-sm text-danger">{children}</p>;
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
