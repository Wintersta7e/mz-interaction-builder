import React, { useMemo, useCallback } from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useDocumentStore, useUIStore } from "../stores";
import { findShortestPath } from "../lib/graphTraversal";
import type { DocumentState } from "../stores";

// Stable selector: returns primitive string|null — only re-renders when start node ID changes
const selectStartNodeId = (s: DocumentState): string | null =>
  s.document.nodes.find((n) => n.type === "start")?.id ?? null;

interface BreadcrumbTrailProps {
  onNavigateToNode: (nodeId: string) => void;
}

export function BreadcrumbTrail({
  onNavigateToNode,
}: BreadcrumbTrailProps): React.JSX.Element | null {
  const nodes = useDocumentStore((s) => s.document.nodes);
  const edges = useDocumentStore((s) => s.document.edges);
  const startNodeId = useDocumentStore(selectStartNodeId);
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);

  // Derive the breadcrumb items in a single memo keyed on inputs that actually
  // matter (selection, start, edges, nodes). The previous version did a
  // `nodes.find` inside the render loop, which made every keystroke on any
  // node's label re-traverse the visible path even when the path didn't change.
  const items = useMemo(() => {
    if (!selectedNodeId || !startNodeId) return null;
    const path =
      startNodeId === selectedNodeId
        ? [startNodeId]
        : findShortestPath(startNodeId, selectedNodeId, edges);
    if (!path || path.length === 0) return null;

    const MAX_VISIBLE = 5;
    const truncated = path.length > MAX_VISIBLE;
    const visiblePath = truncated ? [...path.slice(0, 2), "...", ...path.slice(-2)] : path;

    const labelById = new Map(nodes.map((n) => [n.id, n.data.label] as const));
    return visiblePath.map((item) => ({
      id: item,
      label: item === "..." ? null : (labelById.get(item) ?? item),
    }));
  }, [selectedNodeId, startNodeId, edges, nodes]);

  const handleClick = useCallback(
    (nodeId: string) => {
      onNavigateToNode(nodeId);
    },
    [onNavigateToNode],
  );

  if (!items) return null;

  return (
    <div className="flex items-center gap-1 border-b border-border bg-card/50 px-4 py-1.5 text-xs">
      {items.map((item, i) => {
        if (item.label === null) {
          return (
            <span key="ellipsis" className="flex items-center gap-1 text-muted-foreground">
              <ChevronRight className="h-3 w-3" />
              <MoreHorizontal className="h-3 w-3" />
            </span>
          );
        }

        const isLast = i === items.length - 1;
        return (
          <span key={item.id} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <button
              onClick={() => handleClick(item.id)}
              className={`rounded px-1.5 py-0.5 transition-colors hover:bg-muted ${
                isLast ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
