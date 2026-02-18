import { describe, it, expect } from "vitest";
import { parseIntSafe } from "../parseIntSafe";

describe("parseIntSafe", () => {
  it("parses valid integers", () => {
    expect(parseIntSafe("42")).toBe(42);
    expect(parseIntSafe("0")).toBe(0);
    expect(parseIntSafe("-5")).toBe(-5);
  });

  it("returns undefined for empty string", () => {
    expect(parseIntSafe("")).toBeUndefined();
  });

  it("returns undefined for NaN-producing input", () => {
    expect(parseIntSafe("abc")).toBeUndefined();
    expect(parseIntSafe("choice-3")).toBeUndefined();
  });

  it("returns fallback when provided", () => {
    expect(parseIntSafe("", 0)).toBe(0);
    expect(parseIntSafe("abc", -1)).toBe(-1);
  });

  it("parses valid input even when fallback is provided", () => {
    expect(parseIntSafe("42", 0)).toBe(42);
  });
});
