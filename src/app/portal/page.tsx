import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/motion";

export default async function PortalDashboard() {
  const session = await getSession();
  if (!session?.clientCompanyId) redirect("/login");

  const requisitions = await prisma.requisition.findMany({
    where: { clientCompanyId: session.clientCompanyId },
    orderBy: { createdAt: "desc" },
    include: { applications: { select: { status: true } } },
  });

  return (
    <FadeIn className="flex flex-col gap-6">
      <PageHeader title="My requisitions" subtitle="Review shortlists and give feedback without the back-and-forth emails." />

      {requisitions.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Your recruiter will share shortlists here as soon as they're ready." />
      ) : (
        <StaggerGroup className="grid gap-4 sm:grid-cols-2">
          {requisitions.map((req) => {
            const pending = req.applications.filter((a) => a.status === "CLIENT_REVIEW").length;
            return (
              <StaggerItem key={req.id}>
                <Link href={`/portal/req/${req.id}`}>
                  <Card hover className="flex h-full flex-col gap-3 p-5">
                    <p className="font-medium text-foreground">{req.title}</p>
                    <p className="text-sm text-muted">{req.location ?? "Location not set"}</p>
                    <div className="mt-auto flex items-center gap-2">
                      {pending > 0 ? (
                        <Badge tone="warning">{pending} awaiting your review</Badge>
                      ) : (
                        <Badge tone="muted">Up to date</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      )}
    </FadeIn>
  );
}
