import { useEffect, useRef, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import { usePreviewStore } from "../stores";

/**
 * Manages preview highlighting DOM effects.
 * Applies CSS classes to React Flow nodes/edges for dimming/highlighting
 * during dialogue preview.
 *
 * Uses direct DOM manipulation and incremental updates to avoid re-rendering
 * all nodes when only one or two have changed.
 */
export function usePreviewHighlighting(wrapperRef: RefObject<HTMLDivElement | null>): void {
  const isOpen = usePreviewStore((s) => s.isOpen);
  const previewState = usePreviewStore((s) => s.previewState);
  const coverageData = usePreviewStore((s) => s.coverageData);
  const focusNodeId = usePreviewStore((s) => s.focusNodeId);
  const { setCenter, getNodes } = useReactFlow();

  // Track which IDs have the preview-visited class applied so we can do
  // incremental updates instead of scanning every node element on each step.
  const markedNodesRef = useRef<Set<string>>(new Set());
  const markedEdgesRef = useRef<Set<string>>(new Set());
  const currentNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const rfEl = wrapperRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!rfEl) return;

    if (!isOpen) {
      rfEl.removeAttribute("data-previewing");
      rfEl.querySelectorAll(".preview-current, .preview-visited").forEach((el) => {
        el.classList.remove("preview-current", "preview-visited");
      });
      markedNodesRef.current = new Set();
      markedEdgesRef.current = new Set();
      currentNodeIdRef.current = null;
      return;
    }

    rfEl.setAttribute("data-previewing", "");
    const newCurrentId = previewState?.currentNodeId ?? null;
    const visitedNodes = coverageData.visitedNodes;
    const visitedEdges = coverageData.visitedEdges;

    // Swap preview-current: remove from previous, add to new (1–2 DOM ops).
    if (currentNodeIdRef.current && currentNodeIdRef.current !== newCurrentId) {
      const prevEl = rfEl.querySelector(`.react-flow__node[data-id="${currentNodeIdRef.current}"]`);
      prevEl?.classList.remove("preview-current");
      // The just-departed node is now visited.
      if (visitedNodes.has(currentNodeIdRef.current)) {
        prevEl?.classList.add("preview-visited");
        markedNodesRef.current.add(currentNodeIdRef.current);
      }
    }
    if (newCurrentId && newCurrentId !== currentNodeIdRef.current) {
      const el = rfEl.querySelector(`.react-flow__node[data-id="${newCurrentId}"]`);
      if (el) {
        el.classList.remove("preview-visited");
        el.classList.add("preview-current");
      }
    }
    currentNodeIdRef.current = newCurrentId;

    // Add preview-visited only to newly-visited node IDs (typically 0–1/step)
    for (const id of visitedNodes) {
      if (id === newCurrentId) continue;
      if (markedNodesRef.current.has(id)) continue;
      const el = rfEl.querySelector(`.react-flow__node[data-id="${id}"]`);
      el?.classList.add("preview-visited");
      markedNodesRef.current.add(id);
    }

    // Same for edges.
    for (const id of visitedEdges) {
      if (markedEdgesRef.current.has(id)) continue;
      const el = rfEl.querySelector(`.react-flow__edge[data-id="${id}"]`);
      el?.classList.add("preview-visited");
      markedEdgesRef.current.add(id);
    }

    return () => {
      rfEl.removeAttribute("data-previewing");
      rfEl
        .querySelectorAll(".preview-current, .preview-visited")
        .forEach((el) => el.classList.remove("preview-current", "preview-visited"));
      markedNodesRef.current = new Set();
      markedEdgesRef.current = new Set();
      currentNodeIdRef.current = null;
    };
  }, [isOpen, previewState, coverageData, wrapperRef]);

  // Auto-center on current node when it changes
  useEffect(() => {
    if (!isOpen || !previewState?.currentNodeId) return;
    const node = getNodes().find((n) => n.id === previewState.currentNodeId);
    if (node) {
      const w = node.measured?.width ?? 180;
      const h = node.measured?.height ?? 80;
      void setCenter(node.position.x + w / 2, node.position.y + h / 2, {
        zoom: 1,
        duration: 300,
      });
    }
  }, [isOpen, previewState?.currentNodeId, setCenter, getNodes]);

  // Handle focusNodeId from ExecutionLog clicks
  useEffect(() => {
    if (!focusNodeId) return;
    const node = getNodes().find((n) => n.id === focusNodeId);
    if (node) {
      const w = node.measured?.width ?? 180;
      const h = node.measured?.height ?? 80;
      void setCenter(node.position.x + w / 2, node.position.y + h / 2, {
        zoom: 1,
        duration: 300,
      });
    }
    usePreviewStore.getState().setFocusNodeId(null);
  }, [focusNodeId, setCenter, getNodes]);
}
