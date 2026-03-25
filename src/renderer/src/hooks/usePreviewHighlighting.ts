import { useEffect, type RefObject } from "react";
import { useReactFlow } from "@xyflow/react";
import { usePreviewStore } from "../stores";

/**
 * Manages preview highlighting DOM effects.
 * Applies CSS classes to React Flow nodes/edges for dimming/highlighting
 * during dialogue preview.
 *
 * NOTE: Uses direct DOM manipulation for performance — avoids re-rendering
 * all nodes just to toggle a CSS class. Follows the same pattern as
 * usePathHighlighting.ts.
 */
export function usePreviewHighlighting(wrapperRef: RefObject<HTMLDivElement | null>): void {
  const isOpen = usePreviewStore((s) => s.isOpen);
  const previewState = usePreviewStore((s) => s.previewState);
  const coverageData = usePreviewStore((s) => s.coverageData);
  const focusNodeId = usePreviewStore((s) => s.focusNodeId);
  const { setCenter, getNodes } = useReactFlow();

  // Apply preview DOM classes
  useEffect(() => {
    const rfEl = wrapperRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!rfEl) return;

    if (isOpen) {
      rfEl.setAttribute("data-previewing", "");
    } else {
      rfEl.removeAttribute("data-previewing");
      // Clean up all preview classes
      rfEl.querySelectorAll(".preview-current, .preview-visited").forEach((el) => {
        el.classList.remove("preview-current", "preview-visited");
      });
      return;
    }

    const currentId = previewState?.currentNodeId;
    const visitedNodes = coverageData.visitedNodes;
    const visitedEdges = coverageData.visitedEdges;

    // Update node classes
    rfEl.querySelectorAll(".react-flow__node").forEach((el) => {
      const id = el.getAttribute("data-id");
      el.classList.remove("preview-current", "preview-visited");
      if (id === currentId) {
        el.classList.add("preview-current");
      } else if (id && visitedNodes.has(id)) {
        el.classList.add("preview-visited");
      }
    });

    // Update edge classes
    rfEl.querySelectorAll(".react-flow__edge").forEach((el) => {
      const id = el.getAttribute("data-id");
      el.classList.remove("preview-visited");
      if (id && visitedEdges.has(id)) {
        el.classList.add("preview-visited");
      }
    });

    return () => {
      rfEl.removeAttribute("data-previewing");
      rfEl
        .querySelectorAll(".preview-current, .preview-visited")
        .forEach((el) => el.classList.remove("preview-current", "preview-visited"));
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
    // Clear focusNodeId after handling
    usePreviewStore.getState().setFocusNodeId(null);
  }, [focusNodeId, setCenter, getNodes]);
}
