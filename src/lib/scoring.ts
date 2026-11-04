import { extractSkillsWithEvidence } from "./skills";

export interface ScoringCriterion {
  skill: string;
  weight: number; // 1-5, relative importance
  required: boolean;
}

export interface EvidenceLine {
  criterion: string;
  weight: number;
  required: boolean;
  matched: boolean;
  snippet: string | null; // the exact line quoted from the CV, or null if absent
}

export interface ScoreResult {
  score: number; // 0-100
  evidence: EvidenceLine[];
  lowConfidence: boolean;
  lowConfidenceReasons: string[];
}

export interface JDFitInputs {
  experienceMin: number;
  experienceMax: number;
  noticeDaysMax: number;
}

export interface CandidateFitInputs {
  experienceYears: number | null;
  noticeDays: number | null;
  resumeText: string;
}

/**
 * Smooth 0..1 fit score for a value against a [min, max] band: full credit
 * inside the band, linear decay outside it capped at a 3-year/90-day grace
 * window so near-misses are not zeroed out (recruiters still see the exact
 * numbers in the evidence).
 */
function bandFit(value: number, min: number, max: number, grace: number): number {
  if (value >= min && value <= max) return 1;
  const distance = value < min ? min - value : value - max;
  return Math.max(0, 1 - distance / grace);
}

export function scoreCandidate(
  criteria: ScoringCriterion[],
  jd: JDFitInputs,
  candidate: CandidateFitInputs
): ScoreResult {
  const skillEvidence = extractSkillsWithEvidence(candidate.resumeText);
  const skillMap = new Map(skillEvidence.map((s) => [s.skill, s.snippet]));

  const evidence: EvidenceLine[] = criteria.map((c) => {
    const snippet = skillMap.get(c.skill) ?? null;
    return {
      criterion: c.skill,
      weight: c.weight,
      required: c.required,
      matched: snippet !== null,
      snippet,
    };
  });

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0) || 1;
  const skillScore =
    evidence.reduce((sum, e) => sum + (e.matched ? e.weight : 0), 0) / totalWeight;

  const experienceScore =
    candidate.experienceYears != null
      ? bandFit(candidate.experienceYears, jd.experienceMin, jd.experienceMax, 3)
      : 0.5; // unknown experience: neutral, flagged below

  const noticeScore =
    candidate.noticeDays != null
      ? candidate.noticeDays <= jd.noticeDaysMax
        ? 1
        : Math.max(0, 1 - (candidate.noticeDays - jd.noticeDaysMax) / 60)
      : 0.5;

  // Required-skill gate: missing a required skill caps the score hard,
  // but never to zero — a recruiter should still be able to find the CV.
  const missingRequired = evidence.some((e) => e.required && !e.matched);
  const requiredGate = missingRequired ? 0.5 : 1;

  const rawScore =
    (skillScore * 0.6 + experienceScore * 0.25 + noticeScore * 0.15) *
    requiredGate *
    100;

  const lowConfidenceReasons: string[] = [];
  if (candidate.resumeText.trim().length < 80) {
    lowConfidenceReasons.push("Resume text is very short after parsing — check the original file.");
  }
  if (skillEvidence.length === 0) {
    lowConfidenceReasons.push("No known skills were recognised in this resume.");
  }
  if (candidate.experienceYears == null) {
    lowConfidenceReasons.push("Years of experience could not be read from the resume.");
  }

  return {
    score: Math.round(Math.max(0, Math.min(100, rawScore))),
    evidence,
    lowConfidence: lowConfidenceReasons.length > 0,
    lowConfidenceReasons,
  };
}

export interface DuplicateCheckInput {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface DuplicateMatch {
  candidateId: string;
  reason: string;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

/** Strips formatting and a leading "91" country code so "+91-98765 43210" == "9876543210". */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

/**
 * Flags probable duplicates within a batch, or against already-stored
 * candidates. Matches on normalised email or phone (strong signal), or
 * on an exact normalised-name collision (weak signal, surfaced but not
 * auto-merged — a recruiter decides).
 */
export function findDuplicate(
  candidate: DuplicateCheckInput,
  existing: DuplicateCheckInput[]
): DuplicateMatch | null {
  for (const other of existing) {
    if (other.id === candidate.id) continue;
    if (candidate.email && other.email && candidate.email.toLowerCase() === other.email.toLowerCase()) {
      return { candidateId: other.id, reason: `Same email as ${other.name}` };
    }
    if (candidate.phone && other.phone && normalizePhone(candidate.phone) === normalizePhone(other.phone)) {
      return { candidateId: other.id, reason: `Same phone number as ${other.name}` };
    }
    if (normalizeName(candidate.name) === normalizeName(other.name) && candidate.name.length > 3) {
      return { candidateId: other.id, reason: `Same name as ${other.name} — verify before merging` };
    }
  }
  return null;
}
