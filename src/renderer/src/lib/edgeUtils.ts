import type { Connection } from "@xyflow/react";
import { NODE_ACCENT_COLORS } from "./nodeColors";
import type {
  InteractionNode,
  InteractionNodeType,
  InteractionEdgeData,
} from "../types";

/**
 * Determine the edge type and data (style, colors, branch info) for a new connection.
 * Pure function — no side effects.
 */
export function getEdgeTypeAndData(
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
        sourceColor: NODE_ACCENT_COLORS.start,
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
        sourceColor: NODE_ACCENT_COLORS.end,
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
        sourceColor: NODE_ACCENT_COLORS.menu,
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
