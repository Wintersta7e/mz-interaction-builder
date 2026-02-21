import { useCallback, useRef, useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";

import {
  useDocumentStore,
  useUIStore,
  useHistoryStore,
  generateId,
} from "../stores";
import { createNode } from "../lib/nodeFactory";
import type { AutoLayoutOptions } from "../lib/autoLayout";
import type { AlignMode, DistributeMode } from "../lib/alignNodes";
import type {
  InteractionNodeType,
  InteractionNode,
  InteractionEdge,
} from "../types";

// Quick-add hotkeys: press 1-7 to create a node at viewport center
const HOTKEY_NODE_MAP: Record<string, InteractionNodeType> = {
  "1": "start",
  "2": "menu",
  "3": "action",
  "4": "condition",
  "5": "end",
  "6": "group",
  "7": "comment",
};

interface UseCanvasKeyboardOptions {
  nodesRef: React.RefObject<InteractionNode[]>;
  edgesRef: React.RefObject<InteractionEdge[]>;
  selectedNodeIdRef: React.RefObject<string | null>;
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  setNodesState: React.Dispatch<React.SetStateAction<InteractionNode[]>>;
  setEdgesState: React.Dispatch<React.SetStateAction<InteractionEdge[]>>;
  applyAutoLayout: (options?: AutoLayoutOptions) => void;
  applyAlign: (mode: AlignMode) => void;
  applyDistribute: (mode: DistributeMode) => void;
}

interface UseCanvasKeyboardReturn {
  handleSaveAsTemplate: () => void;
  handleToggleMute: () => void;
  saveTemplateOpen: boolean;
  setSaveTemplateOpen: (open: boolean) => void;
  templateNodes: InteractionNode[];
  templateEdges: InteractionEdge[];
}

/**
 * Manages keyboard shortcuts, clipboard (copy/paste), mute toggle,
 * and template save logic for the Canvas.
 * Extracted from Canvas.tsx for separation of concerns.
 */
export function useCanvasKeyboard(
  options: UseCanvasKeyboardOptions,
): UseCanvasKeyboardReturn {
  const {
    nodesRef,
    edgesRef,
    selectedNodeIdRef,
    reactFlowWrapper,
    setNodesState,
    setEdgesState,
    applyAutoLayout,
    applyAlign,
    applyDistribute,
  } = options;

  const { setNodes, setEdges, addNode } = useDocumentStore();
  const { setSelectedNodeId, clearHighlightedPaths, toggleSnapToGrid } =
    useUIStore();
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const { push } = useHistoryStore();
  const { screenToFlowPosition, fitView, setCenter, getNodes } = useReactFlow();

  // Clipboard for copy/paste
  const clipboardRef = useRef<{
    nodes: InteractionNode[];
    edges: InteractionEdge[];
  } | null>(null);

  // Template save state
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateNodes, setTemplateNodes] = useState<InteractionNode[]>([]);
  const [templateEdges, setTemplateEdges] = useState<InteractionEdge[]>([]);

  // Toggle mute on selected nodes (Phase 5E)
  const handleToggleMute = useCallback(() => {
    const currentNodes = nodesRef.current;
    let targetNodes = currentNodes.filter(
      (n) =>
        n.selected &&
        n.type !== "start" &&
        n.type !== "group" &&
        n.type !== "comment",
    );

    // Fallback to single selected node
    if (targetNodes.length === 0 && selectedNodeIdRef.current) {
      const node = currentNodes.find((n) => n.id === selectedNodeIdRef.current);
      if (
        node &&
        node.type !== "start" &&
        node.type !== "group" &&
        node.type !== "comment"
      ) {
        targetNodes = [node];
      }
    }

    if (targetNodes.length === 0) return;

    push(useDocumentStore.getState().document);

    // I-1: Uniform action -- if any selected node is unmuted, mute all; else unmute all
    const shouldMute = targetNodes.some((n) => !n.data.muted);
    // S-4: Use Set for O(1) lookup instead of O(n*m) scan
    const targetIds = new Set(targetNodes.map((n) => n.id));

    const updatedNodes = currentNodes.map((n) => {
      if (targetIds.has(n.id)) {
        return { ...n, data: { ...n.data, muted: shouldMute } };
      }
      return n;
    });

    setNodesState(updatedNodes);
    setNodes(updatedNodes);
  }, [push, setNodesState, setNodes, nodesRef, selectedNodeIdRef]);

  const getSelectedNodesAndEdges = useCallback(() => {
    const selectedNodes = nodesRef.current.filter((n) => n.selected);
    if (selectedNodes.length === 0 && selectedNodeId) {
      const node = nodesRef.current.find((n) => n.id === selectedNodeId);
      if (node) return { nodes: [node], edges: [] as InteractionEdge[] };
    }
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const internalEdges = edgesRef.current.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target),
    );
    return { nodes: selectedNodes, edges: internalEdges };
  }, [selectedNodeId, nodesRef, edgesRef]);

  const handleSaveAsTemplate = useCallback(() => {
    const { nodes: selNodes, edges: selEdges } = getSelectedNodesAndEdges();
    if (selNodes.length === 0) return;
    setTemplateNodes(selNodes);
    setTemplateEdges(selEdges);
    setSaveTemplateOpen(true);
  }, [getSelectedNodesAndEdges]);

  // Main keydown event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F: Open search (Phase 3A) -- works even when input is focused
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        useUIStore.getState().setSearchOpen(true);
        return;
      }

      // Ctrl+Shift+L: Auto-layout (Phase 4A)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "l"
      ) {
        e.preventDefault();
        applyAutoLayout();
        return;
      }

      // Ctrl+G: Toggle snap-to-grid (Phase 4C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        toggleSnapToGrid();
        return;
      }

      // Escape: clear path highlights (Phase 3B)
      if (e.key === "Escape") {
        clearHighlightedPaths();
      }

      // Don't handle if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Alt+L/C/R/T/M/B: Alignment shortcuts (Phase 4B)
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const alignMap: Record<string, AlignMode> = {
          l: "left",
          c: "center",
          r: "right",
          t: "top",
          m: "middle",
          b: "bottom",
        };
        const mode = alignMap[e.key.toLowerCase()];
        if (mode) {
          e.preventDefault();
          applyAlign(mode);
          return;
        }
      }

      // Delete/Backspace - remove selected nodes and/or edges
      if (e.key === "Delete" || e.key === "Backspace") {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        const selectedNodes = currentNodes.filter((n) => n.selected);
        const selectedEdgesArr = currentEdges.filter((edge) => edge.selected);

        if (selectedNodes.length === 0 && selectedEdgesArr.length === 0) return;

        e.preventDefault();
        push(useDocumentStore.getState().document);

        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
        const selectedEdgeIds = new Set(
          selectedEdgesArr.map((edge) => edge.id),
        );

        // Remove selected nodes and any edges connected to them, plus selected edges
        const newNodes = currentNodes.filter((n) => !selectedNodeIds.has(n.id));
        const newEdges = currentEdges.filter(
          (edge) =>
            !selectedEdgeIds.has(edge.id) &&
            !selectedNodeIds.has(edge.source) &&
            !selectedNodeIds.has(edge.target),
        );

        // Updates to both ReactFlow state and Zustand are synchronous within this handler.
        // React 18 batches them into a single render, so they cannot diverge mid-update.
        setNodesState(newNodes);
        setEdgesState(newEdges);
        setNodes(newNodes);
        setEdges(newEdges);
        setSelectedNodeId(null);
      }

      // Ctrl+C - copy selected nodes and internal edges
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        const currentNodes = nodesRef.current;
        const currentEdges = edgesRef.current;
        let nodesToCopy = currentNodes.filter((n) => n.selected);

        // Fall back to single selected node from ReactFlow state (same source)
        if (nodesToCopy.length === 0 && selectedNodeIdRef.current) {
          const node = currentNodes.find(
            (n) => n.id === selectedNodeIdRef.current,
          );
          if (node) nodesToCopy = [node];
        }

        if (nodesToCopy.length === 0) return;

        e.preventDefault();
        const selectedIds = new Set(nodesToCopy.map((n) => n.id));
        const internalEdges = currentEdges.filter(
          (edge) =>
            selectedIds.has(edge.source) && selectedIds.has(edge.target),
        );

        clipboardRef.current = {
          nodes: structuredClone(nodesToCopy),
          edges: structuredClone(internalEdges),
        };
      }

      // Ctrl+V - paste nodes and remap edges
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (!clipboardRef.current || clipboardRef.current.nodes.length === 0)
          return;

        e.preventDefault();
        push(useDocumentStore.getState().document);

        const offset = { x: 20, y: 20 };
        const idMap = new Map<string, string>();

        // Create new nodes with new IDs and offset positions
        const newNodes: InteractionNode[] = clipboardRef.current.nodes.map(
          (node) => {
            const newId = generateId(node.type || "node");
            idMap.set(node.id, newId);
            return {
              ...structuredClone(node),
              id: newId,
              position: {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y,
              },
              selected: true,
            };
          },
        );

        // Remap edges -- only keep edges where BOTH endpoints were copied (B7)
        const newEdges: InteractionEdge[] = clipboardRef.current.edges
          .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
          .map((edge) => ({
            ...structuredClone(edge),
            id: generateId("edge"),
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
          }));

        // Update clipboard for next paste -- fresh clone, don't mutate original (B4)
        clipboardRef.current = {
          nodes: clipboardRef.current.nodes.map((n) => ({
            ...structuredClone(n),
            position: {
              x: n.position.x + offset.x,
              y: n.position.y + offset.y,
            },
          })),
          edges: clipboardRef.current.edges,
        };

        // Single-source update: compute new state from refs, set both local and store (B1)
        const allNodes = [
          ...nodesRef.current.map((n) => ({ ...n, selected: false })),
          ...newNodes,
        ];
        const allEdges = [...edgesRef.current, ...newEdges];
        setNodesState(allNodes);
        setEdgesState(allEdges);
        setNodes(allNodes);
        setEdges(allEdges);
      }

      // Ctrl+0: Fit All (Phase 3D)
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        fitView({ padding: 0.1, duration: 300 });
      }

      // Ctrl+1: Fit Selection (Phase 3D)
      if ((e.ctrlKey || e.metaKey) && e.key === "1") {
        e.preventDefault();
        const selected = getNodes().filter((n) => n.selected);
        if (selected.length > 0) {
          fitView({ nodes: selected, padding: 0.1, duration: 300 });
        } else if (selectedNodeIdRef.current) {
          const node = getNodes().find(
            (n) => n.id === selectedNodeIdRef.current,
          );
          if (node) fitView({ nodes: [node], padding: 0.1, duration: 300 });
        }
      }

      // Home: Fit to Start (Phase 3D) -- L2: use measured dimensions
      if (e.key === "Home") {
        e.preventDefault();
        const startNode = getNodes().find((n) => n.type === "start");
        if (startNode) {
          const w = startNode.measured?.width ?? 180;
          const h = startNode.measured?.height ?? 80;
          setCenter(
            startNode.position.x + w / 2,
            startNode.position.y + h / 2,
            { zoom: 1, duration: 300 },
          );
        }
      }

      // B: toggle bookmark (Phase 3C)
      if (
        e.key.toLowerCase() === "b" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const nodeId = selectedNodeIdRef.current;
        if (nodeId) {
          e.preventDefault();
          useDocumentStore.getState().toggleBookmark(nodeId);
        }
      }

      // M: toggle mute (Phase 5E)
      if (
        e.key.toLowerCase() === "m" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      // Number keys 1-7: quick-add node at viewport center
      const nodeType = HOTKEY_NODE_MAP[e.key];
      if (nodeType && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const wrapper = reactFlowWrapper.current;
        if (!wrapper) return;
        const bounds = wrapper.getBoundingClientRect();
        const centerPosition = screenToFlowPosition({
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        });

        const newNode = createNode(nodeType, centerPosition);

        push(useDocumentStore.getState().document);
        addNode(newNode);
        setNodesState((nds) => [...nds, newNode]);
        setSelectedNodeId(newNode.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    push,
    setNodes,
    setEdges,
    setNodesState,
    setEdgesState,
    setSelectedNodeId,
    screenToFlowPosition,
    fitView,
    setCenter,
    getNodes,
    clearHighlightedPaths,
    applyAutoLayout,
    applyAlign,
    applyDistribute,
    toggleSnapToGrid,
    handleToggleMute,
    addNode,
    nodesRef,
    edgesRef,
    selectedNodeIdRef,
    reactFlowWrapper,
  ]);

  return {
    handleSaveAsTemplate,
    handleToggleMute,
    saveTemplateOpen,
    setSaveTemplateOpen,
    templateNodes,
    templateEdges,
  };
}
