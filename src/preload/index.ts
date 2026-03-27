import { contextBridge, ipcRenderer } from "electron";
import type { FileAPI, DialogAPI, ProjectAPI, TemplateAPI, WindowAPI } from "../shared/api-types";

// Re-export shared types and composite API type
export type { FileAPI, DialogAPI, ProjectAPI, TemplateAPI, WindowAPI } from "../shared/api-types";
export type { API } from "../shared/api-types";

const fileApi: FileAPI = {
  save: (filePath, content) => ipcRenderer.invoke("file:save", filePath, content),
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
  exportToMap: (options) => ipcRenderer.invoke("project:export-to-map", options),
};

const windowApi: WindowAPI = {
  minimize: () => ipcRenderer.send("window-minimize"),
  maximize: () => ipcRenderer.send("window-maximize"),
  close: () => ipcRenderer.send("window-close"),
  isMaximized: () => ipcRenderer.invoke("window-is-maximized"),
  onMaximizeChange: (callback) => {
    const handler = (_event: unknown, isMaximized: boolean): void => callback(isMaximized);
    ipcRenderer.on("window-maximized-changed", handler);
    return () => ipcRenderer.removeListener("window-maximized-changed", handler);
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
