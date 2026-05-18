/** Renderer-side error normalization. Mirrors main-process utility in src/main/ipc/utils.ts. */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}
