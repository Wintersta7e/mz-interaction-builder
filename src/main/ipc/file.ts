import { IpcMain } from "electron";
import { readFile, writeFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { extname } from "path";

// SEC-10: Maximum file size for .mzinteraction files (50 MB)
const MAX_INTERACTION_FILE_SIZE = 50 * 1024 * 1024;

/** Validate that a file path is safe for interaction file operations */
function isAllowedFilePath(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return ext === ".mzinteraction";
}

export function setupFileHandlers(ipcMain: IpcMain): void {
  // Save interaction file
  ipcMain.handle(
    "file:save",
    async (
      _event,
      filePath: string,
      content: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!isAllowedFilePath(filePath)) {
          return {
            success: false,
            error: "Only .mzinteraction files are allowed",
          };
        }
        await writeFile(filePath, content, "utf-8");
        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  // Load interaction file
  ipcMain.handle(
    "file:load",
    async (
      _event,
      filePath: string,
    ): Promise<{ success: boolean; content?: string; error?: string }> => {
      try {
        if (!isAllowedFilePath(filePath)) {
          return {
            success: false,
            error: "Only .mzinteraction files are allowed",
          };
        }
        if (!existsSync(filePath)) {
          return { success: false, error: "File not found" };
        }
        // SEC-10: Check file size before reading to prevent memory exhaustion
        const fileStats = await stat(filePath);
        if (fileStats.size > MAX_INTERACTION_FILE_SIZE) {
          return {
            success: false,
            error: `File too large (${Math.round(fileStats.size / 1024 / 1024)}MB, max ${MAX_INTERACTION_FILE_SIZE / 1024 / 1024}MB)`,
          };
        }
        const content = await readFile(filePath, "utf-8");
        return { success: true, content };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );

  // Check if file exists
  ipcMain.handle("file:exists", (_event, filePath: string): boolean => {
    return existsSync(filePath);
  });
}
