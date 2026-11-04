import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { ClientReviewBoard } from "@/components/ClientReviewBoard";
import { maskEmail, maskPhone } from "@/lib/mask";

export default async function PortalRequisitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.clientCompanyId) redirect("/login");

  const requisition = await prisma.requisition.findUnique({
    where: { id },
    include: { applications: { include: { candidate: true }, orderBy: { score: "desc" } } },
  });
  if (!requisition || requisition.clientCompanyId !== session.clientCompanyId) notFound();

  const applications = requisition.applications
    .filter((a) => a.status !== "SOURCED" && a.status !== "SCREENED")
    .map((a) => ({
      applicationId: a.id,
      name: a.candidate.name,
      currentRole: a.candidate.currentRole,
      experienceYears: a.candidate.experienceYears,
      noticeDays: a.candidate.noticeDays,
      maskedEmail: maskEmail(a.candidate.email),
      maskedPhone: maskPhone(a.candidate.phone),
      score: a.score,
      evidence: JSON.parse(a.evidence),
      status: a.status,
      rejectionReason: a.rejectionReason,
      interviewSlot: a.interviewSlot,
    }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={requisition.title}
        subtitle="Candidate contact details are masked — shortlist or request an interview and your recruiter will connect you directly."
      />
      <ClientReviewBoard requisitionId={requisition.id} applications={applications} />
    </div>
  );
}
