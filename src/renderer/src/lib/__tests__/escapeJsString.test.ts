import { describe, it, expect } from "vitest";
import { escapeJsString } from "../export";

describe("escapeJsString", () => {
  it("escapes single quotes", () => {
    expect(escapeJsString("It's")).toBe("It\\'s");
  });

  it("escapes backslashes before quotes", () => {
    expect(escapeJsString("C:\\path")).toBe("C:\\\\path");
  });

  it("escapes newlines, carriage returns, and tabs", () => {
    expect(escapeJsString("a\nb\rc\td")).toBe("a\\nb\\rc\\td");
  });

  it("escapes backslashes before single quotes to avoid double-escaping", () => {
    expect(escapeJsString("He said 'hi'")).toBe("He said \\'hi\\'");
  });

  it("escapes a string containing every escapable character", () => {
    expect(escapeJsString("\\'\n\r\t")).toBe("\\\\\\'\\n\\r\\t");
  });

  it("is a no-op on plain ASCII", () => {
    expect(escapeJsString("plain text 123")).toBe("plain text 123");
  });

  it("preserves Unicode characters as-is", () => {
    expect(escapeJsString("héllo 日本語")).toBe("héllo 日本語");
  });

  it("escapes backslash before newline so the literal stays intact", () => {
    expect(escapeJsString("a\\\nb")).toBe("a\\\\\\nb");
  });
});
