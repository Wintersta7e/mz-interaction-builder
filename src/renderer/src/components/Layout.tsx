import { ReactNode } from "react";

interface LayoutProps {
  toolbar: ReactNode;
  palette: ReactNode;
  canvas: ReactNode;
  properties: ReactNode;
  statusbar: ReactNode;
}

export function Layout({
  toolbar,
  palette,
  canvas,
  properties,
  statusbar,
}: LayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b border-border">{toolbar}</div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Palette */}
        <div className="w-[200px] flex-shrink-0 border-r border-border overflow-y-auto">
          {palette}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">{canvas}</div>

        {/* Properties Panel */}
        <div className="w-[320px] flex-shrink-0 border-l border-border overflow-y-auto">
          {properties}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 border-t border-border">{statusbar}</div>
    </div>
  );
}
