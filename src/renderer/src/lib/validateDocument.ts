import type { InteractionNode, InteractionEdge } from "../types";

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
      message:
        "No Start node found. Every interaction needs exactly one Start node.",
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

  // Check each node for issues
  nodes.forEach((node) => {
    // Check for unconnected inputs (except start nodes)
    if (node.type !== "start") {
      const hasIncomingEdge = edges.some((e) => e.target === node.id);
      if (!hasIncomingEdge) {
        issues.push({
          type: "warning",
          nodeId: node.id,
          nodeLabel: node.data.label,
          message: "Node has no incoming connections (unreachable).",
        });
      }
    }

    // Check for unconnected outputs (except end nodes)
    if (node.type !== "end") {
      const hasOutgoingEdge = edges.some((e) => e.source === node.id);
      if (!hasOutgoingEdge) {
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
      const choices =
        (node.data as { choices?: { id: string }[] }).choices || [];
      choices.forEach((_choice, index) => {
        const hasConnection = edges.some(
          (e) => e.source === node.id && e.sourceHandle === `choice-${index}`,
        );
        if (!hasConnection) {
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
      const hasTrueConnection = edges.some(
        (e) => e.source === node.id && e.sourceHandle === "true",
      );
      const hasFalseConnection = edges.some(
        (e) => e.source === node.id && e.sourceHandle === "false",
      );
      if (!hasTrueConnection) {
        issues.push({
          type: "warning",
          nodeId: node.id,
          nodeLabel: node.data.label,
          message: "True branch has no connection.",
        });
      }
      if (!hasFalseConnection) {
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
      const actions = (node.data as { actions?: unknown[] }).actions || [];
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
