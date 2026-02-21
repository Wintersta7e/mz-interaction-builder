import { contextBridge, ipcRenderer } from "electron";

// File API
export interface FileAPI {
  save: (
    filePath: string,
    content: string,
  ) => Promise<{ success: boolean; error?: string }>;
  load: (
    filePath: string,
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
  exists: (filePath: string) => Promise<boolean>;
}

// Dialog API
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

// Project API
export interface ProjectAPI {
  validate: (path: string) => Promise<{ valid: boolean; error?: string }>;
  setPath: (path: string) => Promise<void>;
  getPath: () => Promise<string | null>;
  getMaps: () => Promise<{ id: number; name: string }[] | { error: string }>;
  getMapEvents: (
    mapId: number,
  ) => Promise<
    { id: number; name: string; pages: number }[] | { error: string }
  >;
  getSwitches: () => Promise<
    { id: number; name: string }[] | { error: string }
  >;
  getVariables: () => Promise<
    { id: number; name: string }[] | { error: string }
  >;
  exportToMap: (options: {
    mapId: number;
    eventId: number;
    pageIndex: number;
    commands: unknown[];
  }) => Promise<{ success: boolean; commandCount?: number; error?: string }>;
}

// Template API
export interface TemplateAPI {
  list: () => Promise<{
    success: boolean;
    templates: unknown[];
    error?: string;
  }>;
  save: (template: unknown) => Promise<{ success: boolean; error?: string }>;
  delete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

// Window API
export interface WindowAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
}

const fileApi: FileAPI = {
  save: (filePath, content) =>
    ipcRenderer.invoke("file:save", filePath, content),
  load: (filePath) => ipcRenderer.invoke("file:load", filePath),
  exists: (filePath) => ipcRenderer.invoke("file:exists", filePath),
};

const dialogApi: DialogAPI = {
  openFolder: () => ipcRenderer.invoke("dialog:open-folder"),
  saveFile: (options = {}) => ipcRenderer.invoke("dialog:save-file", options),
  openFile: (options = {}) => ipcRenderer.invoke("dialog:open-file", options),
  message: (options) => ipcRenderer.invoke("dialog:message", options),
};

const projectApi: ProjectAPI = {
  validate: (path) => ipcRenderer.invoke("project:validate", path),
  setPath: (path) => ipcRenderer.invoke("project:set-path", path),
  getPath: () => ipcRenderer.invoke("project:get-path"),
  getMaps: () => ipcRenderer.invoke("project:get-maps"),
  getMapEvents: (mapId) => ipcRenderer.invoke("project:get-map-events", mapId),
  getSwitches: () => ipcRenderer.invoke("project:get-switches"),
  getVariables: () => ipcRenderer.invoke("project:get-variables"),
  exportToMap: (options) =>
    ipcRenderer.invoke("project:export-to-map", options),
};

const windowApi: WindowAPI = {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onMaximizeChange: (callback) => {
    const handler = (_event: unknown, isMaximized: boolean): void =>
      callback(isMaximized);
    ipcRenderer.on("window-maximized-changed", handler);
    return () =>
      ipcRenderer.removeListener("window-maximized-changed", handler);
  },
};

const templateApi: TemplateAPI = {
  list: () => ipcRenderer.invoke("templates:list"),
  save: (template) => ipcRenderer.invoke("templates:save", template),
  delete: (id) => ipcRenderer.invoke("templates:delete", id),
};

contextBridge.exposeInMainWorld("api", {
  file: fileApi,
  dialog: dialogApi,
  project: projectApi,
  template: templateApi,
  window: windowApi,
});

// Export types for renderer
export type API = {
  file: FileAPI;
  dialog: DialogAPI;
  project: ProjectAPI;
  template: TemplateAPI;
  window: WindowAPI;
};
