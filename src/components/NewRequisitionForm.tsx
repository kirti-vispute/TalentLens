"use client";

import { useActionState, useState, useTransition } from "react";
import { extractJDAction, createRequisitionAction, type ExtractedScorecard } from "@/lib/actions";
import type { ScoringCriterion } from "@/lib/scoring";
import { Button, Card, FieldError, Skeleton } from "@/components/ui";
import { motion, AnimatePresence, FadeIn } from "@/components/motion";

const EMPTY_SCORECARD: ExtractedScorecard = {
  title: "",
  experienceMin: 0,
  experienceMax: 10,
  noticeDaysMax: 90,
  location: null,
  criteria: [],
};

export function NewRequisitionForm({
  clientCompanies,
}: {
  clientCompanies: { id: string; name: string }[];
}) {
  const [rawJD, setRawJD] = useState("");
  const [scorecard, setScorecard] = useState<ExtractedScorecard>(EMPTY_SCORECARD);
  const [extracted, setExtracted] = useState(false);
  const [isExtracting, startExtract] = useTransition();
  const [state, formAction, pending] = useActionState(createRequisitionAction, null);

  function runExtract() {
    if (rawJD.trim().length < 10) return;
    startExtract(async () => {
      const result = await extractJDAction(rawJD);
      setScorecard(result);
      setExtracted(true);
    });
  }

  function updateCriterion(index: number, patch: Partial<ScoringCriterion>) {
    setScorecard((sc) => ({
      ...sc,
      criteria: sc.criteria.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  function removeCriterion(index: number) {
    setScorecard((sc) => ({ ...sc, criteria: sc.criteria.filter((_, i) => i !== index) }));
  }

  function addCriterion() {
    setScorecard((sc) => ({
      ...sc,
      criteria: [...sc.criteria, { skill: "", weight: 3, required: false }],
    }));
  }

  const hasBlankSkill = scorecard.criteria.some((c) => c.skill.trim().length === 0);
  const canSubmit = scorecard.criteria.length > 0 && !hasBlankSkill;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-5 lg:col-span-2">
        <h2 className="text-sm font-semibold text-foreground">1. Paste the job description</h2>
        <textarea
          value={rawJD}
          onChange={(e) => setRawJD(e.target.value)}
          rows={14}
          placeholder="Paste the client's JD here, including experience range, must-have skills and notice period…"
          className="mt-3 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none transition-shadow focus:ring-2 focus:ring-accent/40"
        />
        <Button
          className="mt-3 w-full"
          onClick={runExtract}
          loading={isExtracting}
          disabled={rawJD.trim().length < 10}
        >
          {isExtracting ? "Reading the JD…" : extracted ? "Re-run AI extraction" : "Draft scorecard with AI"}
        </Button>
        <p className="mt-2 text-xs text-muted">
          AI only drafts a starting point — must-have skills, experience band and notice cap. Review
          and edit every field on the right before creating the requisition.
        </p>
      </Card>

      <Card className="p-5 lg:col-span-3">
        <h2 className="text-sm font-semibold text-foreground">2. Review the scorecard</h2>

        {!extracted && !isExtracting && (
          <p className="mt-4 text-sm text-muted">Run AI extraction, or fill the fields in manually below.</p>
        )}

        <AnimatePresence mode="wait">
          {isExtracting ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 flex flex-col gap-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
              <Skeleton className="h-20 w-full" />
            </motion.div>
          ) : (
            <FadeIn key={extracted ? "extracted-form" : "manual-form"}>
              <ScorecardForm
                scorecard={scorecard}
                clientCompanies={clientCompanies}
                rawJD={rawJD}
                state={state}
                formAction={formAction}
                pending={pending}
                canSubmit={canSubmit}
                hasBlankSkill={hasBlankSkill}
                onUpdateCriterion={updateCriterion}
                onRemoveCriterion={removeCriterion}
                onAddCriterion={addCriterion}
              />
            </FadeIn>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

function ScorecardForm({
  scorecard,
  clientCompanies,
  rawJD,
  state,
  formAction,
  pending,
  canSubmit,
  hasBlankSkill,
  onUpdateCriterion,
  onRemoveCriterion,
  onAddCriterion,
}: {
  scorecard: ExtractedScorecard;
  clientCompanies: { id: string; name: string }[];
  rawJD: string;
  state: { error?: string } | null;
  formAction: (formData: FormData) => void;
  pending: boolean;
  canSubmit: boolean;
  hasBlankSkill: boolean;
  onUpdateCriterion: (index: number, patch: Partial<ScoringCriterion>) => void;
  onRemoveCriterion: (index: number) => void;
  onAddCriterion: () => void;
}) {
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="rawJD" value={rawJD} />
      <input type="hidden" name="criteria" value={JSON.stringify(scorecard.criteria)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Requisition title">
          <input
            name="title"
            defaultValue={scorecard.title}
            key={`title-${scorecard.title}`}
            required
            className="input"
          />
        </Field>
        <Field label="Client company">
          <select name="clientCompanyId" required className="input">
            <option value="">Select a client…</option>
            {clientCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input
            name="location"
            defaultValue={scorecard.location ?? ""}
            key={`loc-${scorecard.location}`}
            className="input"
          />
        </Field>
        <Field label="Max CTC (INR per year, optional)">
          <input name="ctcMax" type="number" min={0} className="input" />
        </Field>
        <Field label="Experience min (years)">
          <input
            name="experienceMin"
            type="number"
            step="0.5"
            min={0}
            defaultValue={scorecard.experienceMin}
            key={`min-${scorecard.experienceMin}`}
            className="input"
          />
        </Field>
        <Field label="Experience max (years)">
          <input
            name="experienceMax"
            type="number"
            step="0.5"
            min={0}
            defaultValue={scorecard.experienceMax}
            key={`max-${scorecard.experienceMax}`}
            className="input"
          />
        </Field>
        <Field label="Max notice period (days)">
          <input
            name="noticeDaysMax"
            type="number"
            min={0}
            defaultValue={scorecard.noticeDaysMax}
            key={`notice-${scorecard.noticeDaysMax}`}
            className="input"
          />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Scoring criteria</h3>
          <button type="button" onClick={onAddCriterion} className="text-xs font-medium text-accent hover:underline">
            + Add criterion
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {scorecard.criteria.length === 0 && (
            <p className="text-xs text-muted">No criteria yet — add at least one skill to score against.</p>
          )}
          <AnimatePresence initial={false}>
            {scorecard.criteria.map((c, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2 overflow-hidden rounded-lg border border-border p-2"
              >
                <input
                  value={c.skill}
                  onChange={(e) => onUpdateCriterion(i, { skill: e.target.value })}
                  placeholder="Skill"
                  className={`input flex-1 ${c.skill.trim().length === 0 ? "border-danger/50" : ""}`}
                />
                <label className="flex items-center gap-1 text-xs text-muted">
                  Weight
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={c.weight}
                    onChange={(e) => onUpdateCriterion(i, { weight: Number(e.target.value) })}
                    className="input w-16"
                  />
                </label>
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={c.required}
                    onChange={(e) => onUpdateCriterion(i, { required: e.target.checked })}
                  />
                  Must-have
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveCriterion(i)}
                  className="text-xs text-danger hover:underline"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {hasBlankSkill && (
            <p className="text-xs text-danger">Every criterion needs a skill name before you can save.</p>
          )}
        </div>
      </div>

      <FieldError>{state?.error}</FieldError>
      <Button type="submit" loading={pending} disabled={!canSubmit}>
        {pending ? "Creating…" : "Create requisition"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
