import { describe, it, expect } from "vitest";
import { parseResumeText, parseJobDescription } from "./parse";

describe("parseResumeText", () => {
  it("extracts email, phone, experience and notice period from a typical resume", () => {
    const text = [
      "Ritika Bansal",
      "ritika.bansal@example.com | 9876543210",
      "Senior Java Developer, 6.5 years experience",
      "Expert in Java and Spring Boot",
      "Notice period: 60 days",
    ].join("\n");
    const parsed = parseResumeText(text);
    expect(parsed.email).toBe("ritika.bansal@example.com");
    expect(parsed.phone).toBe("9876543210");
    expect(parsed.experienceYears).toBeCloseTo(6.5);
    expect(parsed.noticeDays).toBe(60);
    expect(parsed.keySkills).toContain("Java");
    expect(parsed.keySkills).toContain("Spring Boot");
  });

  it("handles an experience range by taking the midpoint", () => {
    const parsed = parseResumeText("Someone\n5-8 years of total experience in Java");
    expect(parsed.experienceYears).toBeCloseTo(6.5);
  });

  it("degrades gracefully on near-empty or garbled text", () => {
    const parsed = parseResumeText("xJ a v a sp.ring --- [illegible scan]");
    expect(parsed.email).toBeNull();
    expect(parsed.experienceYears).toBeNull();
    expect(parsed.name).toBeTruthy();
  });
});

describe("parseJobDescription", () => {
  it("extracts an experience band, notice cap, location and must-have skills", () => {
    const jd = "Senior Java Developer, 5-8 years, Spring Boot, Noida, notice up to 60 days";
    const parsed = parseJobDescription(jd);
    expect(parsed.experienceMin).toBe(5);
    expect(parsed.experienceMax).toBe(8);
    expect(parsed.noticeDaysMax).toBe(60);
    expect(parsed.location).toBe("Noida");
    expect(parsed.mustHaveSkills).toContain("Spring Boot");
  });

  it("derives a short title from a single-line JD instead of the whole paragraph", () => {
    const parsed = parseJobDescription(
      "Business Analyst, Pune, 2-5 years experience. Must have SQL, Excel, Python. Notice period up to 30 days."
    );
    expect(parsed.title).toBe("Business Analyst");
  });

  it("falls back to sane defaults when the JD has no explicit range", () => {
    const parsed = parseJobDescription("We need a KYC analyst with AML experience.");
    expect(parsed.experienceMin).toBe(0);
    expect(parsed.experienceMax).toBe(99);
    expect(parsed.noticeDaysMax).toBe(90);
    expect(parsed.mustHaveSkills).toContain("KYC");
  });
});
