/** Safely extract a human-readable error message from an unknown catch value. */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Map common Node.js fs error codes to friendly text so absolute paths
    // do not leak into the renderer UI / shared bug reports.
    const code = (error as NodeJS.ErrnoException).code;
    if (code) {
      switch (code) {
        case "ENOENT":
          return "File not found";
        case "EACCES":
        case "EPERM":
          return "Permission denied";
        case "EBUSY":
          return "File is in use";
        case "EISDIR":
          return "Path is a directory";
        case "ENOTDIR":
          return "Path is not a directory";
        case "EEXIST":
          return "File already exists";
        case "ENOSPC":
          return "No space left on device";
        case "EMFILE":
        case "ENFILE":
          return "Too many open files";
      }
    }
    // Strip trailing absolute paths from messages we did not match above.
    return error.message.replace(/,?\s*['"]?(?:[a-zA-Z]:[\\/]|\/)[^'"\n]+['"]?$/, "").trim();
  }
  if (typeof error === "string") return error;
  return "Unknown error";
}
