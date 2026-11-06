import { describe, it, expect } from "vitest";
import { maskEmail, maskPhone } from "./mask";

describe("maskEmail", () => {
  it("keeps the first character and the domain, masks the rest", () => {
    expect(maskEmail("ritika.bansal@example.com")).toBe("r************@example.com");
  });

  it("handles missing email", () => {
    expect(maskEmail(null)).toBe("Not available");
  });

  it("never reveals more than the first character of a short local part", () => {
    const masked = maskEmail("ab@example.com");
    expect(masked.startsWith("a")).toBe(true);
    expect(masked).not.toContain("ab@");
  });
});

describe("maskPhone", () => {
  it("keeps only the last 3 digits visible", () => {
    expect(maskPhone("9876543210")).toBe("*******210");
  });

  it("handles missing phone", () => {
    expect(maskPhone(null)).toBe("Not available");
  });

  it("never produces a negative repeat count for very short numbers", () => {
    expect(() => maskPhone("12")).not.toThrow();
    expect(maskPhone("12")).toMatch(/^\*+12$/);
  });
});
