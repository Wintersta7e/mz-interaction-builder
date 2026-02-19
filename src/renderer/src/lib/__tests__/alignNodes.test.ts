import { describe, it, expect } from "vitest";
import { alignNodes, distributeNodes } from "../alignNodes";
import type { InteractionNode } from "../../types";

function makeNode(
  id: string,
  x: number,
  y: number,
  w = 180,
  h = 80,
): InteractionNode {
  return {
    id,
    type: "action",
    position: { x, y },
    data: { type: "action", label: id, actions: [] } as InteractionNode["data"],
    measured: { width: w, height: h },
  };
}

describe("alignNodes", () => {
  const nodes = [
    makeNode("a", 10, 20),
    makeNode("b", 100, 50),
    makeNode("c", 200, 80),
  ];

  it("aligns left — all x match leftmost", () => {
    const result = alignNodes(nodes, "left");
    expect(result.every((n) => n.position.x === 10)).toBe(true);
  });

  it("aligns right — all right edges match rightmost", () => {
    const result = alignNodes(nodes, "right");
    // rightmost right edge = 200 + 180 = 380
    expect(
      result.every((n) => n.position.x + (n.measured?.width ?? 180) === 380),
    ).toBe(true);
  });

  it("aligns center — all x centers match midpoint", () => {
    const result = alignNodes(nodes, "center");
    const midX = (10 + (200 + 180)) / 2; // 195
    result.forEach((n) => {
      const center = n.position.x + (n.measured?.width ?? 180) / 2;
      expect(center).toBeCloseTo(midX, 0);
    });
  });

  it("aligns top — all y match topmost", () => {
    const result = alignNodes(nodes, "top");
    expect(result.every((n) => n.position.y === 20)).toBe(true);
  });

  it("aligns bottom — all bottom edges match bottommost", () => {
    const result = alignNodes(nodes, "bottom");
    // bottommost bottom edge = 80 + 80 = 160
    expect(
      result.every((n) => n.position.y + (n.measured?.height ?? 80) === 160),
    ).toBe(true);
  });

  it("aligns middle — all y centers match midpoint", () => {
    const result = alignNodes(nodes, "middle");
    const midY = (20 + (80 + 80)) / 2; // 90
    result.forEach((n) => {
      const center = n.position.y + (n.measured?.height ?? 80) / 2;
      expect(center).toBeCloseTo(midY, 0);
    });
  });

  it("does not mutate input nodes", () => {
    const original = nodes.map((n) => ({ ...n, position: { ...n.position } }));
    alignNodes(nodes, "left");
    nodes.forEach((n, i) => {
      expect(n.position.x).toBe(original[i].position.x);
      expect(n.position.y).toBe(original[i].position.y);
    });
  });

  it("returns empty array for empty input", () => {
    expect(alignNodes([], "left")).toEqual([]);
  });

  it("handles single node — position unchanged", () => {
    const single = [makeNode("a", 42, 99)];
    const result = alignNodes(single, "left");
    expect(result[0].position.x).toBe(42);
    expect(result[0].position.y).toBe(99);
  });

  it("handles nodes with different measured sizes", () => {
    const mixed = [
      makeNode("a", 0, 0, 100, 50),
      makeNode("b", 200, 100, 300, 120),
    ];
    const result = alignNodes(mixed, "right");
    // rightmost right edge = 200 + 300 = 500
    expect(result[0].position.x + 100).toBe(500);
    expect(result[1].position.x + 300).toBe(500);
  });
});

describe("distributeNodes", () => {
  it("distributes horizontally — even spacing between extremes", () => {
    const nodes = [
      makeNode("a", 0, 0),
      makeNode("b", 50, 0),
      makeNode("c", 300, 0),
      makeNode("d", 150, 0),
    ];
    const result = distributeNodes(nodes, "horizontal");
    // Sorted by x: a(0), b(50), d(150), c(300)
    // a stays at 0, c stays at 300, b and d evenly spaced
    const xs = result
      .sort((a, b) => a.position.x - b.position.x)
      .map((n) => n.position.x);
    expect(xs[0]).toBe(0);
    expect(xs[3]).toBe(300);
    expect(xs[1]).toBe(100);
    expect(xs[2]).toBe(200);
  });

  it("distributes vertically — even spacing between extremes", () => {
    const nodes = [
      makeNode("a", 0, 0),
      makeNode("b", 0, 90),
      makeNode("c", 0, 300),
    ];
    const result = distributeNodes(nodes, "vertical");
    const ys = result
      .sort((a, b) => a.position.y - b.position.y)
      .map((n) => n.position.y);
    expect(ys[0]).toBe(0);
    expect(ys[2]).toBe(300);
    expect(ys[1]).toBe(150);
  });

  it("returns as-is for 2 or fewer nodes", () => {
    const nodes = [makeNode("a", 0, 0), makeNode("b", 100, 100)];
    const result = distributeNodes(nodes, "horizontal");
    expect(result[0].position.x).toBe(0);
    expect(result[1].position.x).toBe(100);
  });

  it("does not mutate input nodes", () => {
    const nodes = [
      makeNode("a", 0, 0),
      makeNode("b", 50, 0),
      makeNode("c", 300, 0),
    ];
    const original = nodes.map((n) => ({ ...n, position: { ...n.position } }));
    distributeNodes(nodes, "horizontal");
    nodes.forEach((n, i) => {
      expect(n.position.x).toBe(original[i].position.x);
    });
  });

  it("returns cloned nodes for single node", () => {
    const nodes = [makeNode("a", 50, 50)];
    const result = distributeNodes(nodes, "horizontal");
    expect(result.length).toBe(1);
    expect(result[0].position.x).toBe(50);
    expect(result[0]).not.toBe(nodes[0]);
  });

  it("distributes 5 nodes evenly", () => {
    const nodes = [
      makeNode("a", 0, 0),
      makeNode("b", 10, 0),
      makeNode("c", 20, 0),
      makeNode("d", 30, 0),
      makeNode("e", 400, 0),
    ];
    const result = distributeNodes(nodes, "horizontal");
    const xs = result
      .sort((a, b) => a.position.x - b.position.x)
      .map((n) => n.position.x);
    expect(xs[0]).toBe(0);
    expect(xs[4]).toBe(400);
    expect(xs[1]).toBe(100);
    expect(xs[2]).toBe(200);
    expect(xs[3]).toBe(300);
  });
});
