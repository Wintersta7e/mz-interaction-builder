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
});
