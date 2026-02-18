import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Folder,
  HelpCircle,
  AlertTriangle,
  LayoutGrid,
  ChevronDown,
  Grid3x3,
} from "lucide-react";
import {
  useDocumentStore,
  useHistoryStore,
  useUIStore,
  useProjectStore,
} from "../stores";
import { TitleBar } from "./TitleBar";

interface ToolbarProps {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onExport: () => void;
  onOpenProject: () => void;
  onHelp?: () => void;
  onValidate?: () => void;
}

export function Toolbar({
  onNew,
  onOpen,
  onSave,
  onExport,
  onOpenProject,
  onHelp,
  onValidate,
}: ToolbarProps) {
  const { isDirty } = useDocumentStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();
  const { zoom, setZoom } = useUIStore();
  const { projectPath } = useProjectStore();
  const setDocument = useDocumentStore((s) => s.setDocument);
  const triggerAutoLayout = useUIStore((s) => s.triggerAutoLayout);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useUIStore((s) => s.toggleSnapToGrid);
  const [layoutDirection, setLayoutDirection] = useState<"LR" | "TB">("LR");
  const [nodeSpacing, setNodeSpacing] = useState(80);
  const [rankSpacing, setRankSpacing] = useState(200);

  const handleUndo = () => {
    const doc = undo();
    if (doc) setDocument(doc);
  };

  const handleRedo = () => {
    const doc = redo();
    if (doc) setDocument(doc);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 2));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.25));
  };

  const handleZoomReset = () => {
    setZoom(1);
  };

  return (
    <div>
      <TitleBar />
      <div className="flex items-center gap-1 border-t border-border px-2 py-1">
        {/* File operations */}
        <div className="flex items-center gap-1">
          <button
            onClick={onNew}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="New (Ctrl+N)"
          >
            <FilePlus className="h-4 w-4" />
          </button>
          <button
            onClick={onOpen}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Open (Ctrl+O)"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
          <button
            onClick={onSave}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Save (Ctrl+S)"
          >
            <Save className={`h-4 w-4 ${isDirty ? "text-amber-500" : ""}`} />
          </button>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo()}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo()}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted disabled:opacity-50"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="flex h-8 min-w-[60px] items-center justify-center rounded px-2 text-sm hover:bg-muted"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Fit View"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Layout */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() =>
              triggerAutoLayout({
                direction: layoutDirection,
                nodeSpacing,
                rankSpacing,
              })
            }
            className="flex h-8 items-center gap-1.5 rounded-l px-2 hover:bg-muted"
            title="Auto Layout (Ctrl+Shift+L)"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="text-xs">Layout</span>
          </button>
          <Popover.Root>
            <Popover.Trigger asChild>
              <button
                className="flex h-8 w-5 items-center justify-center rounded-r hover:bg-muted"
                title="Layout Settings"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="z-50 w-56 rounded-lg border border-border bg-card p-3 shadow-xl"
                sideOffset={5}
                align="start"
              >
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Layout Settings
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">Direction</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setLayoutDirection("LR")}
                        className={`flex-1 rounded px-2 py-1 text-xs ${
                          layoutDirection === "LR"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        Left &rarr; Right
                      </button>
                      <button
                        onClick={() => setLayoutDirection("TB")}
                        className={`flex-1 rounded px-2 py-1 text-xs ${
                          layoutDirection === "TB"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        Top &darr; Bottom
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">
                      Node Spacing: {nodeSpacing}px
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={200}
                      value={nodeSpacing}
                      onChange={(e) => setNodeSpacing(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs">
                      Rank Spacing: {rankSpacing}px
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={500}
                      value={rankSpacing}
                      onChange={(e) => setRankSpacing(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                  <button
                    onClick={() =>
                      triggerAutoLayout({
                        direction: layoutDirection,
                        nodeSpacing,
                        rankSpacing,
                      })
                    }
                    className="w-full rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    Apply Layout
                  </button>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>

        {/* Grid snap */}
        <button
          onClick={toggleSnapToGrid}
          className={`flex h-8 w-8 items-center justify-center rounded hover:bg-muted ${
            snapToGrid ? "text-primary" : "text-muted-foreground"
          }`}
          title={`Snap to Grid (Ctrl+G) — ${snapToGrid ? "On" : "Off"}`}
        >
          <Grid3x3 className="h-4 w-4" />
        </button>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Project */}
        <button
          onClick={onOpenProject}
          className={`flex h-8 items-center gap-2 rounded px-3 text-sm hover:bg-muted ${
            projectPath ? "text-primary" : "text-muted-foreground"
          }`}
          title={
            projectPath ? `Project: ${projectPath}` : "Open RPG Maker Project"
          }
        >
          <Folder className="h-4 w-4" />
          {projectPath ? "Project Loaded" : "Open Project"}
        </button>

        <div className="flex-1" />

        {/* Help & Validation */}
        <div className="flex items-center gap-1">
          {onValidate && (
            <button
              onClick={onValidate}
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
              title="Validate (Check for issues)"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          )}
          {onHelp && (
            <button
              onClick={onHelp}
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
              title="Help (F1)"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Export */}
        <button
          onClick={onExport}
          className="flex h-8 items-center gap-2 rounded bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>
    </div>
  );
}
