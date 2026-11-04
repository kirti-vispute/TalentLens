import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader, Badge } from "@/components/ui";
import { RequisitionWorkspace } from "@/components/RequisitionWorkspace";
import type { ScoringCriterion } from "@/lib/scoring";

export default async function RequisitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const requisition = await prisma.requisition.findUnique({
    where: { id },
    include: {
      clientCompany: true,
      applications: {
        include: { candidate: true },
        orderBy: { score: "desc" },
      },
    },
  });
  if (!requisition) notFound();

  const candidateNames = new Map(
    requisition.applications.map((a) => [a.candidateId, a.candidate.name])
  );

  const applications = requisition.applications.map((a) => ({
    applicationId: a.id,
    candidateId: a.candidateId,
    name: a.candidate.name,
    currentRole: a.candidate.currentRole,
    experienceYears: a.candidate.experienceYears,
    noticeDays: a.candidate.noticeDays,
    email: a.candidate.email,
    phone: a.candidate.phone,
    resumeFileName: a.candidate.resumeFileName,
    resumeText: a.candidate.resumeText,
    score: a.score,
    evidence: JSON.parse(a.evidence),
    lowConfidence: a.lowConfidence,
    lowConfidenceReasons: a.lowConfidenceReasons ? JSON.parse(a.lowConfidenceReasons) : [],
    status: a.status,
    openedByRecruiter: a.openedByRecruiter,
    duplicateOfName: a.candidate.duplicateOfId
      ? candidateNames.get(a.candidate.duplicateOfId) ?? null
      : null,
    viewedByClientAt: a.viewedByClientAt ? a.viewedByClientAt.toISOString() : null,
    rejectionReason: a.rejectionReason,
    interviewSlot: a.interviewSlot,
  }));

  const criteria: ScoringCriterion[] = [
    ...JSON.parse(requisition.mustHaveSkills),
    ...JSON.parse(requisition.niceToHaveSkills),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={requisition.title}
        subtitle={`${requisition.clientCompany.name} · ${requisition.location ?? "Location not set"} · ${requisition.experienceMin}-${requisition.experienceMax} yrs · notice ≤ ${requisition.noticeDaysMax}d`}
        action={<Badge tone="accent">{requisition.status}</Badge>}
      />
      <RequisitionWorkspace
        requisitionId={requisition.id}
        criteria={criteria}
        applications={applications}
      />
    </div>
  );
}
