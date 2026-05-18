import type { InteractionNode, InteractionEdge, MenuNodeData, ActionNodeData } from "../types";

export interface ValidationIssue {
  type: "error" | "warning";
  nodeId: string;
  nodeLabel: string;
  message: string;
}

/**
 * Validates an interaction document's nodes and edges, returning all issues found.
 * Pure function — no React hooks or store access.
 */
export function validateDocument(
  nodes: InteractionNode[],
  edges: InteractionEdge[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for start node
  const startNodes = nodes.filter((n) => n.type === "start");
  if (startNodes.length === 0) {
    issues.push({
      type: "error",
      nodeId: "",
      nodeLabel: "Document",
      message: "No Start node found. Every interaction needs exactly one Start node.",
    });
  } else if (startNodes.length > 1) {
    startNodes.forEach((n) => {
      issues.push({
        type: "error",
        nodeId: n.id,
        nodeLabel: n.data.label,
        message: "Multiple Start nodes found. Only one Start node is allowed.",
      });
    });
  }

  // Pre-index edges by target, by source, and by source+handle to avoid
  // repeated linear scans inside the per-node loop (O(n×e) → O(n+e)).
  const targetSet = new Set<string>();
  const sourceSet = new Set<string>();
  const sourceHandleSet = new Set<string>();
  for (const e of edges) {
    targetSet.add(e.target);
    sourceSet.add(e.source);
    if (e.sourceHandle != null) sourceHandleSet.add(`${e.source}|${e.sourceHandle}`);
  }

  // Check each node for issues
  nodes.forEach((node) => {
    // Check for unconnected inputs (except start nodes)
    if (node.type !== "start" && node.type !== "group" && node.type !== "comment") {
      if (!targetSet.has(node.id)) {
        issues.push({
          type: "warning",
          nodeId: node.id,
          nodeLabel: node.data.label,
          message: "Node has no incoming connections (unreachable).",
        });
      }
    }

    // Check for unconnected outputs (except end nodes)
    if (node.type !== "end" && node.type !== "group" && node.type !== "comment") {
      if (!sourceSet.has(node.id)) {
        issues.push({
          type: "warning",
          nodeId: node.id,
          nodeLabel: node.data.label,
          message: "Node has no outgoing connections (dead end).",
        });
      }
    }

    // Check menu nodes for missing choice connections
    if (node.type === "menu") {
      const choices = (node.data as MenuNodeData).choices || [];
      choices.forEach((_choice, index) => {
        if (!sourceHandleSet.has(`${node.id}|choice-${index}`)) {
          issues.push({
            type: "warning",
            nodeId: node.id,
            nodeLabel: node.data.label,
            message: `Choice ${index + 1} has no connection.`,
          });
        }
      });
    }

    // Check condition nodes for missing true/false branches
    if (node.type === "condition") {
      if (!sourceHandleSet.has(`${node.id}|true`)) {
        issues.push({
          type: "warning",
          nodeId: node.id,
          nodeLabel: node.data.label,
          message: "True branch has no connection.",
        });
      }
      if (!sourceHandleSet.has(`${node.id}|false`)) {
        issues.push({
          type: "warning",
          nodeId: node.id,
          nodeLabel: node.data.label,
          message: "False branch has no connection.",
        });
      }
    }

    // Check action nodes for empty actions
    if (node.type === "action") {
      const actions = (node.data as ActionNodeData).actions || [];
      if (actions.length === 0) {
        issues.push({
          type: "warning",
          nodeId: node.id,
          nodeLabel: node.data.label,
          message: "Action node has no actions defined.",
        });
      }
    }
  });

  return issues;
}
