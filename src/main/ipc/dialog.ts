import { IpcMain, Dialog } from "electron";

export function setupDialogHandlers(ipcMain: IpcMain, dialog: Dialog): void {
  // Open folder dialog
  ipcMain.handle("dialog:open-folder", async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  // Save file dialog
  ipcMain.handle(
    "dialog:save-file",
    async (
      _event,
      options: {
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      } = {},
    ): Promise<string | null> => {
      const dialogOptions: Electron.SaveDialogOptions = {
        filters: options.filters || [
          { name: "MZ Interaction Files", extensions: ["mzinteraction"] },
          { name: "All Files", extensions: ["*"] },
        ],
      };
      if (options.defaultPath !== undefined) {
        dialogOptions.defaultPath = options.defaultPath;
      }
      const result = await dialog.showSaveDialog(dialogOptions);
      return result.canceled ? null : result.filePath;
    },
  );

  // Open file dialog
  ipcMain.handle(
    "dialog:open-file",
    async (
      _event,
      options: { filters?: { name: string; extensions: string[] }[] } = {},
    ): Promise<string | null> => {
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: options.filters || [
          { name: "MZ Interaction Files", extensions: ["mzinteraction"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      return result.canceled ? null : (result.filePaths[0] ?? null);
    },
  );

  // Message dialog
  ipcMain.handle(
    "dialog:message",
    async (
      _event,
      options: {
        type?: "none" | "info" | "error" | "question" | "warning";
        title?: string;
        message: string;
        buttons?: string[];
      },
    ): Promise<number> => {
      const result = await dialog.showMessageBox({
        type: options.type || "info",
        title: options.title || "MZ Interaction Builder",
        message: options.message,
        buttons: options.buttons || ["OK"],
      });
      return result.response;
    },
  );
}
