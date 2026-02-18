import { AlertTriangle, CheckCircle, X, AlertCircle } from "lucide-react";
import { useDocumentStore, useUIStore } from "../stores";

interface ValidationPanelProps {
  onClose: () => void;
}

interface ValidationIssue {
  type: "error" | "warning";
  nodeId: string;
  nodeLabel: string;
  message: string;
}

export function ValidationPanel({ onClose }: ValidationPanelProps) {
  const { document } = useDocumentStore();
  const { setSelectedNodeId } = useUIStore();

  const issues: ValidationIssue[] = [];

  // Validate the document
  const nodes = document.nodes;
  const edges = document.edges;

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

  const errorCount = issues.filter((i) => i.type === "error").length;
  const warningCount = issues.filter((i) => i.type === "warning").length;

  const handleIssueClick = (nodeId: string) => {
    if (nodeId) {
      setSelectedNodeId(nodeId);
    }
  };

  return (
    <div className="fixed bottom-16 right-4 z-40 w-80 rounded-lg border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Validation
        </h3>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 border-b border-border px-3 py-2 text-sm">
        <span
          className={errorCount > 0 ? "text-red-500" : "text-muted-foreground"}
        >
          {errorCount} error{errorCount !== 1 ? "s" : ""}
        </span>
        <span
          className={
            warningCount > 0 ? "text-amber-500" : "text-muted-foreground"
          }
        >
          {warningCount} warning{warningCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Issues list */}
      <div className="max-h-64 overflow-y-auto">
        {issues.length === 0 ? (
          <div className="flex items-center gap-2 p-4 text-sm text-green-500">
            <CheckCircle className="h-4 w-4" />
            No issues found!
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {issues.map((issue, index) => (
              <li
                key={index}
                className="cursor-pointer px-3 py-2 hover:bg-muted"
                onClick={() => handleIssueClick(issue.nodeId)}
              >
                <div className="flex items-start gap-2">
                  {issue.type === "error" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{issue.nodeLabel}</div>
                    <div className="text-xs text-muted-foreground">
                      {issue.message}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
