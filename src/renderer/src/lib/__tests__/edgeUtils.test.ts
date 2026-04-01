import { describe, it, expect } from "vitest";
import { getEdgeTypeAndData } from "../edgeUtils";
import type { InteractionNode } from "../../types";

const makeNode = (id: string, type: string): InteractionNode => ({
  id,
  type: type as InteractionNode["type"],
  position: { x: 0, y: 0 },
  data: { type, label: id } as InteractionNode["data"],
});

const nodes: InteractionNode[] = [
  makeNode("start", "start"),
  makeNode("menu", "menu"),
  makeNode("cond", "condition"),
  makeNode("act", "action"),
  makeNode("end", "end"),
];

describe("getEdgeTypeAndData", () => {
  it("returns condition-true edge for true handle", () => {
    const result = getEdgeTypeAndData(
      { source: "cond", target: "act", sourceHandle: "true", targetHandle: null },
      nodes,
    );
    expect(result.type).toBe("interaction");
    expect(result.data.edgeStyle).toBe("condition-true");
    expect(result.data.conditionBranch).toBe("true");
  });

  it("returns condition-false edge for false handle", () => {
    const result = getEdgeTypeAndData(
      { source: "cond", target: "end", sourceHandle: "false", targetHandle: null },
      nodes,
    );
    expect(result.data.edgeStyle).toBe("condition-false");
    expect(result.data.conditionBranch).toBe("false");
  });

  it("returns choice edge for menu choice handle", () => {
    const result = getEdgeTypeAndData(
      { source: "menu", target: "act", sourceHandle: "choice-2", targetHandle: null },
      nodes,
    );
    expect(result.data.edgeStyle).toBe("choice");
    expect(result.data.choiceIndex).toBe(2);
  });

  it("handles non-numeric choice handle gracefully", () => {
    const result = getEdgeTypeAndData(
      { source: "menu", target: "act", sourceHandle: "choice-abc", targetHandle: null },
      nodes,
    );
    expect(result.data.edgeStyle).toBe("choice");
    expect(result.data.choiceIndex).toBe(0);
  });

  it("returns default edge for standard connections", () => {
    const result = getEdgeTypeAndData(
      { source: "start", target: "act", sourceHandle: null, targetHandle: null },
      nodes,
    );
    expect(result.data.edgeStyle).toBe("default");
  });

  it("uses fallback colors for unknown node types", () => {
    const result = getEdgeTypeAndData(
      { source: "unknown", target: "act", sourceHandle: null, targetHandle: null },
      nodes,
    );
    expect(result.data.sourceColor).toBe("#9ca3af");
  });

  it("uses fallback colors when both nodes are missing", () => {
    const result = getEdgeTypeAndData(
      { source: "ghost1", target: "ghost2", sourceHandle: null, targetHandle: null },
      nodes,
    );
    expect(result.data.sourceColor).toBe("#9ca3af");
    expect(result.data.targetColor).toBe("#9ca3af");
    expect(result.data.edgeStyle).toBe("default");
  });

  it("returns choice-0 for choice-0 handle", () => {
    const result = getEdgeTypeAndData(
      { source: "menu", target: "act", sourceHandle: "choice-0", targetHandle: null },
      nodes,
    );
    expect(result.data.choiceIndex).toBe(0);
  });

  it("condition node with non-true/false handle returns default edge", () => {
    const result = getEdgeTypeAndData(
      { source: "cond", target: "act", sourceHandle: "output", targetHandle: null },
      nodes,
    );
    expect(result.data.edgeStyle).toBe("default");
  });
});
