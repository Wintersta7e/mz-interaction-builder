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

/** Raw RPG Maker MZ map event structure from JSON */
interface RawMZEvent {
  id: number;
  name: string;
  pages: RawMZEventPage[];
}

/** Raw RPG Maker MZ event page */
interface RawMZEventPage {
  list: unknown[];
  [key: string]: unknown;
}

/** Raw RPG Maker MZ map data from JSON */
interface RawMZMapData {
  events: (RawMZEvent | null)[];
  [key: string]: unknown;
}

/** Raw RPG Maker MZ system data from JSON */
interface RawMZSystemData {
  switches: string[];
  variables: string[];
  [key: string]: unknown;
}

let projectPath: string | null = null;

export function setupProjectHandlers(ipcMain: IpcMain): void {
  // Validate project path
  ipcMain.handle(
    "project:validate",
    async (_event, path: string): Promise<{ valid: boolean; error?: string }> => {
      try {
        // Check for RPG Maker MZ project files (case-insensitive)
        const files = await readdir(path);
        const projectFile = files.find(
          (f) =>
            f.toLowerCase().endsWith(".rmmzproject") || f.toLowerCase().endsWith(".rpgproject"),
        );
        if (!projectFile) {
          return {
            valid: false,
            error: "Not a valid RPG Maker MZ project (no .rmmzproject or .rpgproject file found)",
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
    async (_event, path: string): Promise<{ success?: boolean; error?: string }> => {
      try {
        const files = await readdir(path);
        const hasProject = files.some(
          (f) =>
            f.toLowerCase().endsWith(".rmmzproject") || f.toLowerCase().endsWith(".rpgproject"),
        );
        if (!hasProject || !existsSync(join(path, "data"))) {
          return { error: "Not a valid RPG Maker MZ project" };
        }
        projectPath = path;
        return { success: true };
      } catch (error) {
        return { error: (error as Error).message };
      }
    },
  );

  // Get project path
  ipcMain.handle("project:get-path", (): string | null => {
    return projectPath;
  });

  // Get maps list
  ipcMain.handle("project:get-maps", async (): Promise<MZMapInfo[] | { error: string }> => {
    if (!projectPath) return { error: "No project loaded" };

    const mapInfoFile = join(projectPath, "data", "MapInfos.json");
    if (!existsSync(mapInfoFile)) {
      return { error: "MapInfos.json not found" };
    }

    try {
      const data = await readFile(mapInfoFile, "utf-8");
      let mapInfos: (MZMapInfo | null)[];
      try {
        mapInfos = JSON.parse(data) as (MZMapInfo | null)[];
      } catch (parseError) {
        return {
          error: `Failed to parse MapInfos.json: ${(parseError as Error).message}`,
        };
      }
      return mapInfos
        .filter((m): m is MZMapInfo => m !== null)
        .map((m) => ({ id: m.id, name: m.name }));
    } catch (error) {
      return { error: (error as Error).message };
    }
  });

  // Get events in a map
  ipcMain.handle(
    "project:get-map-events",
    async (_event, mapId: number): Promise<MZMapEvent[] | { error: string }> => {
      if (!projectPath) return { error: "No project loaded" };
      if (
        typeof mapId !== "number" ||
        !Number.isFinite(mapId) ||
        mapId < 1 ||
        mapId !== Math.floor(mapId)
      ) {
        return { error: "Invalid map ID" };
      }

      const mapFile = join(projectPath, "data", `Map${String(mapId).padStart(3, "0")}.json`);
      if (!existsSync(mapFile)) {
        return { error: "Map file not found" };
      }

      try {
        const data = await readFile(mapFile, "utf-8");
        let mapData: RawMZMapData;
        try {
          mapData = JSON.parse(data) as RawMZMapData;
        } catch (parseError) {
          return {
            error: `Failed to parse Map${String(mapId).padStart(3, "0")}.json: ${(parseError as Error).message}`,
          };
        }
        return mapData.events
          .filter((e): e is RawMZEvent => e !== null)
          .map((e) => ({
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
  ipcMain.handle("project:get-switches", async (): Promise<MZSwitch[] | { error: string }> => {
    if (!projectPath) return { error: "No project loaded" };

    const file = join(projectPath, "data", "System.json");
    if (!existsSync(file)) {
      return { error: "System.json not found" };
    }

    try {
      const data = await readFile(file, "utf-8");
      let system: RawMZSystemData;
      try {
        system = JSON.parse(data) as RawMZSystemData;
      } catch (parseError) {
        return {
          error: `Failed to parse System.json: ${(parseError as Error).message}`,
        };
      }
      return system.switches
        .map((name, index) => ({
          id: index,
          name: name || "",
        }))
        .filter((s) => s.id > 0);
    } catch (error) {
      return { error: (error as Error).message };
    }
  });

  // Get variables
  ipcMain.handle("project:get-variables", async (): Promise<MZVariable[] | { error: string }> => {
    if (!projectPath) return { error: "No project loaded" };

    const file = join(projectPath, "data", "System.json");
    if (!existsSync(file)) {
      return { error: "System.json not found" };
    }

    try {
      const data = await readFile(file, "utf-8");
      let system: RawMZSystemData;
      try {
        system = JSON.parse(data) as RawMZSystemData;
      } catch (parseError) {
        return {
          error: `Failed to parse System.json: ${(parseError as Error).message}`,
        };
      }
      return system.variables
        .map((name, index) => ({
          id: index,
          name: name || "",
        }))
        .filter((v) => v.id > 0);
    } catch (error) {
      return { error: (error as Error).message };
    }
  });

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
      if (
        typeof options.mapId !== "number" ||
        !Number.isFinite(options.mapId) ||
        options.mapId < 1 ||
        options.mapId !== Math.floor(options.mapId)
      ) {
        return { success: false, error: "Invalid map ID" };
      }
      if (
        typeof options.eventId !== "number" ||
        !Number.isFinite(options.eventId) ||
        options.eventId < 1 ||
        options.eventId !== Math.floor(options.eventId)
      ) {
        return { success: false, error: "Invalid event ID" };
      }

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
        let mapData: RawMZMapData;
        try {
          mapData = JSON.parse(data) as RawMZMapData;
        } catch (parseError) {
          return {
            success: false,
            error: `Failed to parse Map${String(options.mapId).padStart(3, "0")}.json: ${(parseError as Error).message}`,
          };
        }

        if (!Array.isArray(mapData.events)) {
          return {
            success: false,
            error: "Invalid map file structure: no events array",
          };
        }

        // Find the event
        const mapEvent = mapData.events.find(
          (e): e is RawMZEvent => e !== null && e.id === options.eventId,
        );
        if (!mapEvent) {
          return {
            success: false,
            error: `Event ID ${options.eventId} not found in map`,
          };
        }

        const page: RawMZEventPage | undefined = mapEvent.pages[options.pageIndex];
        if (!page) {
          return {
            success: false,
            error: `Page ${options.pageIndex} not found in event`,
          };
        }

        if (!Array.isArray(page.list)) {
          return {
            success: false,
            error: `Page ${options.pageIndex} has no command list`,
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
