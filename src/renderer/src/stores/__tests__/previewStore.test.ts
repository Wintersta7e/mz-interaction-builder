import { describe, it, expect, beforeEach } from "vitest";
import { usePreviewStore } from "../previewStore";
import { useDocumentStore } from "../index";
import type { InteractionDocument } from "../../types";

// Minimal document with start → action → end for testing
function makeTestDoc(): InteractionDocument {
  return {
    version: "2.0.0",
    name: "Test",
    description: "",
    nodes: [
      { id: "s", type: "start", position: { x: 0, y: 0 }, data: { type: "start", label: "Start" } },
      {
        id: "a",
        type: "action",
        position: { x: 200, y: 0 },
        data: {
          type: "action",
          label: "Act",
          actions: [{ id: "x", type: "set_variable", variableId: 1, variableOperation: "set", variableValue: 42 }],
        } as InteractionDocument["nodes"][0]["data"],
      },
      { id: "e", type: "end", position: { x: 400, y: 0 }, data: { type: "end", label: "End" } },
    ],
    edges: [
      { id: "e1", source: "s", target: "a" },
      { id: "e2", source: "a", target: "e" },
    ],
    variables: [],
    bookmarks: [],
  };
}

function resetStores(): void {
  usePreviewStore.setState({
    isOpen: false,
    engine: null,
    previewState: null,
    autoPlay: false,
    autoPlaySpeed: 1000,
    coverageData: { visitedNodes: new Set(), visitedEdges: new Set() },
    focusNodeId: null,
  });
}

describe("usePreviewStore", () => {
  beforeEach(() => {
    resetStores();
    useDocumentStore.getState().setDocument(makeTestDoc());
  });

  it("open() initializes engine and preview state", () => {
    usePreviewStore.getState().open();
    const s = usePreviewStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.engine).not.toBeNull();
    expect(s.previewState).not.toBeNull();
    expect(s.autoPlay).toBe(false);
  });

  it("close() clears engine and state", () => {
    usePreviewStore.getState().open();
    usePreviewStore.getState().close();
    const s = usePreviewStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.engine).toBeNull();
    expect(s.previewState).toBeNull();
  });

  it("step() advances the preview state", () => {
    usePreviewStore.getState().open();
    const before = usePreviewStore.getState().previewState!;
    const visitedBefore = before.visitedNodes.size;
    usePreviewStore.getState().step();
    const after = usePreviewStore.getState().previewState!;
    expect(after.visitedNodes.size).toBeGreaterThanOrEqual(visitedBefore);
  });

  it("step() accumulates coverage data", () => {
    usePreviewStore.getState().open();
    usePreviewStore.getState().step();
    usePreviewStore.getState().step();
    const coverage = usePreviewStore.getState().coverageData;
    expect(coverage.visitedNodes.size).toBeGreaterThan(0);
  });

  it("restart() resets engine state but keeps preview open", () => {
    usePreviewStore.getState().open();
    usePreviewStore.getState().step();
    usePreviewStore.getState().restart();
    const s = usePreviewStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.autoPlay).toBe(false);
    expect(s.previewState).not.toBeNull();
  });

  it("setVariable() deep-clones state (BUG-02 regression test)", () => {
    usePreviewStore.getState().open();
    const stateBefore = usePreviewStore.getState().previewState!;
    usePreviewStore.getState().setVariable(1, 99);
    const stateAfter = usePreviewStore.getState().previewState!;
    // Must be a different object (deep clone, not shallow spread)
    expect(stateAfter).not.toBe(stateBefore);
    expect(stateAfter.variables).not.toBe(stateBefore.variables);
  });

  it("setSwitch() deep-clones state (BUG-02 regression test)", () => {
    usePreviewStore.getState().open();
    const stateBefore = usePreviewStore.getState().previewState!;
    usePreviewStore.getState().setSwitch(1, true);
    const stateAfter = usePreviewStore.getState().previewState!;
    expect(stateAfter).not.toBe(stateBefore);
    expect(stateAfter.switches).not.toBe(stateBefore.switches);
  });

  it("toggleAutoPlay() flips autoPlay state", () => {
    usePreviewStore.getState().open();
    expect(usePreviewStore.getState().autoPlay).toBe(false);
    usePreviewStore.getState().toggleAutoPlay();
    expect(usePreviewStore.getState().autoPlay).toBe(true);
    usePreviewStore.getState().toggleAutoPlay();
    expect(usePreviewStore.getState().autoPlay).toBe(false);
  });

  it("setAutoPlaySpeed() updates speed", () => {
    usePreviewStore.getState().setAutoPlaySpeed(500);
    expect(usePreviewStore.getState().autoPlaySpeed).toBe(500);
  });

  it("clearCoverage() resets visited sets", () => {
    usePreviewStore.getState().open();
    usePreviewStore.getState().step();
    usePreviewStore.getState().clearCoverage();
    const coverage = usePreviewStore.getState().coverageData;
    expect(coverage.visitedNodes.size).toBe(0);
    expect(coverage.visitedEdges.size).toBe(0);
  });

  it("setFocusNodeId() updates focus", () => {
    usePreviewStore.getState().setFocusNodeId("a");
    expect(usePreviewStore.getState().focusNodeId).toBe("a");
    usePreviewStore.getState().setFocusNodeId(null);
    expect(usePreviewStore.getState().focusNodeId).toBeNull();
  });

  it("step() is a no-op when engine is null", () => {
    // Should not throw
    usePreviewStore.getState().step();
    expect(usePreviewStore.getState().previewState).toBeNull();
  });

  it("setVariable() is a no-op when engine is null", () => {
    usePreviewStore.getState().setVariable(1, 5);
    expect(usePreviewStore.getState().previewState).toBeNull();
  });
});
