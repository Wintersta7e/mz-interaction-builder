import { useMemo, useCallback } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useDocumentStore, useUIStore } from "../stores";
import { findShortestPath } from "../lib/graphTraversal";
import type { DocumentState } from "../stores";

// Stable selector: returns primitive string|null — only re-renders when start node ID changes
const selectStartNodeId = (s: DocumentState) =>
  s.document.nodes.find((n) => n.type === "start")?.id ?? null;

interface BreadcrumbTrailProps {
  onNavigateToNode: (nodeId: string) => void;
}

export function BreadcrumbTrail({ onNavigateToNode }: BreadcrumbTrailProps) {
  const nodes = useDocumentStore((s) => s.document.nodes);
  const edges = useDocumentStore((s) => s.document.edges);
  const startNodeId = useDocumentStore(selectStartNodeId);
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);

  // M2: Only recompute BFS when edges, selection, or start node changes — not on position updates
  const path = useMemo(() => {
    if (!selectedNodeId || !startNodeId) return null;
    if (startNodeId === selectedNodeId) return [startNodeId];
    return findShortestPath(startNodeId, selectedNodeId, edges);
  }, [selectedNodeId, startNodeId, edges]);

  const handleClick = useCallback(
    (nodeId: string) => {
      onNavigateToNode(nodeId);
    },
    [onNavigateToNode],
  );

  if (!path || path.length === 0) return null;

  // Truncate: if >5 nodes, show first 2 + ... + last 2
  const MAX_VISIBLE = 5;
  const truncated = path.length > MAX_VISIBLE;
  const visiblePath = truncated
    ? [...path.slice(0, 2), "...", ...path.slice(-2)]
    : path;

  return (
    <div className="flex items-center gap-1 border-b border-border bg-card/50 px-4 py-1.5 text-xs">
      {visiblePath.map((item, i) => {
        if (item === "...") {
          return (
            <span
              key="ellipsis"
              className="flex items-center gap-1 text-muted-foreground"
            >
              <ChevronRight className="h-3 w-3" />
              <MoreHorizontal className="h-3 w-3" />
            </span>
          );
        }

        const node = nodes.find((n) => n.id === item);
        if (!node) return null;
        const isLast = i === visiblePath.length - 1;

        return (
          <span key={item} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
            <button
              onClick={() => handleClick(item)}
              className={`rounded px-1.5 py-0.5 transition-colors hover:bg-muted ${
                isLast ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {node.data.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
