import { extractSkillsOnly, extractSkillsWithEvidence } from "./skills";

export interface ParsedCandidate {
  name: string;
  email: string | null;
  phone: string | null;
  currentRole: string | null;
  experienceYears: number | null;
  noticeDays: number | null;
  keySkills: string[];
}

export interface ParsedJD {
  title: string;
  experienceMin: number;
  experienceMax: number;
  noticeDaysMax: number;
  location: string | null;
  mustHaveSkills: string[];
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?91[-\s]?)?[6-9]\d{9}\b/;
// "6.5 years", "6+ years", "5-8 years"
const EXPERIENCE_RANGE_RE = /(\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(\d+(?:\.\d+)?)\s*(?:years|yrs|yr)/i;
const EXPERIENCE_SINGLE_RE = /(\d+(?:\.\d+)?)\s*\+?\s*(?:years|yrs|yr)/i;
const NOTICE_RE = /notice\D{0,15}(\d+)\s*(?:days|day)/i;

/** Extracts a best-guess candidate name from the first non-empty line. */
function guessName(text: string): string {
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && l.length < 60 && !EMAIL_RE.test(l));
  return firstLine ?? "Unknown Candidate";
}

function guessCurrentRole(text: string): string | null {
  const roleLine = text
    .split(/\r?\n/)
    .slice(0, 15)
    .map((l) => l.trim())
    .find((l) =>
      /\b(developer|engineer|analyst|manager|consultant|executive|designer|lead|specialist)\b/i.test(
        l
      )
    );
  return roleLine ? roleLine.slice(0, 80) : null;
}

export function parseResumeText(text: string): ParsedCandidate {
  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phone = text.match(PHONE_RE)?.[0] ?? null;

  let experienceYears: number | null = null;
  const rangeMatch = text.match(EXPERIENCE_RANGE_RE);
  const singleMatch = text.match(EXPERIENCE_SINGLE_RE);
  if (rangeMatch) {
    experienceYears = (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  } else if (singleMatch) {
    experienceYears = parseFloat(singleMatch[1]);
  }

  const noticeMatch = text.match(NOTICE_RE);
  const noticeDays = noticeMatch ? parseInt(noticeMatch[1], 10) : null;

  return {
    name: guessName(text),
    email,
    phone,
    currentRole: guessCurrentRole(text),
    experienceYears,
    noticeDays,
    keySkills: extractSkillsOnly(text),
  };
}

export function parseJobDescription(text: string, titleHint?: string): ParsedJD {
  let experienceMin = 0;
  let experienceMax = 99;
  const rangeMatch = text.match(EXPERIENCE_RANGE_RE);
  const singleMatch = text.match(EXPERIENCE_SINGLE_RE);
  if (rangeMatch) {
    experienceMin = parseFloat(rangeMatch[1]);
    experienceMax = parseFloat(rangeMatch[2]);
  } else if (singleMatch) {
    experienceMin = parseFloat(singleMatch[1]);
    experienceMax = experienceMin + 3;
  }

  const noticeMatch = text.match(NOTICE_RE);
  const noticeDaysMax = noticeMatch ? parseInt(noticeMatch[1], 10) : 90;

  const locationMatch = text.match(
    /\b(Noida|Delhi|Mumbai|Bangalore|Bengaluru|Pune|Hyderabad|Chennai|Gurugram|Gurgaon|Kolkata|Remote)\b/i
  );

  // Take the text up to the first sentence/clause break as the title
  // (JDs are often one line: "Business Analyst, Pune, 2-5 years…").
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const titleGuess = firstLine.split(/[,.–-]/)[0]?.trim().slice(0, 60);

  return {
    title: titleHint?.trim() || titleGuess || "Untitled Requisition",
    experienceMin,
    experienceMax,
    noticeDaysMax,
    location: locationMatch?.[0] ?? null,
    mustHaveSkills: extractSkillsOnly(text),
  };
}

/** Re-exported for callers that also want evidence snippets from free text. */
export { extractSkillsWithEvidence };
