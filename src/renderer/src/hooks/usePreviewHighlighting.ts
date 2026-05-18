import { useEffect, useRef, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import { usePreviewStore } from "../stores";

/**
 * Manages preview highlighting DOM effects.
 * Applies CSS classes to React Flow nodes/edges for dimming/highlighting
 * during dialogue preview.
 *
 * Two effects: one drives teardown when preview closes; the other applies
 * incremental DOM updates as previewState advances. Splitting them avoids
 * running the full querySelectorAll teardown on every step.
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

  // Teardown effect: only runs when isOpen flips or the component unmounts.
  // The cleanup returned from the open-run handles the close transition, so
  // the body only sets up when isOpen is true.
  useEffect(() => {
    if (!isOpen) return;
    const rfEl = wrapperRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!rfEl) return;

    rfEl.setAttribute("data-previewing", "");
    return () => {
      rfEl.removeAttribute("data-previewing");
      rfEl
        .querySelectorAll(".preview-current, .preview-visited")
        .forEach((el) => el.classList.remove("preview-current", "preview-visited"));
      markedNodesRef.current = new Set();
      markedEdgesRef.current = new Set();
      currentNodeIdRef.current = null;
    };
  }, [isOpen, wrapperRef]);

  // Incremental update effect: applies class swaps for the current node and
  // any newly-visited nodes/edges without tearing down on every step.
  useEffect(() => {
    if (!isOpen) return;
    const rfEl = wrapperRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!rfEl) return;

    const newCurrentId = previewState?.currentNodeId ?? null;
    const prevCurrentId = currentNodeIdRef.current;

    if (prevCurrentId && prevCurrentId !== newCurrentId) {
      const prevEl = rfEl.querySelector(`.react-flow__node[data-id="${prevCurrentId}"]`);
      prevEl?.classList.remove("preview-current");
      if (coverageData.visitedNodes.has(prevCurrentId)) {
        prevEl?.classList.add("preview-visited");
        markedNodesRef.current.add(prevCurrentId);
      }
    }
    if (newCurrentId && newCurrentId !== prevCurrentId) {
      const el = rfEl.querySelector(`.react-flow__node[data-id="${newCurrentId}"]`);
      if (el) {
        el.classList.remove("preview-visited");
        el.classList.add("preview-current");
      }
    }
    currentNodeIdRef.current = newCurrentId;

    for (const id of coverageData.visitedNodes) {
      if (id === newCurrentId || markedNodesRef.current.has(id)) continue;
      const el = rfEl.querySelector(`.react-flow__node[data-id="${id}"]`);
      el?.classList.add("preview-visited");
      markedNodesRef.current.add(id);
    }
    for (const id of coverageData.visitedEdges) {
      if (markedEdgesRef.current.has(id)) continue;
      const el = rfEl.querySelector(`.react-flow__edge[data-id="${id}"]`);
      el?.classList.add("preview-visited");
      markedEdgesRef.current.add(id);
    }
  }, [isOpen, previewState, coverageData, wrapperRef]);

  // Auto-center on current node when it changes
  useEffect(() => {
    if (!isOpen || !previewState?.currentNodeId) return;
    centerOnNode(getNodes(), previewState.currentNodeId, setCenter);
  }, [isOpen, previewState?.currentNodeId, setCenter, getNodes]);

  // Handle focusNodeId from ExecutionLog clicks
  useEffect(() => {
    if (!focusNodeId) return;
    centerOnNode(getNodes(), focusNodeId, setCenter);
    usePreviewStore.getState().setFocusNodeId(null);
  }, [focusNodeId, setCenter, getNodes]);
}

type RFNode = {
  id: string;
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
};
type SetCenter = (x: number, y: number, opts?: { zoom?: number; duration?: number }) => unknown;

function centerOnNode(nodes: RFNode[], nodeId: string, setCenter: SetCenter): void {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return;
  const w = node.measured?.width ?? 180;
  const h = node.measured?.height ?? 80;
  void setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1, duration: 300 });
}
