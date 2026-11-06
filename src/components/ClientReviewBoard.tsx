"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clientActionOnApplication, markViewedByClientAction } from "@/lib/actions";
import type { EvidenceLine } from "@/lib/scoring";
import { Button, Card, StatusBadge, EmptyState } from "@/components/ui";
import { AnimatePresence, FadeIn, ScoreBar, StaggerGroup, StaggerItem, motion } from "@/components/motion";
import { useToast } from "@/components/Toast";

interface ClientApplicationView {
  applicationId: string;
  name: string;
  currentRole: string | null;
  experienceYears: number | null;
  noticeDays: number | null;
  maskedEmail: string;
  maskedPhone: string;
  score: number;
  evidence: EvidenceLine[];
  status: string;
  rejectionReason: string | null;
  interviewSlot: string | null;
}

export function ClientReviewBoard({
  requisitionId,
  applications,
}: {
  requisitionId: string;
  applications: ClientApplicationView[];
}) {
  const router = useRouter();

  useEffect(() => {
    markViewedByClientAction(requisitionId);
  }, [requisitionId]);

  const pending = applications.filter((a) => a.status === "CLIENT_REVIEW");
  const decided = applications.filter((a) => a.status !== "CLIENT_REVIEW");

  if (applications.length === 0) {
    return (
      <EmptyState
        title="No shortlists yet"
        body="Your recruiter is still screening candidates for this role. Check back soon."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {pending.length > 0 && (
        <FadeIn>
          <h2 className="text-sm font-semibold text-foreground">Awaiting your review ({pending.length})</h2>
          <StaggerGroup className="mt-3 grid gap-4 sm:grid-cols-2">
            <AnimatePresence>
              {pending.map((a) => (
                <StaggerItem key={a.applicationId} layoutId={`client-card-${a.applicationId}`}>
                  <CandidateCard application={a} onChanged={() => router.refresh()} />
                </StaggerItem>
              ))}
            </AnimatePresence>
          </StaggerGroup>
        </FadeIn>
      )}

      {decided.length > 0 && (
        <FadeIn delay={0.1}>
          <h2 className="text-sm font-semibold text-foreground">Previously reviewed</h2>
          <StaggerGroup className="mt-3 grid gap-4 sm:grid-cols-2">
            {decided.map((a) => (
              <StaggerItem key={a.applicationId} layoutId={`client-card-${a.applicationId}`}>
                <CandidateCard application={a} readOnly onChanged={() => router.refresh()} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </FadeIn>
      )}
    </div>
  );
}

function CandidateCard({
  application,
  readOnly = false,
  onChanged,
}: {
  application: ClientApplicationView;
  readOnly?: boolean;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"idle" | "reject" | "interview">("idle");
  const [reason, setReason] = useState("");
  const [slot, setSlot] = useState("");
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  function act(action: "SHORTLIST" | "REJECT" | "PROPOSE_INTERVIEW") {
    const formData = new FormData();
    formData.set("applicationId", application.applicationId);
    formData.set("action", action);
    if (action === "REJECT") formData.set("rejectionReason", reason);
    if (action === "PROPOSE_INTERVIEW") formData.set("interviewSlot", slot);
    startTransition(async () => {
      const result = await clientActionOnApplication(null, formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
      } else {
        setError(null);
        setMode("idle");
        const verb =
          action === "SHORTLIST" ? "shortlisted" : action === "REJECT" ? "rejected" : "sent an interview slot for";
        toast.push(`You ${verb} ${application.name}.`, action === "REJECT" ? "info" : "success");
        onChanged();
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{application.name}</p>
          <p className="text-sm text-muted">{application.currentRole ?? "Role unknown"}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm text-muted">
        <ScoreBar score={application.score} width={60} />
        <span>{application.experienceYears != null ? `${application.experienceYears} yrs` : "Exp. unknown"}</span>
        <span>{application.noticeDays != null ? `${application.noticeDays}d notice` : "Notice unknown"}</span>
      </div>

      <dl className="mt-2 text-xs text-muted">
        <span>{application.maskedEmail}</span> · <span>{application.maskedPhone}</span>
      </dl>

      {application.rejectionReason && (
        <p className="mt-2 text-xs text-danger">Rejected: {application.rejectionReason}</p>
      )}
      {application.interviewSlot && (
        <p className="mt-2 text-xs text-accent">Proposed slot: {application.interviewSlot}</p>
      )}

      <button onClick={() => setExpanded((v) => !v)} className="mt-3 text-xs font-medium text-accent hover:underline">
        {expanded ? "Hide evidence" : "Why this score?"}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-col gap-1.5">
              {application.evidence.map((e) => (
                <div key={e.criterion} className="rounded-md border border-border p-2 text-xs">
                  <span className="font-medium text-foreground">{e.criterion}:</span>{" "}
                  {e.matched ? <span className="text-success">matched</span> : <span className="text-muted">not found</span>}
                  {e.snippet && <p className="mt-0.5 text-muted">&ldquo;{e.snippet}&rdquo;</p>}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!readOnly && (
        <div className="mt-4 border-t border-border pt-3">
          {error && <p className="mb-2 text-sm text-danger">{error}</p>}
          {mode === "idle" && (
            <div className="flex flex-wrap gap-2">
              <Button loading={pending} onClick={() => act("SHORTLIST")}>
                Shortlist
              </Button>
              <Button variant="secondary" disabled={pending} onClick={() => setMode("interview")}>
                Propose interview
              </Button>
              <Button variant="danger" disabled={pending} onClick={() => setMode("reject")}>
                Reject
              </Button>
            </div>
          )}
          {mode === "reject" && (
            <div className="flex flex-col gap-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejecting (required)"
                className="input"
                autoFocus
              />
              <div className="flex gap-2">
                <Button variant="danger" loading={pending} disabled={!reason.trim()} onClick={() => act("REJECT")}>
                  Confirm reject
                </Button>
                <Button variant="ghost" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {mode === "interview" && (
            <div className="flex flex-col gap-2">
              <input
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                placeholder="e.g. Tue 11 Nov, 3:00 PM IST"
                className="input"
                autoFocus
              />
              <div className="flex gap-2">
                <Button loading={pending} disabled={!slot.trim()} onClick={() => act("PROPOSE_INTERVIEW")}>
                  Send proposed slot
                </Button>
                <Button variant="ghost" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
