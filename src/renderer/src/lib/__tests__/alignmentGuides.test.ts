import { describe, it, expect } from "vitest";
import { computeGuideLines } from "../alignmentGuides";
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

describe("computeGuideLines", () => {
  it("returns vertical guide when left edges align", () => {
    const dragging = makeNode("a", 100, 0);
    const others = [makeNode("b", 100, 200)];
    const guides = computeGuideLines(dragging, others);
    expect(
      guides.some((g) => g.orientation === "vertical" && g.position === 100),
    ).toBe(true);
  });

  it("returns horizontal guide when top edges align", () => {
    const dragging = makeNode("a", 0, 50);
    const others = [makeNode("b", 200, 50)];
    const guides = computeGuideLines(dragging, others);
    expect(
      guides.some((g) => g.orientation === "horizontal" && g.position === 50),
    ).toBe(true);
  });

  it("returns guide within snap threshold", () => {
    const dragging = makeNode("a", 103, 0); // within 5px of 100
    const others = [makeNode("b", 100, 200)];
    const guides = computeGuideLines(dragging, others);
    expect(guides.some((g) => g.orientation === "vertical")).toBe(true);
  });

  it("returns no guide outside snap threshold", () => {
    const dragging = makeNode("a", 110, 0); // 10px away
    const others = [makeNode("b", 100, 200)];
    const guides = computeGuideLines(dragging, others);
    const verticals = guides.filter((g) => g.orientation === "vertical");
    // Check that there's no guide at position 100 (left edge alignment)
    expect(verticals.some((g) => g.position === 100)).toBe(false);
  });

  it("returns no guides for empty others", () => {
    const dragging = makeNode("a", 100, 100);
    expect(computeGuideLines(dragging, [])).toEqual([]);
  });

  it("deduplicates guides at the same position", () => {
    const dragging = makeNode("a", 100, 0);
    const others = [makeNode("b", 100, 100), makeNode("c", 100, 200)];
    const guides = computeGuideLines(dragging, others);
    const verticalAt100 = guides.filter(
      (g) => g.orientation === "vertical" && g.position === 100,
    );
    expect(verticalAt100.length).toBe(1);
  });

  it("detects center alignment", () => {
    // a: x=100, w=180, center=190. b: x=100, w=180, center=190
    const dragging = makeNode("a", 100, 0);
    const others = [makeNode("b", 100, 200)];
    const guides = computeGuideLines(dragging, others);
    // Should have a guide at center x = 190
    expect(
      guides.some((g) => g.orientation === "vertical" && g.position === 190),
    ).toBe(true);
  });

  it("detects right edge alignment", () => {
    // a: x=100, w=180, right=280. b: x=100, w=180, right=280
    const dragging = makeNode("a", 100, 0);
    const others = [makeNode("b", 100, 200)];
    const guides = computeGuideLines(dragging, others);
    expect(
      guides.some((g) => g.orientation === "vertical" && g.position === 280),
    ).toBe(true);
  });

  it("detects bottom edge alignment", () => {
    // a: y=50, h=80, bottom=130. b: y=50, h=80, bottom=130
    const dragging = makeNode("a", 0, 50);
    const others = [makeNode("b", 200, 50)];
    const guides = computeGuideLines(dragging, others);
    expect(
      guides.some((g) => g.orientation === "horizontal" && g.position === 130),
    ).toBe(true);
  });

  it("detects cross-edge alignment (left of dragging with right of other)", () => {
    // dragging left = 280, other right = 100 + 180 = 280 — match!
    const dragging = makeNode("a", 280, 0);
    const others = [makeNode("b", 100, 200)];
    const guides = computeGuideLines(dragging, others);
    expect(
      guides.some((g) => g.orientation === "vertical" && g.position === 280),
    ).toBe(true);
  });

  it("skips the dragging node if it appears in others list", () => {
    const dragging = makeNode("a", 100, 100);
    const others = [dragging, makeNode("b", 500, 500)];
    const guides = computeGuideLines(dragging, others);
    const selfGuides = guides.filter((g) => g.position === 100);
    expect(selfGuides.length).toBe(0);
  });

  it("uses default dimensions when measured is undefined", () => {
    const dragging: InteractionNode = {
      id: "a",
      type: "action",
      position: { x: 100, y: 0 },
      data: {
        type: "action",
        label: "a",
        actions: [],
      } as InteractionNode["data"],
    };
    const others: InteractionNode[] = [
      {
        id: "b",
        type: "action",
        position: { x: 100, y: 200 },
        data: {
          type: "action",
          label: "b",
          actions: [],
        } as InteractionNode["data"],
      },
    ];
    const guides = computeGuideLines(dragging, others);
    expect(
      guides.some((g) => g.orientation === "vertical" && g.position === 100),
    ).toBe(true);
  });

  it("returns guides from multiple other nodes", () => {
    const dragging = makeNode("a", 100, 50);
    const others = [makeNode("b", 100, 200), makeNode("c", 0, 50)];
    const guides = computeGuideLines(dragging, others);
    expect(
      guides.some((g) => g.orientation === "vertical" && g.position === 100),
    ).toBe(true);
    expect(
      guides.some((g) => g.orientation === "horizontal" && g.position === 50),
    ).toBe(true);
  });
});
