import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { Card } from "@/components/ui";
import { FadeIn } from "@/components/motion";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.role === "RECRUITER" ? "/recruiter" : "/portal");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <FadeIn className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-lg font-semibold tracking-tight text-foreground">TalentLens</p>
          <p className="mt-1 text-sm text-muted">AI-assisted resume screening, for staffing teams.</p>
        </div>
        <Card className="shadow-soft-lg p-6">
          <LoginForm />
        </Card>
        <FadeIn delay={0.15} className="mt-6 rounded-lg border border-border bg-surface/60 p-4 text-xs text-muted">
          <p className="font-medium text-foreground">Demo access</p>
          <p className="mt-1">Recruiter: recruiter@talentlens.app</p>
          <p>Client (Northbridge): client.northbridge@talentlens.app</p>
          <p>Client (Meridian): client.meridian@talentlens.app</p>
          <p className="mt-1">Password for all: Demo@1234</p>
        </FadeIn>
      </FadeIn>
    </main>
  );
}
