import { IpcMain, app } from "electron";
import { readFile, writeFile, readdir, mkdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

function getTemplatesDir(): string {
  return join(app.getPath("userData"), "templates");
}

async function ensureTemplatesDir(): Promise<string> {
  const dir = getTemplatesDir();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

export function setupTemplateHandlers(ipcMain: IpcMain): void {
  ipcMain.handle("templates:list", async () => {
    try {
      const dir = await ensureTemplatesDir();
      const files = await readdir(dir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      const templates = await Promise.all(
        jsonFiles.map(async (file) => {
          const content = await readFile(join(dir, file), "utf-8");
          return JSON.parse(content);
        }),
      );
      return { success: true, templates };
    } catch (error) {
      return { success: false, error: (error as Error).message, templates: [] };
    }
  });

  ipcMain.handle("templates:save", async (_event, template: unknown) => {
    try {
      const dir = await ensureTemplatesDir();
      const t = template as { id: string };
      const filePath = join(dir, `${t.id}.json`);
      await writeFile(filePath, JSON.stringify(template, null, 2), "utf-8");
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("templates:delete", async (_event, id: string) => {
    try {
      const dir = await ensureTemplatesDir();
      const filePath = join(dir, `${id}.json`);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
