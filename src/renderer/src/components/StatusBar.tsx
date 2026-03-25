import React from "react";
import { useDocumentStore, useProjectStore, useUIStore } from "../stores";

export function StatusBar(): React.JSX.Element {
  const nodeCount = useDocumentStore((s) => s.document.nodes.length);
  const edgeCount = useDocumentStore((s) => s.document.edges.length);
  const savedPath = useDocumentStore((s) => s.savedPath);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const { projectPath } = useProjectStore();
  const { zoom } = useUIStore();

  return (
    <div className="flex h-6 items-center justify-between bg-muted px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>
          {savedPath ? savedPath : "Unsaved"}
          {isDirty && " *"}
        </span>
        {projectPath && <span className="text-primary">Project: {projectPath}</span>}
      </div>
      <div className="flex items-center gap-4">
        <span>Nodes: {nodeCount}</span>
        <span>Edges: {edgeCount}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
