import { useState, useEffect } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import "../types/api.d";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Get initial state
    window.api.window.isMaximized().then(setIsMaximized);

    // Listen for changes
    const unsubscribe = window.api.window.onMaximizeChange(setIsMaximized);
    return unsubscribe;
  }, []);

  return (
    <div className="flex h-8 select-none items-center justify-between bg-background">
      {/* Draggable area */}
      <div className="flex-1 app-drag-region px-4">
        <span className="text-sm font-medium text-muted-foreground">
          MZ Interaction Builder
        </span>
      </div>

      {/* Window controls */}
      <div className="flex">
        <button
          onClick={() => window.api.window.minimize()}
          className="flex h-8 w-12 items-center justify-center hover:bg-muted"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={() => window.api.window.maximize()}
          className="flex h-8 w-12 items-center justify-center hover:bg-muted"
        >
          {isMaximized ? (
            <Copy className="h-3 w-3" />
          ) : (
            <Square className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={() => window.api.window.close()}
          className="flex h-8 w-12 items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
