import { IpcMain, app } from "electron";
import { readFile, writeFile, readdir, mkdir, unlink } from "fs/promises";
import { join, basename } from "path";

function getTemplatesDir(): string {
  return join(app.getPath("userData"), "templates");
}

async function ensureTemplatesDir(): Promise<string> {
  const dir = getTemplatesDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Validate that an ID is safe for use as a filename (no path traversal). */
function isValidTemplateId(id: unknown): id is string {
  if (typeof id !== "string" || id.length === 0 || id.length > 255)
    return false;
  // Must equal its own basename (no slashes, .., etc.) and only contain safe chars
  if (basename(id) !== id) return false;
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/** Basic structural validation for a template payload. */
function isValidTemplatePayload(value: unknown): value is {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
} {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    Array.isArray(obj.nodes) &&
    Array.isArray(obj.edges)
  );
}

export function setupTemplateHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("templates:list", async () => {
    try {
      const dir = await ensureTemplatesDir();
      const files = await readdir(dir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      // Load each file individually so one corrupt file doesn't break all templates
      const results = await Promise.allSettled(
        jsonFiles.map(async (file) => {
          const content = await readFile(join(dir, file), "utf-8");
          const parsed: unknown = JSON.parse(content);
          if (!isValidTemplatePayload(parsed)) {
            throw new Error(`Invalid template structure in ${file}`);
          }
          return parsed;
        }),
      );

      const templates = results
        .filter(
          (r): r is PromiseFulfilledResult<ReturnType<typeof JSON.parse>> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      return { success: true, templates };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        templates: [],
      };
    }
  });

  ipcMain.handle("templates:save", async (_event, template: unknown) => {
    try {
      if (!isValidTemplatePayload(template)) {
        return { success: false, error: "Invalid template data" };
      }
      if (!isValidTemplateId(template.id)) {
        return { success: false, error: "Invalid template ID" };
      }

      const dir = await ensureTemplatesDir();
      const filePath = join(dir, `${template.id}.json`);
      await writeFile(filePath, JSON.stringify(template, null, 2), "utf-8");
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("templates:delete", async (_event, id: string) => {
    try {
      if (!isValidTemplateId(id)) {
        return { success: false, error: "Invalid template ID" };
      }

      const dir = await ensureTemplatesDir();
      const filePath = join(dir, `${id}.json`);
      await unlink(filePath).catch(() => {
        // File already gone — treat as success
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
