import { describe, it, expect } from "vitest";
import { autoLayout } from "../autoLayout";
import type { InteractionNode, InteractionEdge } from "../../types";

function makeNode(
  id: string,
  type: "start" | "menu" | "action" | "condition" | "end",
  x = 0,
  y = 0,
): InteractionNode {
  return {
    id,
    type,
    position: { x, y },
    data: { type, label: id } as InteractionNode["data"],
  };
}

describe("autoLayout", () => {
  it("returns positions for all nodes", () => {
    const nodes = [makeNode("a", "start"), makeNode("b", "end")];
    const edges: InteractionEdge[] = [{ id: "e1", source: "a", target: "b" }];

    const positions = autoLayout(nodes, edges);

    expect(positions.size).toBe(2);
    expect(positions.has("a")).toBe(true);
    expect(positions.has("b")).toBe(true);
  });

  it("places start node left of end node in LR direction", () => {
    const nodes = [makeNode("start", "start"), makeNode("end", "end")];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start", target: "end" },
    ];

    const positions = autoLayout(nodes, edges, { direction: "LR" });

    expect(positions.get("start")!.x).toBeLessThan(positions.get("end")!.x);
  });

  it("places start node above end node in TB direction", () => {
    const nodes = [makeNode("start", "start"), makeNode("end", "end")];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start", target: "end" },
    ];

    const positions = autoLayout(nodes, edges, { direction: "TB" });

    expect(positions.get("start")!.y).toBeLessThan(positions.get("end")!.y);
  });

  it("handles branching graph (menu with multiple choices)", () => {
    const nodes = [
      makeNode("start", "start"),
      makeNode("menu", "menu"),
      makeNode("a1", "action"),
      makeNode("a2", "action"),
      makeNode("end", "end"),
    ];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start", target: "menu" },
      { id: "e2", source: "menu", target: "a1" },
      { id: "e3", source: "menu", target: "a2" },
      { id: "e4", source: "a1", target: "end" },
      { id: "e5", source: "a2", target: "end" },
    ];

    const positions = autoLayout(nodes, edges);

    expect(positions.size).toBe(5);
    const startX = positions.get("start")!.x;
    for (const [id, pos] of positions) {
      if (id !== "start") {
        expect(pos.x).toBeGreaterThanOrEqual(startX);
      }
    }
  });

  it("handles single node with no edges", () => {
    const nodes = [makeNode("solo", "start")];
    const positions = autoLayout(nodes, []);

    expect(positions.size).toBe(1);
    expect(positions.has("solo")).toBe(true);
  });

  it("handles empty graph", () => {
    const positions = autoLayout([], []);
    expect(positions.size).toBe(0);
  });

  it("does not throw when edges reference missing nodes", () => {
    const nodes = [makeNode("a", "start"), makeNode("b", "end")];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "a", target: "ghost" },
    ];

    expect(() => autoLayout(nodes, edges)).not.toThrow();
    const positions = autoLayout(nodes, edges);
    expect(positions.has("a")).toBe(true);
    expect(positions.has("b")).toBe(true);
  });

  it("respects custom spacing options", () => {
    const nodes = [makeNode("a", "start"), makeNode("b", "end")];
    const edges: InteractionEdge[] = [{ id: "e1", source: "a", target: "b" }];

    const tight = autoLayout(nodes, edges, { rankSpacing: 50 });
    const wide = autoLayout(nodes, edges, { rankSpacing: 400 });

    const tightGap = tight.get("b")!.x - tight.get("a")!.x;
    const wideGap = wide.get("b")!.x - wide.get("a")!.x;

    expect(wideGap).toBeGreaterThan(tightGap);
  });

  it("excludes group nodes from layout", () => {
    const nodes: InteractionNode[] = [
      makeNode("a", "start"),
      makeNode("b", "end"),
      {
        id: "g1",
        type: "group",
        position: { x: 0, y: 0 },
        data: {
          type: "group",
          label: "Group",
          color: "blue",
        } as InteractionNode["data"],
      },
    ];
    const edges: InteractionEdge[] = [{ id: "e1", source: "a", target: "b" }];

    const positions = autoLayout(nodes, edges);

    expect(positions.size).toBe(2);
    expect(positions.has("g1")).toBe(false);
  });

  it("excludes comment nodes from layout", () => {
    const nodes: InteractionNode[] = [
      makeNode("a", "start"),
      makeNode("b", "end"),
      {
        id: "c1",
        type: "comment",
        position: { x: 0, y: 0 },
        data: {
          type: "comment",
          label: "Note",
          text: "test",
        } as InteractionNode["data"],
      },
    ];
    const edges: InteractionEdge[] = [{ id: "e1", source: "a", target: "b" }];

    const positions = autoLayout(nodes, edges);

    expect(positions.size).toBe(2);
    expect(positions.has("c1")).toBe(false);
  });

  it("uses measured dimensions when available", () => {
    const nodes: InteractionNode[] = [
      {
        ...makeNode("a", "start"),
        measured: { width: 300, height: 150 },
      },
      makeNode("b", "end"),
    ];
    const edges: InteractionEdge[] = [{ id: "e1", source: "a", target: "b" }];

    const positions = autoLayout(nodes, edges, { direction: "LR" });

    const defaultNodes = [makeNode("a", "start"), makeNode("b", "end")];
    const defaultPositions = autoLayout(defaultNodes, edges, {
      direction: "LR",
    });

    const measuredGap = positions.get("b")!.x - positions.get("a")!.x;
    const defaultGap =
      defaultPositions.get("b")!.x - defaultPositions.get("a")!.x;
    expect(measuredGap).toBeGreaterThan(defaultGap);
  });

  it("handles disconnected nodes (no edges between them)", () => {
    const nodes = [
      makeNode("a", "start", 0, 0),
      makeNode("b", "action", 500, 0),
      makeNode("c", "end", 1000, 0),
    ];

    const positions = autoLayout(nodes, []);

    expect(positions.size).toBe(3);
    for (const [, pos] of positions) {
      expect(typeof pos.x).toBe("number");
      expect(typeof pos.y).toBe("number");
    }
  });
});
