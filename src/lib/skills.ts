// Curated skill dictionary for deterministic, explainable matching.
// Keys are canonical skill names; values are surface-form synonyms the
// extractor will also recognise in free text (JD or resume).
export const SKILL_SYNONYMS: Record<string, string[]> = {
  "Java": ["java", "j2ee", "core java"],
  "Spring Boot": ["spring boot", "springboot", "spring"],
  "Microservices": ["microservices", "micro-services", "micro services"],
  "Hibernate": ["hibernate", "jpa"],
  "REST APIs": ["rest api", "rest apis", "restful", "rest"],
  "KYC": ["kyc", "know your customer"],
  "AML": ["aml", "anti-money laundering", "anti money laundering"],
  "Excel": ["excel", "ms excel", "spreadsheets"],
  "SQL": ["sql", "mysql", "postgresql", "postgres", "t-sql", "pl/sql"],
  "Python": ["python"],
  "JavaScript": ["javascript", "js", "typescript", "ts"],
  "React": ["react", "react.js", "reactjs"],
  "Node.js": ["node.js", "nodejs", "node"],
  "AWS": ["aws", "amazon web services"],
  "Docker": ["docker", "containerization"],
  "Kubernetes": ["kubernetes", "k8s"],
  "Communication": ["communication skills", "client communication"],
  "Banking Operations": ["banking operations", "back-office banking", "back office banking"],
  "Customer Service": ["customer service", "customer support"],
};

export const CANONICAL_SKILLS = Object.keys(SKILL_SYNONYMS);

/**
 * Finds every canonical skill mentioned in `text`, each with the exact
 * line it was found on (used later as the "evidence" quote shown to the
 * recruiter). Case-insensitive, word-boundary aware.
 */
export function extractSkillsWithEvidence(
  text: string
): { skill: string; snippet: string }[] {
  const lines = text.split(/\r?\n/);
  const found: { skill: string; snippet: string }[] = [];
  const seen = new Set<string>();

  for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      const hit = synonyms.find((syn) => {
        const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i");
        return re.test(lower);
      });
      if (hit && !seen.has(canonical)) {
        found.push({ skill: canonical, snippet: line.trim().slice(0, 180) });
        seen.add(canonical);
        break;
      }
    }
  }
  return found;
}

export function extractSkillsOnly(text: string): string[] {
  return extractSkillsWithEvidence(text).map((s) => s.skill);
}
