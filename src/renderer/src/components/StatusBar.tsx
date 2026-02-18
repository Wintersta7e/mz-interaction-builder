import { useDocumentStore, useProjectStore, useUIStore } from "../stores";

export function StatusBar() {
  const { document, savedPath, isDirty } = useDocumentStore();
  const { projectPath } = useProjectStore();
  const { zoom } = useUIStore();

  return (
    <div className="flex h-6 items-center justify-between bg-muted px-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>
          {savedPath ? savedPath : "Unsaved"}
          {isDirty && " *"}
        </span>
        {projectPath && (
          <span className="text-primary">Project: {projectPath}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>Nodes: {document.nodes.length}</span>
        <span>Edges: {document.edges.length}</span>
        <span>Zoom: {Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}
