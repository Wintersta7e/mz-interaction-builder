import { describe, it, expect } from "vitest";
import { normalizePositions, instantiateTemplate } from "../templateUtils";
import type { InteractionNode, InteractionEdge } from "../../types";

const makeNode = (
  id: string,
  x: number,
  y: number,
  type: string = "action",
): InteractionNode =>
  ({
    id,
    type,
    position: { x, y },
    data: { type, label: id },
  }) as InteractionNode;

describe("normalizePositions", () => {
  it("returns empty array for empty input", () => {
    expect(normalizePositions([])).toEqual([]);
  });

  it("normalizes single node to (0, 0)", () => {
    const nodes = [makeNode("a", 150, 200)];
    const result = normalizePositions(nodes);
    expect(result[0].position).toEqual({ x: 0, y: 0 });
  });

  it("normalizes multiple nodes relative to top-left", () => {
    const nodes = [
      makeNode("a", 100, 200),
      makeNode("b", 300, 100),
      makeNode("c", 200, 400),
    ];
    const result = normalizePositions(nodes);
    expect(result[0].position).toEqual({ x: 0, y: 100 });
    expect(result[1].position).toEqual({ x: 200, y: 0 });
    expect(result[2].position).toEqual({ x: 100, y: 300 });
  });

  it("does not mutate original nodes", () => {
    const nodes = [makeNode("a", 100, 200)];
    const original = { ...nodes[0].position };
    normalizePositions(nodes);
    expect(nodes[0].position).toEqual(original);
  });
});

describe("instantiateTemplate", () => {
  it("generates fresh IDs for nodes and edges", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 100, 0)];
    const edges: InteractionEdge[] = [{ id: "e1", source: "a", target: "b" }];
    const result = instantiateTemplate(nodes, edges, { x: 50, y: 50 });

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0].id).not.toBe("a");
    expect(result.nodes[1].id).not.toBe("b");
    expect(result.edges[0].id).not.toBe("e1");
  });

  it("remaps edge source/target to new node IDs", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 100, 0)];
    const edges: InteractionEdge[] = [{ id: "e1", source: "a", target: "b" }];
    const result = instantiateTemplate(nodes, edges, { x: 0, y: 0 });

    expect(result.edges[0].source).toBe(result.nodes[0].id);
    expect(result.edges[0].target).toBe(result.nodes[1].id);
  });

  it("offsets positions from drop point", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 100, 50)];
    const result = instantiateTemplate(nodes, [], { x: 200, y: 300 });

    expect(result.nodes[0].position).toEqual({ x: 200, y: 300 });
    expect(result.nodes[1].position).toEqual({ x: 300, y: 350 });
  });

  it("drops edges that reference missing nodes", () => {
    const nodes = [makeNode("a", 0, 0)];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "a", target: "missing" },
    ];
    const result = instantiateTemplate(nodes, edges, { x: 0, y: 0 });
    expect(result.edges).toHaveLength(0);
  });

  it("does not mutate original template data", () => {
    const nodes = [makeNode("a", 0, 0)];
    const edges: InteractionEdge[] = [];
    const originalId = nodes[0].id;
    instantiateTemplate(nodes, edges, { x: 100, y: 100 });
    expect(nodes[0].id).toBe(originalId);
    expect(nodes[0].position).toEqual({ x: 0, y: 0 });
  });
});
