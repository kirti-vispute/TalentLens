import { describe, it, expect } from "vitest";
import { scoreCandidate, findDuplicate, type ScoringCriterion } from "./scoring";

const JAVA_CRITERIA: ScoringCriterion[] = [
  { skill: "Java", weight: 5, required: true },
  { skill: "Spring Boot", weight: 5, required: true },
  { skill: "Microservices", weight: 3, required: false },
];
const JAVA_JD = { experienceMin: 5, experienceMax: 8, noticeDaysMax: 60 };

describe("scoreCandidate", () => {
  it("scores a strong match highly with full evidence", () => {
    const result = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: 6.5,
      noticeDays: 60,
      resumeText:
        "Senior Java Developer\nExpert in Java and Spring Boot\nBuilt Microservices for a payments platform serving 2M transactions a day\nMentored 3 junior engineers",
    });
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.evidence.every((e) => e.matched)).toBe(true);
    expect(result.lowConfidence).toBe(false);
  });

  it("every evidence line quotes the exact resume snippet it matched, or is null", () => {
    const resumeText = "Java Developer\nStrong Java and Hibernate background\nREST APIs daily";
    const result = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: 4,
      noticeDays: 90,
      resumeText,
    });
    const javaEvidence = result.evidence.find((e) => e.criterion === "Java");
    expect(javaEvidence?.matched).toBe(true);
    expect(javaEvidence?.snippet).toContain("Java");
    const springEvidence = result.evidence.find((e) => e.criterion === "Spring Boot");
    expect(springEvidence?.matched).toBe(false);
    expect(springEvidence?.snippet).toBeNull();
  });

  it("caps the score hard (but not to zero) when a required skill is missing", () => {
    const result = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: 6,
      noticeDays: 30,
      resumeText: "Java Developer\nJava and Microservices experience",
    });
    expect(result.score).toBeLessThan(60);
    expect(result.score).toBeGreaterThan(0);
  });

  it("never rejects outright: a zero-skill-match resume still returns a non-negative score", () => {
    const result = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: null,
      noticeDays: null,
      resumeText: "",
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.lowConfidence).toBe(true);
    expect(result.lowConfidenceReasons.length).toBeGreaterThan(0);
  });

  it("flags low confidence on very short or unparsed resume text", () => {
    const result = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: null,
      noticeDays: null,
      resumeText: "xJ a v a sp.ring --- [illegible scan]",
    });
    expect(result.lowConfidence).toBe(true);
  });

  it("gives partial credit for experience just outside the band instead of zeroing it", () => {
    const withinBand = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: 6,
      noticeDays: 30,
      resumeText: "Java Developer\nJava, Spring Boot, Microservices",
    });
    const justBelowBand = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: 4,
      noticeDays: 30,
      resumeText: "Java Developer\nJava, Spring Boot, Microservices",
    });
    expect(justBelowBand.score).toBeLessThan(withinBand.score);
    expect(justBelowBand.score).toBeGreaterThan(0);
  });

  it("penalises a notice period longer than the JD allows, gradually", () => {
    const onTime = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: 6,
      noticeDays: 60,
      resumeText: "Java Spring Boot Microservices",
    });
    const longNotice = scoreCandidate(JAVA_CRITERIA, JAVA_JD, {
      experienceYears: 6,
      noticeDays: 120,
      resumeText: "Java Spring Boot Microservices",
    });
    expect(longNotice.score).toBeLessThan(onTime.score);
  });
});

describe("findDuplicate", () => {
  const existing = [
    { id: "1", name: "Vikram Joshi", email: "vikram.joshi@example.com", phone: "9876543214" },
  ];

  it("flags a duplicate by matching email, case-insensitively", () => {
    const match = findDuplicate(
      { id: "2", name: "V. Joshi", email: "Vikram.Joshi@example.com", phone: null },
      existing
    );
    expect(match?.candidateId).toBe("1");
  });

  it("flags a duplicate by matching phone, ignoring formatting", () => {
    const match = findDuplicate(
      { id: "2", name: "Someone Else", email: null, phone: "+91-9876543214" },
      existing
    );
    expect(match?.candidateId).toBe("1");
  });

  it("flags a weak duplicate on exact name collision", () => {
    const match = findDuplicate(
      { id: "2", name: "Vikram Joshi", email: "different@example.com", phone: "1111111111" },
      existing
    );
    expect(match?.reason).toContain("Vikram Joshi");
  });

  it("does not flag genuinely distinct candidates", () => {
    const match = findDuplicate(
      { id: "2", name: "Anita Desai", email: "anita@example.com", phone: "2222222222" },
      existing
    );
    expect(match).toBeNull();
  });
});
