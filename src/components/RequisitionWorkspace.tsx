"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markOpenedAction,
  sendToClientAction,
  updateApplicationStatusAction,
  requestDeletionAction,
  uploadCandidatesAction,
  type UploadSummary,
} from "@/lib/actions";
import type { ScoringCriterion, EvidenceLine } from "@/lib/scoring";
import { Button, Card, StatusBadge, Badge, EmptyState, STATUS_LABELS } from "@/components/ui";
import { motion, AnimatePresence, ScoreBar, ScoreRing, SlideOver, StaggerGroup, StaggerItem, fadeUpVariants, staggerContainerVariants } from "@/components/motion";
import { useToast } from "@/components/Toast";

export interface ApplicationView {
  applicationId: string;
  candidateId: string;
  name: string;
  currentRole: string | null;
  experienceYears: number | null;
  noticeDays: number | null;
  email: string | null;
  phone: string | null;
  resumeFileName: string;
  resumeText: string;
  score: number;
  evidence: EvidenceLine[];
  lowConfidence: boolean;
  lowConfidenceReasons: string[];
  status: string;
  openedByRecruiter: boolean;
  duplicateOfName: string | null;
  viewedByClientAt: string | null;
  rejectionReason: string | null;
  interviewSlot: string | null;
}

const PIPELINE_ORDER = [
  "SOURCED",
  "SCREENED",
  "SHORTLISTED",
  "CLIENT_REVIEW",
  "INTERVIEW",
  "OFFERED",
  "JOINED",
  "REJECTED",
] as const;

export function RequisitionWorkspace({
  requisitionId,
  criteria,
  applications,
}: {
  requisitionId: string;
  criteria: ScoringCriterion[];
  applications: ApplicationView[];
}) {
  const [tab, setTab] = useState<"ranked" | "pipeline">("ranked");
  const [selected, setSelected] = useState<ApplicationView | null>(null);
  const router = useRouter();

  const selectedLive = selected ? applications.find((a) => a.applicationId === selected.applicationId) ?? null : null;

  return (
    <div className="flex flex-col gap-6">
      <UploadPanel requisitionId={requisitionId} onDone={() => router.refresh()} />

      <Card className="w-fit p-1">
        <div className="relative flex gap-1 p-1">
          <TabButton active={tab === "ranked"} onClick={() => setTab("ranked")}>
            Ranked list ({applications.length})
          </TabButton>
          <TabButton active={tab === "pipeline"} onClick={() => setTab("pipeline")}>
            Pipeline board
          </TabButton>
        </div>
      </Card>

      {applications.length === 0 ? (
        <EmptyState
          title="No candidates yet"
          body="Upload a batch of CVs above. The AI will parse, score and rank them against this requisition's scorecard."
        />
      ) : (
        <AnimatePresence mode="wait">
          {tab === "ranked" ? (
            <motion.div
              key="ranked"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <RankedList applications={applications} onSelect={setSelected} />
            </motion.div>
          ) : (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <PipelineBoard applications={applications} onSelect={setSelected} onChanged={() => router.refresh()} />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {selectedLive && (
          <SlideOver onClose={() => setSelected(null)}>
            <CandidateDrawer
              application={selectedLive}
              criteria={criteria}
              onClose={() => setSelected(null)}
              onChanged={() => router.refresh()}
            />
          </SlideOver>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative z-10 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "text-accent-foreground" : "text-muted hover:text-foreground"
      }`}
    >
      {active && (
        <motion.div
          layoutId="workspace-tab-pill"
          className="absolute inset-0 -z-10 rounded-lg bg-accent"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        />
      )}
      {children}
    </button>
  );
}

function UploadPanel({ requisitionId, onDone }: { requisitionId: string; onDone: () => void }) {
  const [pending, startUpload] = useTransition();
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const toast = useToast();

  function handleSubmit(formData: FormData) {
    formData.set("requisitionId", requisitionId);
    startUpload(async () => {
      const result = await uploadCandidatesAction(formData);
      setSummary(result);
      if (result.uploaded > 0) {
        toast.push(
          `Scored ${result.uploaded} candidate${result.uploaded === 1 ? "" : "s"}.`,
          "success"
        );
        setFileCount(0);
      } else if (result.errors.length > 0) {
        toast.push(result.errors[0], "error");
      }
      onDone();
    });
  }

  return (
    <Card className="p-5">
      <form action={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground">Bulk upload CVs</label>
          <motion.label
            animate={{
              borderColor: dragOver ? "var(--accent)" : "var(--border)",
              backgroundColor: dragOver ? "var(--accent-soft)" : "rgba(0,0,0,0)",
            }}
            className="mt-1 flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 py-3 text-sm text-muted transition-colors"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={() => setDragOver(false)}
          >
            <input
              type="file"
              name="files"
              multiple
              accept=".pdf,.docx"
              onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-accent file:font-medium"
            />
          </motion.label>
          <p className="mt-1 text-xs text-muted">PDF or DOCX, up to 500 files. Parsed and scored automatically.</p>
        </div>
        <Button type="submit" loading={pending} disabled={fileCount === 0}>
          {pending ? "Parsing & scoring…" : `Upload ${fileCount || ""} CV${fileCount === 1 ? "" : "s"}`}
        </Button>
      </form>
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex flex-wrap gap-2 text-xs"
          >
            <Badge tone="success">{summary.uploaded} uploaded</Badge>
            {summary.duplicates > 0 && <Badge tone="warning">{summary.duplicates} possible duplicates</Badge>}
            {summary.unreadable > 0 && <Badge tone="danger">{summary.unreadable} unreadable — needs manual review</Badge>}
            {summary.errors.map((e, i) => (
              <Badge key={i} tone="danger">
                {e}
              </Badge>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function RankedList({
  applications,
  onSelect,
}: {
  applications: ApplicationView[];
  onSelect: (a: ApplicationView) => void;
}) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Experience</th>
            <th className="px-4 py-3">Notice</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Flags</th>
          </tr>
        </thead>
        <motion.tbody initial="hidden" animate="show" variants={staggerContainerVariants}>
          {applications.map((a) => (
            <motion.tr
              key={a.applicationId}
              variants={fadeUpVariants}
              layout
              onClick={() => onSelect(a)}
              className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-accent-soft/40"
            >
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{a.name}</p>
                <p className="text-xs text-muted">{a.currentRole ?? "Role unknown"}</p>
              </td>
              <td className="px-4 py-3 text-muted">
                {a.experienceYears != null ? `${a.experienceYears} yrs` : "Unknown"}
              </td>
              <td className="px-4 py-3 text-muted">{a.noticeDays != null ? `${a.noticeDays} days` : "Unknown"}</td>
              <td className="px-4 py-3">
                <ScoreBar score={a.score} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {a.lowConfidence && <Badge tone="warning">Needs review</Badge>}
                  {a.duplicateOfName && <Badge tone="danger">Possible duplicate</Badge>}
                </div>
              </td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </Card>
  );
}

function PipelineBoard({
  applications,
  onSelect,
  onChanged,
}: {
  applications: ApplicationView[];
  onSelect: (a: ApplicationView) => void;
  onChanged: () => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {PIPELINE_ORDER.map((status) => {
        const items = applications.filter((a) => a.status === status);
        return (
          <div key={status} className="min-w-[220px] flex-1">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {STATUS_LABELS[status]}
              </p>
              <Badge tone="muted">{items.length}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {items.map((a) => (
                  <motion.div
                    key={a.applicationId}
                    layoutId={`card-${a.applicationId}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  >
                    <Card hover className="p-3" onClick={() => onSelect(a)}>
                      <p className="text-sm font-medium text-foreground">{a.name}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <ScoreBar score={a.score} width={48} />
                        <StatusSelect application={a} onChanged={onChanged} />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusSelect({ application, onChanged }: { application: ApplicationView; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={application.status}
      disabled={pending}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const formData = new FormData();
        formData.set("applicationId", application.applicationId);
        formData.set("status", e.target.value);
        startTransition(async () => {
          await updateApplicationStatusAction(null, formData);
          onChanged();
        });
      }}
      className="rounded-md border border-border bg-surface px-1 py-0.5 text-xs"
    >
      {PIPELINE_ORDER.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

function CandidateDrawer({
  application,
  criteria,
  onClose,
  onChanged,
}: {
  application: ApplicationView;
  criteria: ScoringCriterion[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [sendError, setSendError] = useState<string | null>(null);
  const toast = useToast();

  function handleOpen() {
    startTransition(async () => {
      await markOpenedAction(application.applicationId);
      toast.push("CV marked as reviewed.", "success");
      onChanged();
    });
  }

  function handleSend() {
    startTransition(async () => {
      const result = await sendToClientAction(application.applicationId);
      if (!result.ok) {
        setSendError(result.error ?? "Could not send to client.");
      } else {
        setSendError(null);
        toast.push(`${application.name} sent to the client.`, "success");
        onChanged();
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete all data for ${application.name}? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set("candidateId", application.candidateId);
    startTransition(async () => {
      await requestDeletionAction(null, formData);
      toast.push(`${application.name}'s data was deleted.`, "info");
      onChanged();
      onClose();
    });
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{application.name}</h2>
          <p className="text-sm text-muted">{application.currentRole ?? "Role unknown"}</p>
        </div>
        <button onClick={onClose} className="text-sm text-muted hover:text-foreground">
          Close
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ScoreRing score={application.score} />
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={application.status} />
          {application.lowConfidence && <Badge tone="warning">Needs manual review</Badge>}
          {application.duplicateOfName && (
            <Badge tone="danger">Possible duplicate of {application.duplicateOfName}</Badge>
          )}
        </div>
      </div>

      {application.lowConfidence && (
        <div className="mt-3 rounded-lg bg-warning-soft p-3 text-xs text-warning">
          <p className="font-medium">The AI is unsure about this one:</p>
          <ul className="mt-1 list-inside list-disc">
            {application.lowConfidenceReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Detail label="Experience" value={application.experienceYears != null ? `${application.experienceYears} yrs` : "Unknown"} />
        <Detail label="Notice period" value={application.noticeDays != null ? `${application.noticeDays} days` : "Unknown"} />
        <Detail label="Email" value={application.email ?? "Not found"} />
        <Detail label="Phone" value={application.phone ?? "Not found"} />
        <Detail label="Resume file" value={application.resumeFileName} />
        {application.rejectionReason && <Detail label="Rejection reason" value={application.rejectionReason} />}
        {application.interviewSlot && <Detail label="Proposed slot" value={application.interviewSlot} />}
      </dl>

      <h3 className="mt-6 text-sm font-semibold text-foreground">Scorecard evidence</h3>
      <p className="text-xs text-muted">Every match is quoted from the CV text — nothing here is a guess the recruiter can&apos;t verify.</p>
      <StaggerGroup className="mt-2 flex flex-col gap-2">
        {criteria.map((c) => {
          const line = application.evidence.find((e) => e.criterion === c.skill);
          return (
            <StaggerItem key={c.skill}>
              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {c.skill} {c.required && <span className="text-danger">*</span>}
                  </span>
                  <Badge tone={line?.matched ? "success" : "muted"}>
                    {line?.matched ? "Matched" : "Not found"}
                  </Badge>
                </div>
                {line?.snippet && <p className="mt-1 text-xs text-muted">&ldquo;{line.snippet}&rdquo;</p>}
              </div>
            </StaggerItem>
          );
        })}
      </StaggerGroup>

      <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
        {sendError && <p className="text-sm text-danger">{sendError}</p>}
        <div className="flex gap-2">
          <Button variant={application.openedByRecruiter ? "secondary" : "primary"} onClick={handleOpen} loading={pending} disabled={application.openedByRecruiter}>
            {application.openedByRecruiter ? "CV reviewed ✓" : "Open & confirm CV"}
          </Button>
          <Button
            onClick={handleSend}
            loading={pending}
            disabled={!application.openedByRecruiter || application.status === "CLIENT_REVIEW"}
          >
            Send to client
          </Button>
        </div>
        <Button variant="danger" onClick={handleDelete} disabled={pending} className="self-start">
          Delete candidate data
        </Button>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
