import { useEffect, useMemo } from "react";
import { Play, X } from "lucide-react";
import { usePreviewStore } from "../../stores";
import { useDocumentStore } from "../../stores";
import { PreviewControls } from "./PreviewControls";
import { DialogueWindow } from "./DialogueWindow";
import { VariableInspector } from "./VariableInspector";
import { ExecutionLog } from "./ExecutionLog";

export function PreviewPanel(): React.JSX.Element | null {
  const isOpen = usePreviewStore((s) => s.isOpen);
  const previewState = usePreviewStore((s) => s.previewState);
  const coverageData = usePreviewStore((s) => s.coverageData);
  const autoPlay = usePreviewStore((s) => s.autoPlay);
  const autoPlaySpeed = usePreviewStore((s) => s.autoPlaySpeed);
  const close = usePreviewStore((s) => s.close);
  const nodes = useDocumentStore((s) => s.document.nodes);

  // Auto-play effect: step on interval while running
  useEffect(() => {
    if (!autoPlay || !previewState || previewState.status !== "running") return;
    const timer = setInterval(() => {
      usePreviewStore.getState().step();
    }, autoPlaySpeed);
    return () => clearInterval(timer);
  }, [autoPlay, autoPlaySpeed, previewState?.status]);

  // Compute coverage stat: count functional nodes (exclude group, comment, start)
  const coverageStat = useMemo(() => {
    if (!isOpen) return null;

    const functionalNodes = nodes.filter(
      (n) => n.type !== "group" && n.type !== "comment" && n.type !== "start",
    );
    const totalCount = functionalNodes.length;
    if (totalCount === 0) return null;

    const visitedCount = functionalNodes.filter((n) =>
      coverageData.visitedNodes.has(n.id),
    ).length;
    const pct = Math.round((visitedCount / totalCount) * 100);

    return `${visitedCount}/${totalCount} (${pct}%)`;
  }, [isOpen, nodes, coverageData.visitedNodes]);

  if (!isOpen) return null;

  return (
    <div className="w-[400px] flex-shrink-0 border-l border-border flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Preview</span>
          {coverageStat && (
            <span className="text-xs text-muted-foreground">
              {coverageStat}
            </span>
          )}
        </div>
        <button
          className="p-1 rounded hover:bg-muted"
          title="Close preview"
          onClick={close}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Controls */}
      <PreviewControls />

      {/* Content area (placeholder sections for now) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <DialogueWindow />
        <VariableInspector />
        <ExecutionLog />
      </div>
    </div>
  );
}
