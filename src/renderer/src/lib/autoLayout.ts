import dagre from "dagre";
import type { InteractionNode, InteractionEdge } from "../types";

export interface AutoLayoutOptions {
  direction?: "LR" | "TB";
  nodeSpacing?: number;
  rankSpacing?: number;
}

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 80;

export function autoLayout(
  nodes: InteractionNode[],
  edges: InteractionEdge[],
  options: AutoLayoutOptions = {},
): Map<string, { x: number; y: number }> {
  if (nodes.length === 0) return new Map();

  const { direction = "LR", nodeSpacing = 80, rankSpacing = 200 } = options;

  // Filter out group nodes — they are visual containers and should not participate in layout
  const layoutNodes = nodes.filter((n) => n.type !== "group");

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
  });

  for (const node of layoutNodes) {
    const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    // Only add edge if both source and target are in the layout
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const node of layoutNodes) {
    const dagreNode = g.node(node.id);
    if (!dagreNode) continue;
    const width = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const height = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
    // dagre returns center coordinates; React Flow uses top-left
    positions.set(node.id, {
      x: dagreNode.x - width / 2,
      y: dagreNode.y - height / 2,
    });
  }

  return positions;
}
