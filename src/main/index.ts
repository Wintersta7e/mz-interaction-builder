import { app, shell, BrowserWindow, ipcMain, dialog } from "electron";
import { join } from "path";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import { setupFileHandlers } from "./ipc/file";
import { setupDialogHandlers } from "./ipc/dialog";
import { setupProjectHandlers } from "./ipc/project";

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
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// Window control handlers
ipcMain.on("window-minimize", () => {
  mainWindow?.minimize();
});

ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on("window-close", () => {
  mainWindow?.close();
});

ipcMain.handle("window-is-maximized", () => {
  return mainWindow?.isMaximized();
});

// Notify renderer when window maximized state changes
function setupMaximizeListener(): void {
  if (mainWindow) {
    mainWindow.on("maximize", () => {
      mainWindow?.webContents.send("window-maximized-changed", true);
    });
    mainWindow.on("unmaximize", () => {
      mainWindow?.webContents.send("window-maximized-changed", false);
    });
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.mzinteractionbuilder");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Setup IPC handlers
  setupFileHandlers(ipcMain);
  setupDialogHandlers(ipcMain, dialog);
  setupProjectHandlers(ipcMain);

  createWindow();
  setupMaximizeListener();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
