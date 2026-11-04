import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Button, EmptyState, Badge } from "@/components/ui";

export default async function RecruiterDashboard() {
  const requisitions = await prisma.requisition.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      clientCompany: true,
      applications: { select: { status: true, score: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Requisitions"
        subtitle="Every open role across your client companies, ranked and ready to screen."
        action={
          <Link href="/recruiter/new">
            <Button>New requisition</Button>
          </Link>
        }
      />

      {requisitions.length === 0 ? (
        <EmptyState
          title="No requisitions yet"
          body="Paste a job description to draft your first AI-assisted scorecard."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {requisitions.map((req) => {
            const pendingClientReview = req.applications.filter(
              (a) => a.status === "CLIENT_REVIEW"
            ).length;
            const topScore = req.applications.reduce((max, a) => Math.max(max, a.score), 0);
            return (
              <Link key={req.id} href={`/recruiter/req/${req.id}`}>
                <Card className="flex h-full flex-col gap-3 p-5 transition hover:border-accent">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{req.title}</p>
                      <p className="text-sm text-muted">{req.clientCompany.name}</p>
                    </div>
                    <Badge tone={req.status === "OPEN" ? "accent" : "muted"}>{req.status}</Badge>
                  </div>
                  <div className="mt-auto flex items-center gap-4 text-sm text-muted">
                    <span>{req.applications.length} candidates</span>
                    <span>Top score {topScore}</span>
                    {pendingClientReview > 0 && (
                      <Badge tone="warning">{pendingClientReview} with client</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
