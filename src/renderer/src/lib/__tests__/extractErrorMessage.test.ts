import { describe, it, expect } from "vitest";
import { extractErrorMessage } from "../extractErrorMessage";

describe("extractErrorMessage (renderer)", () => {
  it("returns the message of a real Error", () => {
    expect(extractErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a raw string as-is", () => {
    expect(extractErrorMessage("just a string")).toBe("just a string");
  });

  it("falls back to 'Unknown error' on null/undefined/other objects", () => {
    expect(extractErrorMessage(null)).toBe("Unknown error");
    expect(extractErrorMessage(undefined)).toBe("Unknown error");
    expect(extractErrorMessage({ code: 5 })).toBe("Unknown error");
    expect(extractErrorMessage(42)).toBe("Unknown error");
  });
});
