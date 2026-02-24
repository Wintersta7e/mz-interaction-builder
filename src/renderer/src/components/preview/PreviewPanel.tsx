import { Component, useEffect, useMemo, type ReactNode } from "react";
import { Play, X, AlertTriangle, RotateCcw } from "lucide-react";
import { usePreviewStore } from "../../stores";
import { useDocumentStore } from "../../stores";
import { PreviewControls } from "./PreviewControls";
import { DialogueWindow } from "./DialogueWindow";
import { VariableInspector } from "./VariableInspector";
import { ExecutionLog } from "./ExecutionLog";

// ─── Error Boundary ──────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class PreviewErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Preview Error</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <button
            onClick={() => {
              this.setState({ error: null });
              usePreviewStore.getState().restart();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Restart Preview
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Preview Panel ───────────────────────────────────────────────

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

      {/* Content area wrapped in error boundary */}
      <PreviewErrorBoundary>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <DialogueWindow />
          <VariableInspector />
          <ExecutionLog />
        </div>
      </PreviewErrorBoundary>
    </div>
  );
}
