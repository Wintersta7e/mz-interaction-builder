import { useEffect, type RefObject } from "react";
import { useUIStore } from "../stores";

/**
 * Manages path highlighting DOM effects.
 * Applies CSS classes to React Flow nodes/edges for dimming/highlighting.
 * Extracted from Canvas.tsx for separation of concerns.
 *
 * NOTE: Uses direct DOM manipulation for performance — avoids re-rendering
 * all nodes just to toggle a CSS class. If React Flow changes its DOM
 * structure (data-id attributes), this may need updating.
 */
export function usePathHighlighting(
  wrapperRef: RefObject<HTMLDivElement | null>,
) {
  const highlightedNodeIds = useUIStore((s) => s.highlightedNodeIds);
  const highlightedEdgeIds = useUIStore((s) => s.highlightedEdgeIds);

  const isHighlighting =
    highlightedNodeIds.length > 0 || highlightedEdgeIds.length > 0;

  useEffect(() => {
    const rfEl = wrapperRef.current?.querySelector(
      ".react-flow",
    ) as HTMLElement | null;
    if (!rfEl) return;

    if (isHighlighting) {
      rfEl.setAttribute("data-highlighting", "");
    } else {
      rfEl.removeAttribute("data-highlighting");
    }

    const highlightedNodeSet = new Set(highlightedNodeIds);
    const highlightedEdgeSet = new Set(highlightedEdgeIds);

    rfEl.querySelectorAll(".react-flow__node").forEach((el) => {
      const id = el.getAttribute("data-id");
      if (id && highlightedNodeSet.has(id)) {
        el.classList.add("highlighted");
      } else {
        el.classList.remove("highlighted");
      }
    });

    // React Flow v12 uses data-id on edge wrapper elements.
    // If React Flow changes its DOM attribute naming, update this selector.
    rfEl.querySelectorAll(".react-flow__edge").forEach((el) => {
      const id = el.getAttribute("data-id");
      if (id && highlightedEdgeSet.has(id)) {
        el.classList.add("highlighted");
      } else {
        el.classList.remove("highlighted");
      }
    });

    return () => {
      rfEl.removeAttribute("data-highlighting");
      rfEl
        .querySelectorAll(".highlighted")
        .forEach((el) => el.classList.remove("highlighted"));
    };
  }, [isHighlighting, highlightedNodeIds, highlightedEdgeIds, wrapperRef]);

  return { isHighlighting };
}
