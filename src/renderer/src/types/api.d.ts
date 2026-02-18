// Consolidated Window API type declarations
export {};

declare global {
  interface Window {
    api: {
      file: {
        save: (
          filePath: string,
          content: string,
        ) => Promise<{ success: boolean; error?: string }>;
        load: (
          filePath: string,
        ) => Promise<{ success: boolean; content?: string; error?: string }>;
        exists: (filePath: string) => Promise<boolean>;
      };
      dialog: {
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
      };
      project: {
        validate: (path: string) => Promise<{ valid: boolean; error?: string }>;
        setPath: (path: string) => Promise<void>;
        getPath: () => Promise<string | null>;
        getMaps: () => Promise<
          { id: number; name: string }[] | { error: string }
        >;
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
        }) => Promise<{
          success: boolean;
          commandCount?: number;
          error?: string;
        }>;
      };
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
        onMaximizeChange: (
          callback: (isMaximized: boolean) => void,
        ) => () => void;
      };
    };
  }
}
