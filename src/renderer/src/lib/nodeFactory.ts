import { generateId } from "../stores";
import type {
  InteractionNodeType,
  InteractionNode,
  InteractionNodeData,
} from "../types";

/** Return default node data for a given node type. */
export function getDefaultNodeData(
  type: InteractionNodeType,
): InteractionNodeData {
  switch (type) {
    case "start":
      return { type: "start", label: "Start" };
    case "menu":
      return {
        type: "menu",
        label: "Choice Menu",
        choices: [],
        cancelType: "disallow",
        windowBackground: 0,
        windowPosition: 2,
      };
    case "action":
      return { type: "action", label: "Action", actions: [] };
    case "condition":
      return {
        type: "condition",
        label: "Condition",
        condition: { id: generateId("cond"), type: "switch" },
      };
    case "end":
      return { type: "end", label: "End" };
    case "group":
      return { type: "group", label: "Group", color: "blue", collapsed: false };
    case "comment":
      return { type: "comment", label: "Note", text: "" };
  }
}

/**
 * Create a fully-formed InteractionNode at the given position,
 * including the correct style overrides for group/comment nodes.
 */
export function createNode(
  type: InteractionNodeType,
  position: { x: number; y: number },
): InteractionNode {
  return {
    id: generateId(type),
    type,
    position,
    data: getDefaultNodeData(type),
    ...(type === "group"
      ? { style: { width: 400, height: 300 }, zIndex: -1 }
      : type === "comment"
        ? { style: { width: 200, height: 100 } }
        : {}),
  };
}
