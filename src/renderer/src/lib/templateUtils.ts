import type { InteractionNode, InteractionEdge } from "../types";
import { generateId } from "../stores";

/**
 * Normalize node positions so the top-left node sits at (0, 0).
 * Returns a new array of nodes with adjusted positions.
 */
export function normalizePositions(
  nodes: InteractionNode[],
): InteractionNode[] {
  if (nodes.length === 0) return [];

  const minX = Math.min(...nodes.map((n) => n.position.x));
  const minY = Math.min(...nodes.map((n) => n.position.y));

  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - minX,
      y: node.position.y - minY,
    },
  }));
}

/**
 * Instantiate a template at a given drop position.
 * Generates fresh IDs for all nodes and edges, remaps edge source/target,
 * and offsets positions from the drop point.
 */
export function instantiateTemplate(
  templateNodes: InteractionNode[],
  templateEdges: InteractionEdge[],
  dropPosition: { x: number; y: number },
): { nodes: InteractionNode[]; edges: InteractionEdge[] } {
  const idMap = new Map<string, string>();

  const nodes = templateNodes.map((node) => {
    const newId = generateId(node.type || "node");
    idMap.set(node.id, newId);
    return {
      ...structuredClone(node),
      id: newId,
      position: {
        x: node.position.x + dropPosition.x,
        y: node.position.y + dropPosition.y,
      },
      selected: false,
    };
  });

  const edges = templateEdges
    .filter((edge) => idMap.has(edge.source) && idMap.has(edge.target))
    .map((edge) => ({
      ...structuredClone(edge),
      id: generateId("edge"),
      source: idMap.get(edge.source)!,
      target: idMap.get(edge.target)!,
    }));

  return { nodes, edges };
}
