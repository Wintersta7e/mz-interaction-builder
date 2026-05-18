import { describe, it, expect } from "vitest";
import { extractErrorMessage } from "../utils";

function errnoError(code: string, message: string): NodeJS.ErrnoException {
  const e = new Error(message) as NodeJS.ErrnoException;
  e.code = code;
  return e;
}

describe("extractErrorMessage (main)", () => {
  it("maps ENOENT to 'File not found'", () => {
    expect(
      extractErrorMessage(errnoError("ENOENT", "ENOENT: no such file, open '/secret/path.json'")),
    ).toBe("File not found");
  });

  it("maps EACCES and EPERM to 'Permission denied'", () => {
    expect(extractErrorMessage(errnoError("EACCES", "..."))).toBe("Permission denied");
    expect(extractErrorMessage(errnoError("EPERM", "..."))).toBe("Permission denied");
  });

  it("maps EBUSY, EISDIR, ENOTDIR, EEXIST, ENOSPC, EMFILE, ENFILE", () => {
    expect(extractErrorMessage(errnoError("EBUSY", "..."))).toBe("File is in use");
    expect(extractErrorMessage(errnoError("EISDIR", "..."))).toBe("Path is a directory");
    expect(extractErrorMessage(errnoError("ENOTDIR", "..."))).toBe("Path is not a directory");
    expect(extractErrorMessage(errnoError("EEXIST", "..."))).toBe("File already exists");
    expect(extractErrorMessage(errnoError("ENOSPC", "..."))).toBe("No space left on device");
    expect(extractErrorMessage(errnoError("EMFILE", "..."))).toBe("Too many open files");
    expect(extractErrorMessage(errnoError("ENFILE", "..."))).toBe("Too many open files");
  });

  it("strips trailing Unix paths from un-coded Error messages", () => {
    const result = extractErrorMessage(new Error("Parse failed at /home/user/data.json"));
    expect(result).toBe("Parse failed at");
  });

  it("strips trailing Windows paths from un-coded Error messages", () => {
    const result = extractErrorMessage(new Error("Parse failed at C:\\Users\\daisy\\data.json"));
    expect(result).toBe("Parse failed at");
  });

  it("strips mid-message paths globally, not just at end", () => {
    const result = extractErrorMessage(
      new Error("Could not parse /home/user/proj/data.json — invalid syntax at line 4"),
    );
    expect(result).not.toContain("/home/user");
    expect(result).not.toContain("data.json");
    expect(result).toContain("invalid syntax");
  });

  it("strips paths embedded in quotes (Node ENOENT-style fallback when code is missing)", () => {
    const result = extractErrorMessage(
      new Error("Operation failed: open '/home/user/Documents/File.mzinteraction'"),
    );
    expect(result).not.toContain("/home/user");
    expect(result).not.toContain("File.mzinteraction");
    expect(result).toContain("Operation failed");
  });

  it("returns raw string error as-is", () => {
    expect(extractErrorMessage("a plain error")).toBe("a plain error");
  });

  it("returns 'Unknown error' for null/undefined/other inputs", () => {
    expect(extractErrorMessage(null)).toBe("Unknown error");
    expect(extractErrorMessage(undefined)).toBe("Unknown error");
    expect(extractErrorMessage({ what: "ever" })).toBe("Unknown error");
    expect(extractErrorMessage(42)).toBe("Unknown error");
  });

  it("preserves non-path text when no path is present", () => {
    expect(extractErrorMessage(new Error("Just a plain message"))).toBe("Just a plain message");
  });
});
