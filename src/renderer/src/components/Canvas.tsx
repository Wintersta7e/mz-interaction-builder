import { useCallback, useRef, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  SelectionMode,
  type NodeChange,
  type EdgeChange,
  type OnMoveEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "../nodes";
import { edgeTypes } from "../edges";
import { CanvasContextMenu } from "./CanvasContextMenu";
import { SearchPanel } from "./SearchPanel";
import { findUpstreamNodes, findDownstreamNodes } from "../lib/graphTraversal";
import { BookmarkPanel } from "./BookmarkPanel";
import { BreadcrumbTrail } from "./BreadcrumbTrail";
import { useCanvasSearch } from "../hooks/useCanvasSearch";
import { usePathHighlighting } from "../hooks/usePathHighlighting";
import {
  useDocumentStore,
  useUIStore,
  useHistoryStore,
  generateId,
} from "../stores";
import type {
  InteractionNodeType,
  InteractionNode,
  InteractionEdge,
  InteractionNodeData,
  InteractionEdgeData,
} from "../types";

function getDefaultNodeData(type: InteractionNodeType): InteractionNodeData {
  switch (type) {
    case "start":
      return { type: "start", label: "Start" };
    case "menu":
      return {
        type: "menu",
        label: "Choice Menu",
        choices: [],
        cancelType: "disallow",
        windowBackground: 0,
        windowPosition: 2,
      };
    case "action":
      return { type: "action", label: "Action", actions: [] };
    case "condition":
      return {
        type: "condition",
        label: "Condition",
        condition: { id: generateId("cond"), type: "switch" },
      };
    case "end":
      return { type: "end", label: "End" };
  }
}

// Node accent color mapping (matches CSS variables and node components)
const NODE_ACCENT_COLORS: Record<InteractionNodeType, string> = {
  start: "#34d399",
  menu: "#a78bfa",
  action: "#38bdf8",
  condition: "#fbbf24",
  end: "#fb7185",
};

// Quick-add hotkeys: press 1-5 to create a node at viewport center
const HOTKEY_NODE_MAP: Record<string, InteractionNodeType> = {
  "1": "start",
  "2": "menu",
  "3": "action",
  "4": "condition",
  "5": "end",
};

function getEdgeTypeAndData(
  connection: Connection,
  nodes: InteractionNode[],
): { type: string; data: InteractionEdgeData } {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  const sourceType = sourceNode?.type as InteractionNodeType | undefined;
  const targetType = targetNode?.type as InteractionNodeType | undefined;

  const sourceColor = sourceType ? NODE_ACCENT_COLORS[sourceType] : "#9ca3af";
  const targetColor = targetType ? NODE_ACCENT_COLORS[targetType] : "#9ca3af";

  if (sourceType === "condition" && connection.sourceHandle === "true") {
    return {
      type: "interaction",
      data: {
        edgeStyle: "condition-true",
        sourceColor: "#34d399",
        targetColor,
        conditionBranch: "true",
      },
    };
  }
  if (sourceType === "condition" && connection.sourceHandle === "false") {
    return {
      type: "interaction",
      data: {
        edgeStyle: "condition-false",
        sourceColor: "#fb7185",
        targetColor,
        conditionBranch: "false",
      },
    };
  }
  if (sourceType === "menu" && connection.sourceHandle?.startsWith("choice-")) {
    const parsed = parseInt(connection.sourceHandle.replace("choice-", ""), 10);
    const choiceIndex = Number.isNaN(parsed) ? 0 : parsed;
    return {
      type: "interaction",
      data: {
        edgeStyle: "choice",
        sourceColor: "#a78bfa",
        targetColor,
        choiceIndex,
      },
    };
  }

  return {
    type: "interaction",
    data: { edgeStyle: "default", sourceColor, targetColor },
  };
}

function CanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    document,
    setNodes,
    setEdges,
    addNode,
    addEdge: addDocEdge,
  } = useDocumentStore();
  const { selectedNodeId, setSelectedNodeId, showMinimap, zoom, setZoom } =
    useUIStore();
  const { push } = useHistoryStore();
  const { screenToFlowPosition, fitView, setCenter, getNodes } = useReactFlow();

  const setHighlightedPaths = useUIStore((s) => s.setHighlightedPaths);
  const clearHighlightedPaths = useUIStore((s) => s.clearHighlightedPaths);

  // Extracted hooks for search and path highlighting (M3)
  const { searchOpen } = useCanvasSearch(reactFlowWrapper, document.nodes);
  usePathHighlighting(reactFlowWrapper);

  const [nodes, setNodesState, onNodesChange] = useNodesState(document.nodes);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(document.edges);

  // Refs to track latest state for use in callbacks (avoids stale closures)
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Track drag state to prevent double history push (B5)
  const isDraggingRef = useRef(false);

  // P4: Cache selectedNodeId in ref to avoid re-creating keydown handler
  const selectedNodeIdRef = useRef(selectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Sync local state when document changes (e.g., file load, undo/redo)
  useEffect(() => {
    setNodesState(document.nodes);
    setEdgesState(document.edges);
  }, [document.nodes, document.edges, setNodesState, setEdgesState]);

  // Sync nodes/edges changes to document store
  const handleNodesChange = useCallback(
    (changes: NodeChange<InteractionNode>[]) => {
      // Track drag state to prevent double history push (B5)
      const dragStart = changes.some(
        (c) => c.type === "position" && c.dragging,
      );
      const dragEnd = changes.some((c) => c.type === "position" && !c.dragging);

      if (dragStart) isDraggingRef.current = true;

      const isRemoveOrAdd = changes.some(
        (c) => c.type === "remove" || c.type === "add",
      );
      const isDragComplete = dragEnd && isDraggingRef.current;

      if (isDragComplete) isDraggingRef.current = false;

      const significantChange = isRemoveOrAdd || isDragComplete;

      if (significantChange) {
        push(useDocumentStore.getState().document);
      }

      // Apply changes to local ReactFlow state
      onNodesChange(changes);

      // Sync to document store (M6: applies same changes to same snapshot, producing correct result)
      if (significantChange) {
        const updatedNodes = applyNodeChanges(changes, nodesRef.current);
        setNodes(updatedNodes);
      }
    },
    [onNodesChange, setNodes, push],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<InteractionEdge>[]) => {
      const significantChange = changes.some(
        (c) => c.type === "remove" || c.type === "add",
      );

      // Push current document to history BEFORE applying changes
      if (significantChange) {
        push(useDocumentStore.getState().document);
      }

      // Apply changes to local ReactFlow state
      onEdgesChange(changes);

      // Sync to document store using computed new edges
      if (significantChange) {
        const newEdges = applyEdgeChanges(changes, edgesRef.current);
        setEdges(newEdges);
      }
    },
    [onEdgesChange, setEdges, push],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Push current document to history before making changes
      push(useDocumentStore.getState().document);
      const { type, data } = getEdgeTypeAndData(connection, nodesRef.current);
      const newEdge: InteractionEdge = {
        ...connection,
        id: generateId("edge"),
        type,
        data,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      };
      setEdgesState((eds) => addEdge(newEdge, eds));
      addDocEdge(newEdge);
    },
    [setEdgesState, addDocEdge, push],
  );

  // M1: Use getState() to read edges at call-time, avoiding dependency on document.nodes/edges
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: InteractionNode) => {
      if (event.altKey) {
        // Alt+Click = upstream, Shift+Alt+Click = downstream (Phase 3B)
        const traverseFn = event.shiftKey
          ? findDownstreamNodes
          : findUpstreamNodes;
        const { edges: docEdges } = useDocumentStore.getState().document;
        const result = traverseFn(node.id, docEdges);
        setHighlightedPaths(
          Array.from(result.nodeIds),
          Array.from(result.edgeIds),
        );
      } else {
        clearHighlightedPaths();
      }
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId, setHighlightedPaths, clearHighlightedPaths],
  );

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPosition: { x: number; y: number };
  } | null>(null);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setContextMenu(null);
    clearHighlightedPaths();
  }, [setSelectedNodeId, clearHighlightedPaths]);

  const onEdgeClick = useCallback(() => {
    // Deselect node when edge is clicked
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const rawType = event.dataTransfer.getData(
        "application/interaction-node",
      );
      if (!rawType) return;
      const validTypes: InteractionNodeType[] = [
        "start",
        "menu",
        "action",
        "condition",
        "end",
      ];
      if (!validTypes.includes(rawType as InteractionNodeType)) return;
      const type = rawType as InteractionNodeType;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: InteractionNode = {
        id: generateId(type),
        type,
        position,
        data: getDefaultNodeData(type),
      };

      // Push current document to history before making changes
      push(useDocumentStore.getState().document);
      addNode(newNode);
      setNodesState((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, addNode, setNodesState, push],
  );

  const onMoveEnd: OnMoveEnd = useCallback(
    (_event, viewport) => {
      setZoom(viewport.zoom);
    },
    [setZoom],
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      setContextMenu({
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
        flowPosition,
      });
    },
    [screenToFlowPosition],
  );

  // L2: Navigate to a node using measured dimensions for accurate centering
  const navigateToNode = useCallback(
    (nodeId: string) => {
      const node = getNodes().find((n) => n.id === nodeId);
      if (node) {
        const w = node.measured?.width ?? 180;
        const h = node.measured?.height ?? 80;
        setCenter(node.position.x + w / 2, node.position.y + h / 2, {
          zoom: 1,
          duration: 300,
        });
        setSelectedNodeId(nodeId);
      }
    },
    [getNodes, setCenter, setSelectedNodeId],
  );

  const handleContextMenuAddNode = useCallback(
    (type: InteractionNodeType) => {
      if (!contextMenu) return;
      const newNode: InteractionNode = {
        id: generateId(type),
        type,
        position: contextMenu.flowPosition,
        data: getDefaultNodeData(type),
      };
      push(useDocumentStore.getState().document);
      addNode(newNode);
      setNodesState((nds) => [...nds, newNode]);
      setSelectedNodeId(newNode.id);
      setContextMenu(null);
    },
    [contextMenu, push, addNode, setNodesState, setSelectedNodeId],
  );

  // Clipboard for copy/paste
  const clipboardRef = useRef<{
    nodes: InteractionNode[];
    edges: InteractionEdge[];
  } | null>(null);

  // Handle Delete key to remove selected node and Copy/Paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F: Open search (Phase 3A) — works even when input is focused
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        useUIStore.getState().setSearchOpen(true);
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

        // Remap edges — only keep edges where BOTH endpoints were copied (B7)
        const newEdges: InteractionEdge[] = clipboardRef.current.edges
          .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
          .map((edge) => ({
            ...structuredClone(edge),
            id: generateId("edge"),
            source: idMap.get(edge.source)!,
            target: idMap.get(edge.target)!,
          }));

        // Update clipboard for next paste — fresh clone, don't mutate original (B4)
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

      // Home: Fit to Start (Phase 3D) — L2: use measured dimensions
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

      // Number keys 1-5: quick-add node at viewport center
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

        const newNode: InteractionNode = {
          id: generateId(nodeType),
          type: nodeType,
          position: centerPosition,
          data: getDefaultNodeData(nodeType),
        };

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
  ]);

  // P6: Memoize MiniMap nodeColor to avoid re-renders
  const miniMapNodeColor = useCallback(
    (node: { type?: string }) =>
      NODE_ACCENT_COLORS[(node.type as InteractionNodeType) || "start"] ||
      "#9ca3af",
    [],
  );

  return (
    <div className="flex h-full w-full flex-col">
      <BreadcrumbTrail onNavigateToNode={navigateToNode} />
      <div ref={reactFlowWrapper} className="relative flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onPaneContextMenu={onPaneContextMenu}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onMoveEnd={onMoveEnd}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultViewport={{ x: 0, y: 0, zoom }}
          minZoom={0.25}
          maxZoom={2}
          edgesFocusable={true}
          elementsSelectable={true}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          className="bg-background"
        >
          <Background
            variant={BackgroundVariant.Dots}
            color="hsl(230 15% 15%)"
            gap={20}
            size={1.5}
          />
          <Controls className="!bg-card/80 !border-border !shadow-lg !backdrop-blur-sm !rounded-xl" />
          {showMinimap && (
            <MiniMap
              nodeStrokeWidth={3}
              className="!bg-card/60 !border-border !rounded-xl !backdrop-blur-md"
              maskColor="hsl(230 25% 7% / 0.8)"
              nodeBorderRadius={4}
              nodeColor={miniMapNodeColor}
              pannable
              zoomable
              style={{ width: 180, height: 120 }}
            />
          )}
        </ReactFlow>
        {contextMenu && (
          <CanvasContextMenu
            position={{ x: contextMenu.x, y: contextMenu.y }}
            onAddNode={handleContextMenuAddNode}
            onClose={() => setContextMenu(null)}
          />
        )}
        {searchOpen && <SearchPanel onNavigateToNode={navigateToNode} />}
        <BookmarkPanel onNavigateToNode={navigateToNode} />
      </div>
    </div>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
