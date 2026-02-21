import { useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";

import { useDocumentStore, useUIStore, useHistoryStore } from "../stores";
import { autoLayout } from "../lib/autoLayout";
import type { AutoLayoutOptions } from "../lib/autoLayout";
import { alignNodes, distributeNodes } from "../lib/alignNodes";
import type { AlignMode, DistributeMode } from "../lib/alignNodes";
import type { InteractionNode, InteractionEdge } from "../types";

interface UseCanvasLayoutOptions {
  nodesRef: React.RefObject<InteractionNode[]>;
  edgesRef: React.RefObject<InteractionEdge[]>;
  setNodesState: React.Dispatch<React.SetStateAction<InteractionNode[]>>;
}

interface UseCanvasLayoutReturn {
  applyAutoLayout: (options?: AutoLayoutOptions) => void;
  applyAlign: (mode: AlignMode) => void;
  applyDistribute: (mode: DistributeMode) => void;
}

export function useCanvasLayout({
  nodesRef,
  edgesRef,
  setNodesState,
}: UseCanvasLayoutOptions): UseCanvasLayoutReturn {
  const { setNodes } = useDocumentStore();
  const { push } = useHistoryStore();
  const { fitView } = useReactFlow();

  // Auto-layout (Phase 4A)
  const applyAutoLayout = useCallback(
    (options: AutoLayoutOptions = {}) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;
      if (currentNodes.length === 0) return;

      push(useDocumentStore.getState().document);

      const positions = autoLayout(currentNodes, currentEdges, options);
      const updatedNodes = currentNodes.map((node) => {
        const pos = positions.get(node.id);
        return pos ? { ...node, position: pos } : node;
      });

      setNodesState(updatedNodes);
      setNodes(updatedNodes);
      fitView({ padding: 0.1, duration: 300 });
    },
    [nodesRef, edgesRef, push, setNodesState, setNodes, fitView],
  );

  // Align selected nodes (Phase 4B)
  const applyAlign = useCallback(
    (mode: AlignMode) => {
      const selected = nodesRef.current.filter((n) => n.selected);
      if (selected.length < 2) return;

      push(useDocumentStore.getState().document);

      const aligned = alignNodes(selected, mode);
      const alignedMap = new Map(aligned.map((n) => [n.id, n]));
      const updatedNodes = nodesRef.current.map((n) =>
        alignedMap.has(n.id)
          ? { ...n, position: alignedMap.get(n.id)!.position }
          : n,
      );

      setNodesState(updatedNodes);
      setNodes(updatedNodes);
    },
    [nodesRef, push, setNodesState, setNodes],
  );

  // Distribute selected nodes (Phase 4B)
  const applyDistribute = useCallback(
    (mode: DistributeMode) => {
      const selected = nodesRef.current.filter((n) => n.selected);
      if (selected.length < 3) return; // need 3+ to distribute

      push(useDocumentStore.getState().document);

      const distributed = distributeNodes(selected, mode);
      const distMap = new Map(distributed.map((n) => [n.id, n]));
      const updatedNodes = nodesRef.current.map((n) =>
        distMap.has(n.id) ? { ...n, position: distMap.get(n.id)!.position } : n,
      );

      setNodesState(updatedNodes);
      setNodes(updatedNodes);
    },
    [nodesRef, push, setNodesState, setNodes],
  );

  // Watch for layout trigger from Toolbar (Phase 4A)
  const layoutTrigger = useUIStore((s) => s.layoutTrigger);
  const clearLayoutTrigger = useUIStore((s) => s.clearLayoutTrigger);

  useEffect(() => {
    if (layoutTrigger) {
      applyAutoLayout(layoutTrigger);
      clearLayoutTrigger();
    }
  }, [layoutTrigger, applyAutoLayout, clearLayoutTrigger]);

  return { applyAutoLayout, applyAlign, applyDistribute };
}
