import { IpcMain } from "electron";
import { readFile, writeFile, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

interface MZMapInfo {
  id: number;
  name: string;
}

interface MZMapEvent {
  id: number;
  name: string;
  pages: number;
}

interface MZSwitch {
  id: number;
  name: string;
}

interface MZVariable {
  id: number;
  name: string;
}

let projectPath: string | null = null;

export function setupProjectHandlers(ipcMain: IpcMain): void {
  // Validate project path
  ipcMain.handle(
    "project:validate",
    async (
      _event,
      path: string,
    ): Promise<{ valid: boolean; error?: string }> => {
      try {
        // Check for RPG Maker MZ project files (case-insensitive)
        const files = await readdir(path);
        const projectFile = files.find(
          (f) =>
            f.toLowerCase().endsWith(".rmmzproject") ||
            f.toLowerCase().endsWith(".rpgproject"),
        );
        if (!projectFile) {
          return {
            valid: false,
            error:
              "Not a valid RPG Maker MZ project (no .rmmzproject or .rpgproject file found)",
          };
        }
        // Also verify data folder exists
        if (!existsSync(join(path, "data"))) {
          return {
            valid: false,
            error: "Not a valid RPG Maker MZ project (data folder not found)",
          };
        }
        return { valid: true };
      } catch (error) {
        return { valid: false, error: (error as Error).message };
      }
    },
  );

  // Set project path
  ipcMain.handle(
    "project:set-path",
    async (_event, path: string): Promise<void> => {
      projectPath = path;
    },
  );

  // Get project path
  ipcMain.handle("project:get-path", async (): Promise<string | null> => {
    return projectPath;
  });

  // Get maps list
  ipcMain.handle(
    "project:get-maps",
    async (): Promise<MZMapInfo[] | { error: string }> => {
      if (!projectPath) return { error: "No project loaded" };

      const mapInfoFile = join(projectPath, "data", "MapInfos.json");
      if (!existsSync(mapInfoFile)) {
        return { error: "MapInfos.json not found" };
      }

      try {
        const data = await readFile(mapInfoFile, "utf-8");
        const mapInfos = JSON.parse(data);
        return mapInfos
          .filter((m: MZMapInfo | null) => m)
          .map((m: MZMapInfo) => ({ id: m.id, name: m.name }));
      } catch (error) {
        return { error: (error as Error).message };
      }
    },
  );

  // Get events in a map
  ipcMain.handle(
    "project:get-map-events",
    async (
      _event,
      mapId: number,
    ): Promise<MZMapEvent[] | { error: string }> => {
      if (!projectPath) return { error: "No project loaded" };

      const mapFile = join(
        projectPath,
        "data",
        `Map${String(mapId).padStart(3, "0")}.json`,
      );
      if (!existsSync(mapFile)) {
        return { error: "Map file not found" };
      }

      try {
        const data = await readFile(mapFile, "utf-8");
        const mapData = JSON.parse(data);
        return mapData.events
          .filter(
            (e: { id: number; name: string; pages: unknown[] } | null) => e,
          )
          .map((e: { id: number; name: string; pages: unknown[] }) => ({
            id: e.id,
            name: e.name || "(unnamed)",
            pages: e.pages?.length || 1,
          }));
      } catch (error) {
        return { error: (error as Error).message };
      }
    },
  );

  // Get switches
  ipcMain.handle(
    "project:get-switches",
    async (): Promise<MZSwitch[] | { error: string }> => {
      if (!projectPath) return { error: "No project loaded" };

      const file = join(projectPath, "data", "System.json");
      if (!existsSync(file)) {
        return { error: "System.json not found" };
      }

      try {
        const data = await readFile(file, "utf-8");
        const system = JSON.parse(data);
        return system.switches
          .map((name: string, index: number) => ({
            id: index,
            name: name || "",
          }))
          .filter((s: MZSwitch) => s.id > 0);
      } catch (error) {
        return { error: (error as Error).message };
      }
    },
  );

  // Get variables
  ipcMain.handle(
    "project:get-variables",
    async (): Promise<MZVariable[] | { error: string }> => {
      if (!projectPath) return { error: "No project loaded" };

      const file = join(projectPath, "data", "System.json");
      if (!existsSync(file)) {
        return { error: "System.json not found" };
      }

      try {
        const data = await readFile(file, "utf-8");
        const system = JSON.parse(data);
        return system.variables
          .map((name: string, index: number) => ({
            id: index,
            name: name || "",
          }))
          .filter((v: MZVariable) => v.id > 0);
      } catch (error) {
        return { error: (error as Error).message };
      }
    },
  );

  // Export to map
  ipcMain.handle(
    "project:export-to-map",
    async (
      _event,
      options: {
        mapId: number;
        eventId: number;
        pageIndex: number;
        commands: unknown[];
      },
    ): Promise<{ success: boolean; commandCount?: number; error?: string }> => {
      if (!projectPath) return { success: false, error: "No project loaded" };

      const mapFile = join(
        projectPath,
        "data",
        `Map${String(options.mapId).padStart(3, "0")}.json`,
      );
      if (!existsSync(mapFile)) {
        return {
          success: false,
          error: `Map file not found: Map${String(options.mapId).padStart(3, "0")}.json`,
        };
      }

      try {
        const data = await readFile(mapFile, "utf-8");
        const mapData = JSON.parse(data);

        // Find the event
        const mapEvent = mapData.events.find(
          (e: { id: number } | null) => e && e.id === options.eventId,
        );
        if (!mapEvent) {
          return {
            success: false,
            error: `Event ID ${options.eventId} not found in map`,
          };
        }

        const page = mapEvent.pages[options.pageIndex];
        if (!page) {
          return {
            success: false,
            error: `Page ${options.pageIndex} not found in event`,
          };
        }

        // Insert commands before the terminating null command
        const insertIndex = page.list.length - 1;
        page.list.splice(insertIndex, 0, ...options.commands);

        // Save the map file
        await writeFile(mapFile, JSON.stringify(mapData, null, 2));

        return { success: true, commandCount: options.commands.length };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    },
  );
}
