import Link from "next/link";
import { logoutAction } from "@/lib/actions";

export function Nav({
  name,
  roleLabel,
  links,
}: {
  name: string;
  roleLabel: string;
  links: { href: string; label: string }[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80">
            TalentLens
          </span>
          <nav className="hidden items-center gap-4 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-xs text-muted">{roleLabel}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent-soft hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
