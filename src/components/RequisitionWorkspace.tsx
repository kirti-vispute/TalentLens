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
import { Button, Card, ScoreBadge, StatusBadge, Badge, EmptyState, STATUS_LABELS } from "@/components/ui";

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

      <Card className="p-1">
        <div className="flex gap-1 p-2">
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
      ) : tab === "ranked" ? (
        <RankedList applications={applications} onSelect={setSelected} />
      ) : (
        <PipelineBoard applications={applications} onSelect={setSelected} onChanged={() => router.refresh()} />
      )}

      {selectedLive && (
        <CandidateDrawer
          application={selectedLive}
          criteria={criteria}
          onClose={() => setSelected(null)}
          onChanged={() => router.refresh()}
        />
      )}
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
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active ? "bg-accent text-accent-foreground" : "text-muted hover:bg-accent-soft"
      }`}
    >
      {children}
    </button>
  );
}

function UploadPanel({ requisitionId, onDone }: { requisitionId: string; onDone: () => void }) {
  const [pending, startUpload] = useTransition();
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [fileCount, setFileCount] = useState(0);

  function handleSubmit(formData: FormData) {
    formData.set("requisitionId", requisitionId);
    startUpload(async () => {
      const result = await uploadCandidatesAction(formData);
      setSummary(result);
      onDone();
    });
  }

  return (
    <Card className="p-5">
      <form action={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-foreground">Bulk upload CVs</label>
          <input
            type="file"
            name="files"
            multiple
            accept=".pdf,.docx"
            onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted">PDF or DOCX, up to 500 files. Parsed and scored automatically.</p>
        </div>
        <Button type="submit" disabled={pending || fileCount === 0}>
          {pending ? "Parsing & scoring…" : `Upload ${fileCount || ""} CV${fileCount === 1 ? "" : "s"}`}
        </Button>
      </form>
      {summary && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge tone="success">{summary.uploaded} uploaded</Badge>
          {summary.duplicates > 0 && <Badge tone="warning">{summary.duplicates} possible duplicates</Badge>}
          {summary.unreadable > 0 && <Badge tone="danger">{summary.unreadable} unreadable — needs manual review</Badge>}
          {summary.errors.map((e, i) => (
            <Badge key={i} tone="danger">
              {e}
            </Badge>
          ))}
        </div>
      )}
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
      <table className="w-full min-w-[720px] text-left text-sm">
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
        <tbody>
          {applications.map((a) => (
            <tr
              key={a.applicationId}
              onClick={() => onSelect(a)}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-accent-soft/40"
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
                <ScoreBadge score={a.score} />
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
            </tr>
          ))}
        </tbody>
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
              {items.map((a) => (
                <Card key={a.applicationId} className="cursor-pointer p-3" onClick={() => onSelect(a)}>
                  <p className="text-sm font-medium text-foreground">{a.name}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <ScoreBadge score={a.score} />
                    <StatusSelect application={a} onChanged={onChanged} />
                  </div>
                </Card>
              ))}
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

  function handleOpen() {
    startTransition(async () => {
      await markOpenedAction(application.applicationId);
      onChanged();
    });
  }

  function handleSend() {
    startTransition(async () => {
      const result = await sendToClientAction(application.applicationId);
      if (!result.ok) setSendError(result.error ?? "Could not send to client.");
      else {
        setSendError(null);
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
      onChanged();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{application.name}</h2>
            <p className="text-sm text-muted">{application.currentRole ?? "Role unknown"}</p>
          </div>
          <button onClick={onClose} className="text-sm text-muted hover:text-foreground">
            Close
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ScoreBadge score={application.score} />
          <StatusBadge status={application.status} />
          {application.lowConfidence && <Badge tone="warning">Needs manual review</Badge>}
          {application.duplicateOfName && (
            <Badge tone="danger">Possible duplicate of {application.duplicateOfName}</Badge>
          )}
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
        <div className="mt-2 flex flex-col gap-2">
          {criteria.map((c) => {
            const line = application.evidence.find((e) => e.criterion === c.skill);
            return (
              <div key={c.skill} className="rounded-lg border border-border p-3">
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
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
          {sendError && <p className="text-sm text-danger">{sendError}</p>}
          <div className="flex gap-2">
            <Button variant={application.openedByRecruiter ? "secondary" : "primary"} onClick={handleOpen} disabled={pending}>
              {application.openedByRecruiter ? "CV reviewed ✓" : "Open & confirm CV"}
            </Button>
            <Button
              onClick={handleSend}
              disabled={pending || !application.openedByRecruiter || application.status === "CLIENT_REVIEW"}
            >
              Send to client
            </Button>
          </div>
          <Button variant="danger" onClick={handleDelete} disabled={pending} className="self-start">
            Delete candidate data
          </Button>
        </div>
      </div>
    </div>
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
