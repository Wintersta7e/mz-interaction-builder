import { describe, it, expect } from "vitest";
import {
  findUpstreamNodes,
  findDownstreamNodes,
  findShortestPath,
} from "../graphTraversal";
import type { InteractionEdge } from "../../types";

// Shared test graph:
//   start -> menu -> action -> end
//                 \-> condition -> end2
const edges: InteractionEdge[] = [
  { id: "e1", source: "start", target: "menu" },
  { id: "e2", source: "menu", target: "action" },
  { id: "e3", source: "menu", target: "condition" },
  { id: "e4", source: "action", target: "end" },
  { id: "e5", source: "condition", target: "end2" },
];

describe("findUpstreamNodes", () => {
  it("returns just the node for start node (no upstream edges)", () => {
    const result = findUpstreamNodes("start", edges);
    expect(result.nodeIds).toEqual(new Set(["start"]));
    expect(result.edgeIds).toEqual(new Set());
  });

  it("finds upstream path from end", () => {
    const result = findUpstreamNodes("end", edges);
    expect(result.nodeIds).toEqual(new Set(["start", "menu", "action", "end"]));
    expect(result.edgeIds).toEqual(new Set(["e1", "e2", "e4"]));
  });

  it("finds upstream path from condition", () => {
    const result = findUpstreamNodes("condition", edges);
    expect(result.nodeIds).toEqual(new Set(["start", "menu", "condition"]));
    expect(result.edgeIds).toEqual(new Set(["e1", "e3"]));
  });

  it("returns just the node for an unconnected node", () => {
    const result = findUpstreamNodes("solo", edges);
    expect(result.nodeIds).toEqual(new Set(["solo"]));
    expect(result.edgeIds).toEqual(new Set());
  });
});

describe("findDownstreamNodes", () => {
  it("returns just the node for end node (no downstream edges)", () => {
    const result = findDownstreamNodes("end", edges);
    expect(result.nodeIds).toEqual(new Set(["end"]));
    expect(result.edgeIds).toEqual(new Set());
  });

  it("finds all downstream from start", () => {
    const result = findDownstreamNodes("start", edges);
    expect(result.nodeIds).toEqual(
      new Set(["start", "menu", "action", "condition", "end", "end2"]),
    );
    expect(result.edgeIds).toEqual(new Set(["e1", "e2", "e3", "e4", "e5"]));
  });

  it("finds downstream from menu", () => {
    const result = findDownstreamNodes("menu", edges);
    expect(result.nodeIds).toEqual(
      new Set(["menu", "action", "condition", "end", "end2"]),
    );
    expect(result.edgeIds).toEqual(new Set(["e2", "e3", "e4", "e5"]));
  });
});

describe("findShortestPath", () => {
  it("returns null when no path exists", () => {
    const result = findShortestPath("end", "start", edges);
    expect(result).toBeNull();
  });

  it("returns single node when source equals target", () => {
    const result = findShortestPath("start", "start", edges);
    expect(result).toEqual(["start"]);
  });

  it("finds shortest path start -> end", () => {
    const result = findShortestPath("start", "end", edges);
    expect(result).toEqual(["start", "menu", "action", "end"]);
  });

  it("finds shortest path start -> end2", () => {
    const result = findShortestPath("start", "end2", edges);
    expect(result).toEqual(["start", "menu", "condition", "end2"]);
  });

  it("finds shortest path start -> menu", () => {
    const result = findShortestPath("start", "menu", edges);
    expect(result).toEqual(["start", "menu"]);
  });
});

describe("cycle handling", () => {
  // Graph with a loop: start -> a -> b -> a (cycle back)
  const cyclicEdges: InteractionEdge[] = [
    { id: "c1", source: "start", target: "a" },
    { id: "c2", source: "a", target: "b" },
    { id: "c3", source: "b", target: "a" }, // cycle!
  ];

  it("does not infinite loop on downstream traversal with cycle", () => {
    const result = findDownstreamNodes("start", cyclicEdges);
    expect(result.nodeIds).toEqual(new Set(["start", "a", "b"]));
    // Back-edge c3 (b→a) is not collected because 'a' was already visited
    expect(result.edgeIds).toEqual(new Set(["c1", "c2"]));
  });

  it("does not infinite loop on upstream traversal with cycle", () => {
    const result = findUpstreamNodes("b", cyclicEdges);
    expect(result.nodeIds).toEqual(new Set(["start", "a", "b"]));
    // Back-edge c3 (b→a) is not collected because 'b' was already visited
    expect(result.edgeIds).toEqual(new Set(["c1", "c2"]));
  });

  it("findShortestPath handles cycle without infinite loop", () => {
    const result = findShortestPath("start", "b", cyclicEdges);
    expect(result).toEqual(["start", "a", "b"]);
  });
});
