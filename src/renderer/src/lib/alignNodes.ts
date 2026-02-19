import type { InteractionNode } from "../types";

export type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";
export type DistributeMode = "horizontal" | "vertical";

const DEFAULT_WIDTH = 180;
const DEFAULT_HEIGHT = 80;

function getWidth(node: InteractionNode): number {
  return node.measured?.width ?? DEFAULT_WIDTH;
}

function getHeight(node: InteractionNode): number {
  return node.measured?.height ?? DEFAULT_HEIGHT;
}

function cloneNodes(nodes: InteractionNode[]): InteractionNode[] {
  return nodes.map((n) => ({
    ...n,
    position: { ...n.position },
  }));
}

/**
 * Aligns an array of nodes along a specified axis/edge.
 * Returns a new array with updated positions (input is not mutated).
 */
export function alignNodes(
  nodes: InteractionNode[],
  mode: AlignMode,
): InteractionNode[] {
  if (nodes.length === 0) return [];

  const result = cloneNodes(nodes);

  switch (mode) {
    case "left": {
      const minX = Math.min(...nodes.map((n) => n.position.x));
      for (const n of result) {
        n.position.x = minX;
      }
      break;
    }
    case "right": {
      const maxRight = Math.max(
        ...nodes.map((n) => n.position.x + getWidth(n)),
      );
      for (const n of result) {
        n.position.x = maxRight - getWidth(n);
      }
      break;
    }
    case "center": {
      const minX = Math.min(...nodes.map((n) => n.position.x));
      const maxRight = Math.max(
        ...nodes.map((n) => n.position.x + getWidth(n)),
      );
      const midX = (minX + maxRight) / 2;
      for (const n of result) {
        n.position.x = midX - getWidth(n) / 2;
      }
      break;
    }
    case "top": {
      const minY = Math.min(...nodes.map((n) => n.position.y));
      for (const n of result) {
        n.position.y = minY;
      }
      break;
    }
    case "bottom": {
      const maxBottom = Math.max(
        ...nodes.map((n) => n.position.y + getHeight(n)),
      );
      for (const n of result) {
        n.position.y = maxBottom - getHeight(n);
      }
      break;
    }
    case "middle": {
      const minY = Math.min(...nodes.map((n) => n.position.y));
      const maxBottom = Math.max(
        ...nodes.map((n) => n.position.y + getHeight(n)),
      );
      const midY = (minY + maxBottom) / 2;
      for (const n of result) {
        n.position.y = midY - getHeight(n) / 2;
      }
      break;
    }
  }

  return result;
}

/**
 * Distributes nodes evenly between the first and last along the given axis.
 * Nodes are sorted by position; the first and last stay in place while
 * interior nodes are evenly spaced.
 * Returns a new array with updated positions (input is not mutated).
 */
export function distributeNodes(
  nodes: InteractionNode[],
  mode: DistributeMode,
): InteractionNode[] {
  if (nodes.length <= 2) return cloneNodes(nodes);

  const result = cloneNodes(nodes);

  if (mode === "horizontal") {
    // Sort cloned nodes by x position
    const sorted = [...result].sort((a, b) => a.position.x - b.position.x);
    const first = sorted[0].position.x;
    const last = sorted[sorted.length - 1].position.x;
    const step = (last - first) / (sorted.length - 1);

    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].position.x = first + step * i;
    }
  } else {
    // vertical
    const sorted = [...result].sort((a, b) => a.position.y - b.position.y);
    const first = sorted[0].position.y;
    const last = sorted[sorted.length - 1].position.y;
    const step = (last - first) / (sorted.length - 1);

    for (let i = 1; i < sorted.length - 1; i++) {
      sorted[i].position.y = first + step * i;
    }
  }

  return result;
}
