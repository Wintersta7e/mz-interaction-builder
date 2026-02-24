import { describe, it, expect } from "vitest";
import { PreviewEngine } from "../PreviewEngine";
import type {
  InteractionDocument,
  InteractionNode,
  InteractionEdge,
  InteractionNodeType,
} from "../../../types";

/** Helper to create a minimal InteractionDocument */
function makeDoc(
  nodes: InteractionNode[],
  edges: InteractionEdge[],
): InteractionDocument {
  return {
    version: "1.0.0",
    name: "Test",
    description: "",
    nodes,
    edges,
    variables: [],
    bookmarks: [],
  };
}

/** Helper to create a minimal InteractionNode */
function makeNode(
  id: string,
  type: InteractionNodeType,
  data?: Partial<InteractionNode["data"]>,
): InteractionNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, ...data } as InteractionNode["data"],
  };
}

/** Helper to create a minimal InteractionEdge */
function makeEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
): InteractionEdge {
  return {
    id,
    source,
    target,
    ...(sourceHandle ? { sourceHandle } : {}),
  };
}

describe("PreviewEngine", () => {
  describe("constructor", () => {
    it("initializes with start node as current and status running", () => {
      const doc = makeDoc(
        [makeNode("s1", "start"), makeNode("e1", "end")],
        [makeEdge("e-1", "s1", "e1")],
      );
      const engine = new PreviewEngine(doc);
      const state = engine.state;

      expect(state.currentNodeId).toBe("s1");
      expect(state.status).toBe("running");
      expect(state.stepCount).toBe(0);
      expect(state.transcript).toHaveLength(0);
      expect(state.variables.size).toBe(0);
      expect(state.switches.size).toBe(0);
      expect(state.visitedNodes.size).toBe(0);
      expect(state.visitedEdges.size).toBe(0);
      expect(state.choiceHistory).toHaveLength(0);
      expect(state.availableChoices).toHaveLength(0);
    });

    it("uses custom startNodeId when provided", () => {
      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          makeNode("a1", "action", { type: "action", actions: [] }),
          makeNode("e1", "end"),
        ],
        [makeEdge("e-1", "s1", "a1"), makeEdge("e-2", "a1", "e1")],
      );
      const engine = new PreviewEngine(doc, "a1");
      const state = engine.state;

      expect(state.currentNodeId).toBe("a1");
      expect(state.status).toBe("running");
    });

    it("sets status ended and currentNodeId null for empty document", () => {
      const doc = makeDoc([], []);
      const engine = new PreviewEngine(doc);
      const state = engine.state;

      expect(state.currentNodeId).toBeNull();
      expect(state.status).toBe("ended");
    });
  });

  describe("reset", () => {
    it("clears variables and restores start node", () => {
      const doc = makeDoc(
        [makeNode("s1", "start"), makeNode("e1", "end")],
        [makeEdge("e-1", "s1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      // Mutate state
      engine.setVariable(1, 42);
      engine.setSwitch(5, true);
      expect(engine.state.variables.get(1)).toBe(42);
      expect(engine.state.switches.get(5)).toBe(true);

      // Reset
      const newState = engine.reset();

      expect(newState.currentNodeId).toBe("s1");
      expect(newState.status).toBe("running");
      expect(newState.variables.size).toBe(0);
      expect(newState.switches.size).toBe(0);
      expect(newState.stepCount).toBe(0);
      expect(newState.transcript).toHaveLength(0);
      expect(newState.visitedNodes.size).toBe(0);
      expect(newState.visitedEdges.size).toBe(0);
      expect(newState.choiceHistory).toHaveLength(0);
      expect(newState.availableChoices).toHaveLength(0);
    });
  });

  describe("setVariable / setSwitch", () => {
    it("stores and retrieves variable and switch values", () => {
      const doc = makeDoc(
        [makeNode("s1", "start"), makeNode("e1", "end")],
        [makeEdge("e-1", "s1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      engine.setVariable(10, 100);
      engine.setVariable(20, -5);
      engine.setSwitch(1, true);
      engine.setSwitch(2, false);

      expect(engine.state.variables.get(10)).toBe(100);
      expect(engine.state.variables.get(20)).toBe(-5);
      expect(engine.state.switches.get(1)).toBe(true);
      expect(engine.state.switches.get(2)).toBe(false);

      // Overwrite
      engine.setVariable(10, 999);
      expect(engine.state.variables.get(10)).toBe(999);
    });
  });
});
