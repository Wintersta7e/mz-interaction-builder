/**
 * Shared API type definitions used by both preload (contextBridge) and
 * renderer (window.api). Single source of truth — ARCH-1.
 */

export interface FileAPI {
  save: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  load: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  exists: (filePath: string) => Promise<boolean>;
}

export interface DialogAPI {
  openFolder: () => Promise<string | null>;
  saveFile: (options?: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;
  openFile: (options?: {
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;
  message: (options: {
    type?: "none" | "info" | "error" | "question" | "warning";
    title?: string;
    message: string;
    buttons?: string[];
  }) => Promise<number>;
}

export interface ProjectAPI {
  validate: (path: string) => Promise<{ valid: boolean; error?: string }>;
  setPath: (path: string) => Promise<{ success: boolean; error?: string }>;
  getPath: () => Promise<string | null>;
  getMaps: () => Promise<{ id: number; name: string }[] | { error: string }>;
  getMapEvents: (
    mapId: number,
  ) => Promise<{ id: number; name: string; pages: number }[] | { error: string }>;
  getSwitches: () => Promise<{ id: number; name: string }[] | { error: string }>;
  getVariables: () => Promise<{ id: number; name: string }[] | { error: string }>;
  exportToMap: (options: {
    mapId: number;
    eventId: number;
    pageIndex: number;
    commands: unknown[];
  }) => Promise<{ success: boolean; commandCount?: number; error?: string }>;
}

export interface WindowAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
}

/**
 * Template API — uses `unknown` at the IPC boundary. The renderer's
 * api.d.ts narrows these to the concrete `NodeTemplate` type.
 */
export interface TemplateAPI {
  list: () => Promise<{ success: boolean; templates: unknown[]; error?: string }>;
  save: (template: unknown) => Promise<{ success: boolean; error?: string }>;
  delete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

/** Composite API exposed on `window.api` via contextBridge */
export interface API {
  file: FileAPI;
  dialog: DialogAPI;
  project: ProjectAPI;
  template: TemplateAPI;
  window: WindowAPI;
}
