import type { InteractionNode } from "../types";

export interface GuideLine {
  orientation: "horizontal" | "vertical";
  position: number; // px in flow coordinates
}

const SNAP_THRESHOLD = 5; // px
const DEFAULT_WIDTH = 180;
const DEFAULT_HEIGHT = 80;

/**
 * Given a dragging node and other nodes, returns guide lines
 * where the dragging node aligns with others.
 *
 * Checks 9 x-axis combinations (left/center/right vs left/center/right)
 * and 9 y-axis combinations (top/center/bottom vs top/center/bottom).
 */
export function computeGuideLines(
  draggingNode: InteractionNode,
  otherNodes: InteractionNode[],
): GuideLine[] {
  const guides: GuideLine[] = [];
  const seen = new Set<string>(); // deduplicate: "h:123" or "v:456"

  const dw = draggingNode.measured?.width ?? DEFAULT_WIDTH;
  const dh = draggingNode.measured?.height ?? DEFAULT_HEIGHT;
  const dLeft = draggingNode.position.x;
  const dCenterX = dLeft + dw / 2;
  const dRight = dLeft + dw;
  const dTop = draggingNode.position.y;
  const dCenterY = dTop + dh / 2;
  const dBottom = dTop + dh;

  for (const other of otherNodes) {
    if (other.id === draggingNode.id) continue;

    const ow = other.measured?.width ?? DEFAULT_WIDTH;
    const oh = other.measured?.height ?? DEFAULT_HEIGHT;
    const oLeft = other.position.x;
    const oCenterX = oLeft + ow / 2;
    const oRight = oLeft + ow;
    const oTop = other.position.y;
    const oCenterY = oTop + oh / 2;
    const oBottom = oTop + oh;

    // Vertical guides (x alignment)
    const xChecks = [
      { d: dLeft, o: oLeft },
      { d: dLeft, o: oCenterX },
      { d: dLeft, o: oRight },
      { d: dCenterX, o: oLeft },
      { d: dCenterX, o: oCenterX },
      { d: dCenterX, o: oRight },
      { d: dRight, o: oLeft },
      { d: dRight, o: oCenterX },
      { d: dRight, o: oRight },
    ];

    for (const { d, o } of xChecks) {
      if (Math.abs(d - o) <= SNAP_THRESHOLD) {
        const key = `v:${Math.round(o)}`;
        if (!seen.has(key)) {
          seen.add(key);
          guides.push({ orientation: "vertical", position: o });
        }
      }
    }

    // Horizontal guides (y alignment)
    const yChecks = [
      { d: dTop, o: oTop },
      { d: dTop, o: oCenterY },
      { d: dTop, o: oBottom },
      { d: dCenterY, o: oTop },
      { d: dCenterY, o: oCenterY },
      { d: dCenterY, o: oBottom },
      { d: dBottom, o: oTop },
      { d: dBottom, o: oCenterY },
      { d: dBottom, o: oBottom },
    ];

    for (const { d, o } of yChecks) {
      if (Math.abs(d - o) <= SNAP_THRESHOLD) {
        const key = `h:${Math.round(o)}`;
        if (!seen.has(key)) {
          seen.add(key);
          guides.push({ orientation: "horizontal", position: o });
        }
      }
    }
  }

  return guides;
}
