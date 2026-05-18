import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
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
import { AnimatePresence } from "framer-motion";
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
import { usePreviewHighlighting } from "../hooks/usePreviewHighlighting";
import { useCanvasKeyboard } from "../hooks/useCanvasKeyboard";
import { useCanvasLayout } from "../hooks/useCanvasLayout";
import { AlignmentToolbar } from "./AlignmentToolbar";
import { SaveTemplateModal } from "./SaveTemplateModal";
import { computeGuideLines, type GuideLine } from "../lib/alignmentGuides";
import { AlignmentGuides } from "./AlignmentGuides";
import {
  pendingAnimationTimers,
  pendingAnimationFrames,
  clearPendingAnimationTimers,
} from "../lib/pendingAnimationTimers";
import {
  useDocumentStore,
  useUIStore,
  useHistoryStore,
  usePreviewStore,
  generateId,
} from "../stores";
import { NODE_ACCENT_COLORS } from "../lib/nodeColors";
import { getEdgeTypeAndData } from "../lib/edgeUtils";
import { createNode } from "../lib/nodeFactory";
import { useTemplateStore } from "../stores/templateStore";
import { instantiateTemplate } from "../lib/templateUtils";
import type { InteractionNodeType, InteractionNode, InteractionEdge } from "../types";

const VALID_NODE_TYPES: ReadonlySet<InteractionNodeType> = new Set([
  "start",
  "menu",
  "action",
  "condition",
  "end",
  "group",
  "comment",
]);
const MUTABLE_NODE_TYPES: ReadonlySet<string> = new Set(["action", "menu", "condition", "end"]);

/** Fire-and-forget entrance animation on newly added node elements. */
function animateNodeEntrance(nodeIds: string[], duration = 200): void {
  const frameId = requestAnimationFrame(() => {
    pendingAnimationFrames.delete(frameId);
    for (const id of nodeIds) {
      const el = window.document.querySelector(`[data-id="${id}"] .interaction-node`);
      if (el instanceof HTMLElement) {
        el.setAttribute("data-entering", "true");
        const timerId = setTimeout(() => {
          pendingAnimationTimers.delete(timerId);
          if (el.isConnected) el.removeAttribute("data-entering");
        }, duration);
        pendingAnimationTimers.add(timerId);
      }
    }
  });
  pendingAnimationFrames.add(frameId);
}

function CanvasInner(): React.JSX.Element {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { document, setNodes, setEdges, addNode, addEdge: addDocEdge } = useDocumentStore();
  const { selectedNodeId, setSelectedNodeId, showMinimap, zoom, setZoom, snapToGrid } =
    useUIStore();
  const { push } = useHistoryStore();
  const templates = useTemplateStore((s) => s.templates);
  const { screenToFlowPosition, setCenter, getNodes } = useReactFlow();

  const setHighlightedPaths = useUIStore((s) => s.setHighlightedPaths);
  const clearHighlightedPaths = useUIStore((s) => s.clearHighlightedPaths);

  // Extracted hooks for search and path highlighting (M3)
  const { searchOpen } = useCanvasSearch(reactFlowWrapper, document.nodes);
  usePathHighlighting(reactFlowWrapper);
  usePreviewHighlighting(reactFlowWrapper);

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

  // Track whether an edge reconnection was successful (Phase 5F)
  const edgeReconnectSuccessfulRef = useRef(false);

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

  // Cancel any in-flight node-entrance / paste-flash timers on unmount so
  // their closures over detached DOM elements are released immediately.
  useEffect(() => clearPendingAnimationTimers, []);

  // Sync nodes/edges changes to document store
  const handleNodesChange = useCallback(
    (changes: NodeChange<InteractionNode>[]) => {
      // Track drag state to prevent double history push (B5)
      const dragStart = changes.some((c) => c.type === "position" && c.dragging);
      const dragEnd = changes.some((c) => c.type === "position" && !c.dragging);

      if (dragStart) isDraggingRef.current = true;

      const isRemoveOrAdd = changes.some((c) => c.type === "remove" || c.type === "add");
      const isDragComplete = dragEnd && isDraggingRef.current;

      if (isDragComplete) isDraggingRef.current = false;

      // Compute alignment guides during drag (Phase 4E)
      const positionChanges = changes.filter(
        (
          c,
        ): c is NodeChange<InteractionNode> & {
          type: "position";
          dragging: true;
        } => c.type === "position" && "dragging" in c && c.dragging === true,
      );

      if (positionChanges.length === 1) {
        const firstChange = positionChanges[0]!;
        const draggedId = firstChange.id;
        const draggedNode = nodesRef.current.find((n) => n.id === draggedId);
        if (draggedNode && firstChange.position) {
          const updatedDragging = {
            ...draggedNode,
            position: firstChange.position,
          };
          const others = nodesRef.current.filter((n) => n.id !== draggedId);
          setGuideLines(computeGuideLines(updatedDragging, others));
        }
      }

      if (isDragComplete) setGuideLines([]);

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
      const significantChange = changes.some((c) => c.type === "remove" || c.type === "add");

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

  // Validate connections: reject self-loops and duplicate edges (I-3)
  const isValidConnection = useCallback((connection: Connection | InteractionEdge) => {
    if (connection.source === connection.target) return false;
    // Read live edges directly from the store to avoid the stale-ref race
    // between rapid connect events (edgesRef is updated by a useEffect after
    // the render that follows each connect).
    const currentEdges = useDocumentStore.getState().document.edges;
    return !currentEdges.some(
      (e) =>
        e.source === connection.source &&
        e.target === connection.target &&
        (e.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
        (e.targetHandle ?? null) === (connection.targetHandle ?? null),
    );
  }, []);

  // Edge reconnection handlers (Phase 5F)
  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessfulRef.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: InteractionEdge, newConnection: Connection) => {
      edgeReconnectSuccessfulRef.current = true;
      push(useDocumentStore.getState().document);

      const { type, data } = getEdgeTypeAndData(newConnection, nodesRef.current);
      const updatedEdges = reconnectEdge(oldEdge, newConnection, edgesRef.current).map((e) =>
        e.id === oldEdge.id ? { ...e, type, data } : e,
      );

      setEdgesState(updatedEdges);
      setEdges(updatedEdges);
    },
    [push, setEdgesState, setEdges],
  );

  const onReconnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, edge: InteractionEdge) => {
      if (!edgeReconnectSuccessfulRef.current) {
        // Dropped on empty space — delete the edge. Read live edges from the
        // store rather than edgesRef (which is updated by a useEffect after
        // render) so the post-reconnect snapshot is correct.
        push(useDocumentStore.getState().document);
        const updatedEdges = useDocumentStore
          .getState()
          .document.edges.filter((e) => e.id !== edge.id);
        setEdgesState(updatedEdges);
        setEdges(updatedEdges);
      }
    },
    [push, setEdgesState, setEdges],
  );

  // M1: Use getState() to read edges at call-time, avoiding dependency on document.nodes/edges
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: InteractionNode) => {
      if (event.altKey) {
        // Alt+Click = upstream, Shift+Alt+Click = downstream (Phase 3B)
        const traverseFn = event.shiftKey ? findDownstreamNodes : findUpstreamNodes;
        const { edges: docEdges } = useDocumentStore.getState().document;
        const result = traverseFn(node.id, docEdges);
        setHighlightedPaths(Array.from(result.nodeIds), Array.from(result.edgeIds));
      } else {
        clearHighlightedPaths();
      }
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId, setHighlightedPaths, clearHighlightedPaths],
  );

  // Alignment guide lines shown during node drag (Phase 4E)
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);

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

      // Handle template drop
      const templateId = event.dataTransfer.getData("application/interaction-template");
      if (templateId) {
        const template = templates.find((t) => t.id === templateId);
        if (!template) return;

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        push(useDocumentStore.getState().document);

        const { nodes: newNodes, edges: newEdges } = instantiateTemplate(
          template.nodes,
          template.edges,
          position,
        );

        const allNodes = [...nodesRef.current, ...newNodes];
        const allEdges = [...edgesRef.current, ...newEdges];
        setNodesState(allNodes);
        setEdgesState(allEdges);
        setNodes(allNodes);
        setEdges(allEdges);

        animateNodeEntrance(newNodes.map((n) => n.id));
        return;
      }

      const rawType = event.dataTransfer.getData("application/interaction-node");
      if (!rawType || !VALID_NODE_TYPES.has(rawType as InteractionNodeType)) return;
      const type = rawType as InteractionNodeType;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = createNode(type, position);

      // Push current document to history before making changes
      push(useDocumentStore.getState().document);
      addNode(newNode);
      setNodesState((nds) => [...nds, newNode]);

      animateNodeEntrance([newNode.id]);
    },
    [
      screenToFlowPosition,
      addNode,
      setNodesState,
      setEdgesState,
      setNodes,
      setEdges,
      push,
      templates,
    ],
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
        void setCenter(node.position.x + w / 2, node.position.y + h / 2, {
          zoom: 1,
          duration: 300,
        });
        setSelectedNodeId(nodeId);
      }
    },
    [getNodes, setCenter, setSelectedNodeId],
  );

  // Layout operations extracted to hook (auto-layout, align, distribute + trigger watcher)
  const { applyAutoLayout, applyAlign, applyDistribute } = useCanvasLayout({
    nodesRef,
    edgesRef,
    setNodesState,
  });

  const handleContextMenuAddNode = useCallback(
    (type: InteractionNodeType) => {
      if (!contextMenu) return;
      const newNode = createNode(type, contextMenu.flowPosition);
      push(useDocumentStore.getState().document);
      addNode(newNode);
      setNodesState((nds) => [...nds, newNode]);
      setSelectedNodeId(newNode.id);
      setContextMenu(null);
    },
    [contextMenu, push, addNode, setNodesState, setSelectedNodeId],
  );

  // Extracted hook: keyboard shortcuts, clipboard, mute toggle, template save
  const {
    handleSaveAsTemplate,
    handleToggleMute,
    saveTemplateOpen,
    setSaveTemplateOpen,
    templateNodes,
    templateEdges,
  } = useCanvasKeyboard({
    nodesRef,
    edgesRef,
    selectedNodeIdRef,
    reactFlowWrapper,
    setNodesState,
    setEdgesState,
    applyAutoLayout,
    applyAlign,
    applyDistribute,
  });

  // PERF-03/05: Memoize selection-derived data to avoid O(n) per render
  const selectedNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes]);
  const selectedNodeFromList = useMemo(
    () => (selectedNodeId ? (nodes.find((n) => n.id === selectedNodeId) ?? null) : null),
    [selectedNodeId, nodes],
  );

  // P6: Memoize MiniMap nodeColor to avoid re-renders
  const miniMapNodeColor = useCallback(
    (node: { type?: string }) =>
      NODE_ACCENT_COLORS[(node.type as InteractionNodeType) || "start"] || "#9ca3af",
    [],
  );

  // Memoize isMuted for the context menu. The previous inline IIFE allocated
  // a Set + ran a filter on every CanvasInner render (~60/sec during drag).
  const isMutedForContextMenu = useMemo(() => {
    if (!contextMenu) return false;
    const mutableSelected = selectedNodes.filter((n) => MUTABLE_NODE_TYPES.has(n.type ?? ""));
    if (mutableSelected.length > 0) return mutableSelected.every((n) => !!n.data.muted);
    return selectedNodeFromList && MUTABLE_NODE_TYPES.has(selectedNodeFromList.type ?? "")
      ? !!selectedNodeFromList.data.muted
      : false;
  }, [contextMenu, selectedNodes, selectedNodeFromList]);

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
          isValidConnection={isValidConnection}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onPaneContextMenu={onPaneContextMenu}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onMoveEnd={onMoveEnd}
          edgesReconnectable
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          snapToGrid={snapToGrid}
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
            color={snapToGrid ? "hsl(230 15% 22%)" : "hsl(230 15% 15%)"}
            gap={20}
            size={snapToGrid ? 2 : 1.5}
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
        <AlignmentGuides guides={guideLines} />
        <AnimatePresence>
          {contextMenu && (
            <CanvasContextMenu
              position={{ x: contextMenu.x, y: contextMenu.y }}
              onAddNode={handleContextMenuAddNode}
              onClose={() => setContextMenu(null)}
              onSaveAsTemplate={handleSaveAsTemplate}
              onToggleMute={() => {
                handleToggleMute();
                setContextMenu(null);
              }}
              onPreviewFromHere={(nodeId) => {
                usePreviewStore.getState().open(nodeId);
                setContextMenu(null);
              }}
              hasSelectedNodes={selectedNodes.length > 0 || selectedNodeId !== null}
              selectedNodeId={selectedNodeId}
              selectedNodeType={selectedNodeFromList?.type ?? null}
              isMuted={isMutedForContextMenu}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {searchOpen && <SearchPanel onNavigateToNode={navigateToNode} />}
        </AnimatePresence>
        <BookmarkPanel onNavigateToNode={navigateToNode} />
        <AlignmentToolbar
          selectedNodes={selectedNodes}
          onAlign={applyAlign}
          onDistribute={applyDistribute}
        />
        <SaveTemplateModal
          isOpen={saveTemplateOpen}
          onClose={() => setSaveTemplateOpen(false)}
          nodes={templateNodes}
          edges={templateEdges}
        />
      </div>
    </div>
  );
}

export function Canvas(): React.JSX.Element {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
