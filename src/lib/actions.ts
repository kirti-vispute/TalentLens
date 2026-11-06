"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { getSession, setSessionCookie, clearSessionCookie } from "./auth";
import { logAudit } from "./audit";
import { scoreCandidate, findDuplicate, type ScoringCriterion } from "./scoring";
import { parseJobDescription, parseResumeText } from "./parse";
import { extractResumeText, isSupportedResumeFile } from "./cv-parse";
import {
  loginSchema,
  requisitionSchema,
  shortlistActionSchema,
  statusUpdateSchema,
  deleteCandidateSchema,
} from "./validation";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a valid email and password." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }
  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clientCompanyId: user.clientCompanyId,
  });
  await logAudit(user.id, "LOGIN", "User", user.id);

  redirect(user.role === "RECRUITER" ? "/recruiter" : "/portal");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

async function requireRecruiter() {
  const session = await getSession();
  if (!session || session.role !== "RECRUITER") {
    redirect("/login");
  }
  return session;
}

async function requireClient() {
  const session = await getSession();
  if (!session || session.role !== "CLIENT" || !session.clientCompanyId) {
    redirect("/login");
  }
  return session;
}

// ---------------------------------------------------------------------------
// JD intake / scorecard
// ---------------------------------------------------------------------------

export interface ExtractedScorecard {
  title: string;
  experienceMin: number;
  experienceMax: number;
  noticeDaysMax: number;
  location: string | null;
  criteria: ScoringCriterion[];
}

/** Pure AI-assist step: drafts an editable scorecard from pasted JD text. */
export async function extractJDAction(rawJD: string): Promise<ExtractedScorecard> {
  await requireRecruiter();
  const parsed = parseJobDescription(rawJD);
  const criteria: ScoringCriterion[] = parsed.mustHaveSkills.map((skill, i) => ({
    skill,
    weight: i === 0 ? 5 : 4,
    required: i < 2,
  }));
  return {
    title: parsed.title,
    experienceMin: parsed.experienceMin,
    experienceMax: parsed.experienceMax,
    noticeDaysMax: parsed.noticeDaysMax,
    location: parsed.location,
    criteria,
  };
}

export async function createRequisitionAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRecruiter();

  let criteria: ScoringCriterion[];
  try {
    criteria = JSON.parse(String(formData.get("criteria") ?? "[]"));
  } catch {
    return { ok: false, error: "The scorecard criteria could not be read." };
  }

  const mustHave = criteria.filter((c) => c.required);
  const niceToHave = criteria.filter((c) => !c.required);

  const parsed = requisitionSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    rawJD: String(formData.get("rawJD") ?? ""),
    location: (formData.get("location") as string) || null,
    experienceMin: Number(formData.get("experienceMin") ?? 0),
    experienceMax: Number(formData.get("experienceMax") ?? 99),
    noticeDaysMax: Number(formData.get("noticeDaysMax") ?? 90),
    ctcMax: formData.get("ctcMax") ? Number(formData.get("ctcMax")) : null,
    clientCompanyId: String(formData.get("clientCompanyId") ?? ""),
    mustHaveSkills: mustHave,
    niceToHaveSkills: niceToHave,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid requisition." };
  }
  if (parsed.data.experienceMax < parsed.data.experienceMin) {
    return { ok: false, error: "Max experience must be at or above min experience." };
  }

  let req;
  try {
    req = await prisma.requisition.create({
      data: {
        title: parsed.data.title,
        rawJD: parsed.data.rawJD,
        location: parsed.data.location,
        experienceMin: parsed.data.experienceMin,
        experienceMax: parsed.data.experienceMax,
        noticeDaysMax: parsed.data.noticeDaysMax,
        ctcMax: parsed.data.ctcMax,
        clientCompanyId: parsed.data.clientCompanyId,
        mustHaveSkills: JSON.stringify(parsed.data.mustHaveSkills),
        niceToHaveSkills: JSON.stringify(parsed.data.niceToHaveSkills),
        createdById: session.userId,
      },
    });
  } catch {
    return {
      ok: false,
      error: "Could not create the requisition — your session may be stale. Sign out and back in, then retry.",
    };
  }

  await logAudit(session.userId, "CREATE_REQUISITION", "Requisition", req.id, {
    title: req.title,
  });
  revalidatePath("/recruiter");
  redirect(`/recruiter/req/${req.id}`);
}

// ---------------------------------------------------------------------------
// Bulk CV upload + AI scoring
// ---------------------------------------------------------------------------

export interface UploadSummary {
  uploaded: number;
  duplicates: number;
  unreadable: number;
  errors: string[];
}

export async function uploadCandidatesAction(formData: FormData): Promise<UploadSummary> {
  const session = await requireRecruiter();
  const requisitionId = String(formData.get("requisitionId") ?? "");
  const requisition = await prisma.requisition.findUnique({ where: { id: requisitionId } });
  if (!requisition) {
    return { uploaded: 0, duplicates: 0, unreadable: 0, errors: ["Requisition not found."] };
  }

  const criteria: ScoringCriterion[] = [
    ...JSON.parse(requisition.mustHaveSkills),
    ...JSON.parse(requisition.niceToHaveSkills),
  ];

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length > 500) {
    return {
      uploaded: 0,
      duplicates: 0,
      unreadable: 0,
      errors: ["Upload up to 500 CVs at a time — split this batch into smaller ones."],
    };
  }
  const existing = await prisma.candidate.findMany({
    select: { id: true, name: true, email: true, phone: true },
  });

  const summary: UploadSummary = { uploaded: 0, duplicates: 0, unreadable: 0, errors: [] };

  for (const file of files) {
    if (!isSupportedResumeFile(file.name)) {
      summary.errors.push(`${file.name}: only PDF and DOCX resumes are supported.`);
      continue;
    }

    const text = await extractResumeText(file);
    if (text.trim().length === 0) {
      summary.unreadable++;
    }

    const info = parseResumeText(text || file.name);
    const duplicate = findDuplicate(
      { id: "pending", name: info.name, email: info.email, phone: info.phone },
      existing
    );

    const candidate = await prisma.candidate.create({
      data: {
        name: info.name,
        email: info.email,
        phone: info.phone,
        currentRole: info.currentRole,
        experienceYears: info.experienceYears,
        noticeDays: info.noticeDays,
        keySkills: JSON.stringify(info.keySkills),
        resumeText: text,
        resumeFileName: file.name,
        duplicateOfId: duplicate?.candidateId ?? null,
      },
    });
    existing.push({ id: candidate.id, name: candidate.name, email: candidate.email, phone: candidate.phone });
    if (duplicate) summary.duplicates++;

    const result = scoreCandidate(criteria, requisition, {
      experienceYears: candidate.experienceYears,
      noticeDays: candidate.noticeDays,
      resumeText: candidate.resumeText,
    });

    await prisma.application.create({
      data: {
        requisitionId,
        candidateId: candidate.id,
        score: result.score,
        evidence: JSON.stringify(result.evidence),
        lowConfidence: result.lowConfidence,
        lowConfidenceReasons: JSON.stringify(result.lowConfidenceReasons),
        status: "SCREENED",
      },
    });
    summary.uploaded++;
  }

  await logAudit(session.userId, "UPLOAD_CANDIDATES", "Requisition", requisitionId, summary);
  revalidatePath(`/recruiter/req/${requisitionId}`);
  return summary;
}

// ---------------------------------------------------------------------------
// Recruiter review + pipeline
// ---------------------------------------------------------------------------

export async function markOpenedAction(applicationId: string): Promise<void> {
  const session = await requireRecruiter();
  await prisma.application.update({
    where: { id: applicationId },
    data: { openedByRecruiter: true },
  });
  await logAudit(session.userId, "OPEN_CV", "Application", applicationId);
}

export async function sendToClientAction(applicationId: string): Promise<ActionResult> {
  const session = await requireRecruiter();
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) return { ok: false, error: "Application not found." };
  if (!application.openedByRecruiter) {
    return { ok: false, error: "Open and confirm this CV before sending it to the client." };
  }
  if (application.status === "CLIENT_REVIEW") {
    return { ok: false, error: "Already with the client." };
  }
  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "CLIENT_REVIEW" },
  });
  await logAudit(session.userId, "SEND_TO_CLIENT", "Application", applicationId);
  revalidatePath(`/recruiter/req/${application.requisitionId}`);
  return { ok: true };
}

export async function updateApplicationStatusAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRecruiter();
  const parsed = statusUpdateSchema.safeParse({
    applicationId: String(formData.get("applicationId") ?? ""),
    status: String(formData.get("status") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: "Invalid status update." };

  const application = await prisma.application.findUnique({ where: { id: parsed.data.applicationId } });
  if (!application) return { ok: false, error: "Application not found." };

  await prisma.application.update({
    where: { id: parsed.data.applicationId },
    data: { status: parsed.data.status },
  });
  await logAudit(session.userId, "UPDATE_STATUS", "Application", parsed.data.applicationId, {
    status: parsed.data.status,
  });
  revalidatePath(`/recruiter/req/${application.requisitionId}`);
  return { ok: true };
}

export async function requestDeletionAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRecruiter();
  const parsed = deleteCandidateSchema.safeParse({
    candidateId: String(formData.get("candidateId") ?? ""),
    reason: (formData.get("reason") as string) || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const candidate = await prisma.candidate.findUnique({ where: { id: parsed.data.candidateId } });
  if (!candidate) return { ok: false, error: "Candidate not found." };

  // DPDP-style deletion on request: scrub personal data, keep an audit
  // trail entry so the action itself is still traceable.
  await prisma.application.deleteMany({ where: { candidateId: candidate.id } });
  await prisma.candidate.delete({ where: { id: candidate.id } });
  await logAudit(session.userId, "DELETE_CANDIDATE_DATA", "Candidate", candidate.id, {
    reason: parsed.data.reason ?? "Candidate requested deletion",
  });
  revalidatePath("/recruiter");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Client portal
// ---------------------------------------------------------------------------

export async function markViewedByClientAction(requisitionId: string): Promise<void> {
  const session = await requireClient();
  await prisma.application.updateMany({
    where: {
      requisitionId,
      status: "CLIENT_REVIEW",
      viewedByClientAt: null,
      requisition: { clientCompanyId: session.clientCompanyId! },
    },
    data: { viewedByClientAt: new Date() },
  });
}

export async function clientActionOnApplication(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireClient();
  const parsed = shortlistActionSchema.safeParse({
    applicationId: String(formData.get("applicationId") ?? ""),
    action: String(formData.get("action") ?? ""),
    rejectionReason: (formData.get("rejectionReason") as string) || undefined,
    interviewSlot: (formData.get("interviewSlot") as string) || undefined,
  });
  if (!parsed.success) return { ok: false, error: "Invalid action." };
  if (parsed.data.action === "REJECT" && !parsed.data.rejectionReason?.trim()) {
    return { ok: false, error: "A rejection reason is required." };
  }
  if (parsed.data.action === "PROPOSE_INTERVIEW" && !parsed.data.interviewSlot?.trim()) {
    return { ok: false, error: "Propose a specific interview slot." };
  }

  const application = await prisma.application.findUnique({
    where: { id: parsed.data.applicationId },
    include: { requisition: true },
  });
  if (!application) return { ok: false, error: "Application not found." };
  if (application.requisition.clientCompanyId !== session.clientCompanyId) {
    return { ok: false, error: "You do not have access to this candidate." };
  }
  if (application.status !== "CLIENT_REVIEW") {
    return { ok: false, error: "This candidate has already been decided on." };
  }

  const statusMap = {
    SHORTLIST: "SHORTLISTED",
    REJECT: "REJECTED",
    PROPOSE_INTERVIEW: "INTERVIEW",
  } as const;

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: statusMap[parsed.data.action],
      rejectionReason: parsed.data.action === "REJECT" ? parsed.data.rejectionReason : null,
      interviewSlot: parsed.data.action === "PROPOSE_INTERVIEW" ? parsed.data.interviewSlot : null,
    },
  });
  await logAudit(session.userId, `CLIENT_${parsed.data.action}`, "Application", application.id);
  revalidatePath(`/portal/req/${application.requisitionId}`);
  return { ok: true };
}
