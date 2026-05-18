import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { setupFileHandlers } from "./ipc/file";
import { setupDialogHandlers } from "./ipc/dialog";
import { setupProjectHandlers } from "./ipc/project";
import { setupTemplateHandlers } from "./ipc/templates";
import { extractErrorMessage } from "./ipc/utils";

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 800,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    backgroundColor: "#1e1e2e",
    icon: join(__dirname, "../../build/icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const url = new URL(details.url);
      if (url.protocol === "https:" || url.protocol === "http:") {
        shell.openExternal(details.url).catch((err) => {
          console.error("Failed to open external URL:", details.url, err);
        });
      }
    } catch {
      // Invalid URL — ignore
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (
      is.dev &&
      process.env["ELECTRON_RENDERER_URL"] &&
      url.startsWith(process.env["ELECTRON_RENDERER_URL"])
    ) {
      return; // Allow dev server navigation
    }
    event.preventDefault();
  });

  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window-maximized-changed", true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window-maximized-changed", false);
  });

  // Window control handlers — scoped to this window's lifecycle so they do not
  // accumulate across re-creations (macOS dock reactivate after window-all-closed).
  const onMinimize = (): void => {
    mainWindow?.minimize();
  };
  const onMaximizeToggle = (): void => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  };
  const onClose = (): void => {
    mainWindow?.close();
  };
  ipcMain.on("window-minimize", onMinimize);
  ipcMain.on("window-maximize", onMaximizeToggle);
  ipcMain.on("window-close", onClose);
  mainWindow.on("closed", () => {
    ipcMain.removeListener("window-minimize", onMinimize);
    ipcMain.removeListener("window-maximize", onMaximizeToggle);
    ipcMain.removeListener("window-close", onClose);
    mainWindow = null;
  });

  const loadPromise =
    is.dev && process.env["ELECTRON_RENDERER_URL"]
      ? mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
      : mainWindow.loadFile(join(__dirname, "../renderer/index.html"));

  loadPromise.catch((err) => {
    dialog.showErrorBox("Failed to load application", extractErrorMessage(err));
  });
}

ipcMain.handle("window-is-maximized", () => {
  return mainWindow?.isMaximized();
});

void app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.mzinteractionbuilder");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Setup IPC handlers
  setupFileHandlers(ipcMain);
  setupDialogHandlers(ipcMain, dialog);
  setupProjectHandlers(ipcMain);
  setupTemplateHandlers(ipcMain);

  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
