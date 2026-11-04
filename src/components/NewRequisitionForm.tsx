"use client";

import { useActionState, useState, useTransition } from "react";
import { extractJDAction, createRequisitionAction, type ExtractedScorecard } from "@/lib/actions";
import type { ScoringCriterion } from "@/lib/scoring";
import { Button, Card, FieldError } from "@/components/ui";

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

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-5 lg:col-span-2">
        <h2 className="text-sm font-semibold text-foreground">1. Paste the job description</h2>
        <textarea
          value={rawJD}
          onChange={(e) => setRawJD(e.target.value)}
          rows={14}
          placeholder="Paste the client's JD here, including experience range, must-have skills and notice period…"
          className="mt-3 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <Button className="mt-3 w-full" onClick={runExtract} disabled={isExtracting || rawJD.trim().length < 10}>
          {isExtracting ? "Reading the JD…" : extracted ? "Re-run AI extraction" : "Draft scorecard with AI"}
        </Button>
        <p className="mt-2 text-xs text-muted">
          AI only drafts a starting point — must-have skills, experience band and notice cap. Review
          and edit every field on the right before creating the requisition.
        </p>
      </Card>

      <Card className="p-5 lg:col-span-3">
        <h2 className="text-sm font-semibold text-foreground">2. Review the scorecard</h2>
        {!extracted ? (
          <p className="mt-4 text-sm text-muted">Run AI extraction, or fill the fields in manually below.</p>
        ) : null}

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
            <Field label="Max CTC (₹ per year, optional)">
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
              <button type="button" onClick={addCriterion} className="text-xs font-medium text-accent">
                + Add criterion
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-2">
              {scorecard.criteria.length === 0 && (
                <p className="text-xs text-muted">No criteria yet — add at least one skill to score against.</p>
              )}
              {scorecard.criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border p-2">
                  <input
                    value={c.skill}
                    onChange={(e) => updateCriterion(i, { skill: e.target.value })}
                    placeholder="Skill"
                    className="input flex-1"
                  />
                  <label className="flex items-center gap-1 text-xs text-muted">
                    Weight
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={c.weight}
                      onChange={(e) => updateCriterion(i, { weight: Number(e.target.value) })}
                      className="input w-16"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={c.required}
                      onChange={(e) => updateCriterion(i, { required: e.target.checked })}
                    />
                    Must-have
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCriterion(i)}
                    className="text-xs text-danger"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <FieldError>{state?.error}</FieldError>
          <Button type="submit" disabled={pending || scorecard.criteria.length === 0}>
            {pending ? "Creating…" : "Create requisition"}
          </Button>
        </form>
      </Card>
    </div>
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
