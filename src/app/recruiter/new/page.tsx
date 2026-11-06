import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { NewRequisitionForm } from "@/components/NewRequisitionForm";
import { FadeIn } from "@/components/motion";

export default async function NewRequisitionPage() {
  const clientCompanies = await prisma.clientCompany.findMany({ orderBy: { name: "asc" } });

  return (
    <FadeIn className="flex flex-col gap-6">
      <PageHeader
        title="New requisition"
        subtitle="Paste the client's JD, let AI draft a scorecard, then fine-tune it before you open it for CVs."
      />
      <NewRequisitionForm clientCompanies={clientCompanies} />
    </FadeIn>
  );
}
