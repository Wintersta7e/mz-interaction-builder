import { describe, it, expect } from "vitest";
import { PreviewEngine } from "../PreviewEngine";
import type {
  InteractionDocument,
  InteractionNode,
  InteractionEdge,
  InteractionNodeType,
  ActionNodeData,
  ConditionNodeData,
  MenuNodeData,
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

  describe("step — basic traversal", () => {
    it("start node advances to connected node and marks start as visited", () => {
      const doc = makeDoc(
        [makeNode("s1", "start"), makeNode("e1", "end")],
        [makeEdge("edge-1", "s1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      engine.step();

      expect(engine.state.currentNodeId).toBe("e1");
      expect(engine.state.visitedNodes.has("s1")).toBe(true);
      expect(engine.state.status).toBe("running");
      expect(engine.state.transcript.length).toBeGreaterThan(0);
      expect(engine.state.transcript[0].nodeType).toBe("start");
    });

    it("end node sets status to ended and adds transcript entry containing End", () => {
      const doc = makeDoc(
        [makeNode("s1", "start"), makeNode("e1", "end")],
        [makeEdge("edge-1", "s1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // process start → move to e1
      engine.step(); // process end

      expect(engine.state.status).toBe("ended");
      const endEntry = engine.state.transcript.find(
        (t) => t.nodeType === "end",
      );
      expect(endEntry).toBeDefined();
      expect(endEntry!.content).toContain("End");
    });

    it("action node with set_variable executes and auto-advances", () => {
      const actionNode = makeNode("a1", "action", {
        type: "action",
        actions: [
          {
            id: "act-1",
            type: "set_variable",
            variableId: 5,
            variableOperation: "set",
            variableValue: 42,
          },
        ],
      } as Partial<ActionNodeData>);

      const doc = makeDoc(
        [makeNode("s1", "start"), actionNode, makeNode("e1", "end")],
        [makeEdge("edge-1", "s1", "a1"), makeEdge("edge-2", "a1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // process start → move to a1
      engine.step(); // process action → move to e1

      expect(engine.state.variables.get(5)).toBe(42);
      expect(engine.state.currentNodeId).toBe("e1");
    });

    it("action node with set_switch executes correctly", () => {
      const actionNode = makeNode("a1", "action", {
        type: "action",
        actions: [
          {
            id: "act-1",
            type: "set_switch",
            switchId: 3,
            switchValue: "on",
          },
        ],
      } as Partial<ActionNodeData>);

      const doc = makeDoc(
        [makeNode("s1", "start"), actionNode, makeNode("e1", "end")],
        [makeEdge("edge-1", "s1", "a1"), makeEdge("edge-2", "a1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // start → a1
      engine.step(); // action → e1

      expect(engine.state.switches.get(3)).toBe(true);
      expect(engine.state.currentNodeId).toBe("e1");
    });

    it("action node with variable add operation accumulates correctly", () => {
      const actionNode = makeNode("a1", "action", {
        type: "action",
        actions: [
          {
            id: "act-1",
            type: "set_variable",
            variableId: 10,
            variableOperation: "add",
            variableValue: 5,
          },
        ],
      } as Partial<ActionNodeData>);

      const doc = makeDoc(
        [makeNode("s1", "start"), actionNode, makeNode("e1", "end")],
        [makeEdge("edge-1", "s1", "a1"), makeEdge("edge-2", "a1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      // Pre-set variable 10 to 100
      engine.setVariable(10, 100);

      engine.step(); // start → a1
      engine.step(); // action (add 5 to var 10) → e1

      expect(engine.state.variables.get(10)).toBe(105);
    });

    it("action node with show_text logs to transcript", () => {
      const actionNode = makeNode("a1", "action", {
        type: "action",
        actions: [
          {
            id: "act-1",
            type: "show_text",
            text: "Hello world!",
          },
        ],
      } as Partial<ActionNodeData>);

      const doc = makeDoc(
        [makeNode("s1", "start"), actionNode, makeNode("e1", "end")],
        [makeEdge("edge-1", "s1", "a1"), makeEdge("edge-2", "a1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // start → a1
      engine.step(); // action → e1

      const actionEntry = engine.state.transcript.find(
        (t) => t.nodeType === "action",
      );
      expect(actionEntry).toBeDefined();
      expect(actionEntry!.content).toContain("Hello world!");
    });

    it("visited nodes and edges tracked after traversal", () => {
      const doc = makeDoc(
        [makeNode("s1", "start"), makeNode("e1", "end")],
        [makeEdge("edge-1", "s1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // start → e1
      engine.step(); // end

      expect(engine.state.visitedNodes.has("s1")).toBe(true);
      expect(engine.state.visitedNodes.has("e1")).toBe(true);
      expect(engine.state.visitedEdges.has("edge-1")).toBe(true);
    });

    it("start with no outgoing edge sets status to ended", () => {
      const doc = makeDoc([makeNode("s1", "start")], []);
      const engine = new PreviewEngine(doc);

      engine.step(); // start with no edge

      expect(engine.state.status).toBe("ended");
    });
  });

  describe("step — condition nodes", () => {
    it("switch condition follows true branch when switch is on", () => {
      const condNode = makeNode("c1", "condition", {
        type: "condition",
        condition: {
          id: "cond-1",
          type: "switch",
          switchId: 5,
          switchValue: "on",
        },
      } as Partial<ConditionNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          condNode,
          makeNode("t1", "end"),
          makeNode("f1", "end"),
        ],
        [
          makeEdge("e-1", "s1", "c1"),
          makeEdge("e-true", "c1", "t1", "true"),
          makeEdge("e-false", "c1", "f1", "false"),
        ],
      );
      const engine = new PreviewEngine(doc);

      // Set switch 5 to ON
      engine.setSwitch(5, true);

      engine.step(); // start → c1
      engine.step(); // condition → should follow true branch

      expect(engine.state.currentNodeId).toBe("t1");
    });

    it("switch condition follows false branch when switch is off", () => {
      const condNode = makeNode("c1", "condition", {
        type: "condition",
        condition: {
          id: "cond-1",
          type: "switch",
          switchId: 5,
          switchValue: "on",
        },
      } as Partial<ConditionNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          condNode,
          makeNode("t1", "end"),
          makeNode("f1", "end"),
        ],
        [
          makeEdge("e-1", "s1", "c1"),
          makeEdge("e-true", "c1", "t1", "true"),
          makeEdge("e-false", "c1", "f1", "false"),
        ],
      );
      const engine = new PreviewEngine(doc);

      // Switch 5 defaults to false (not set)

      engine.step(); // start → c1
      engine.step(); // condition → should follow false branch

      expect(engine.state.currentNodeId).toBe("f1");
    });

    it("variable condition with >= operator evaluates correctly", () => {
      const condNode = makeNode("c1", "condition", {
        type: "condition",
        condition: {
          id: "cond-1",
          type: "variable",
          variableId: 10,
          variableOperator: ">=",
          variableCompareValue: 50,
        },
      } as Partial<ConditionNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          condNode,
          makeNode("t1", "end"),
          makeNode("f1", "end"),
        ],
        [
          makeEdge("e-1", "s1", "c1"),
          makeEdge("e-true", "c1", "t1", "true"),
          makeEdge("e-false", "c1", "f1", "false"),
        ],
      );
      const engine = new PreviewEngine(doc);

      // Set variable 10 to 75 (>= 50 → true)
      engine.setVariable(10, 75);

      engine.step(); // start → c1
      engine.step(); // condition → true branch

      expect(engine.state.currentNodeId).toBe("t1");
    });

    it("script condition evaluates via sandbox", () => {
      const condNode = makeNode("c1", "condition", {
        type: "condition",
        condition: {
          id: "cond-1",
          type: "script",
          script: "$gameVariables.value(1) > 10",
        },
      } as Partial<ConditionNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          condNode,
          makeNode("t1", "end"),
          makeNode("f1", "end"),
        ],
        [
          makeEdge("e-1", "s1", "c1"),
          makeEdge("e-true", "c1", "t1", "true"),
          makeEdge("e-false", "c1", "f1", "false"),
        ],
      );
      const engine = new PreviewEngine(doc);

      // Set variable 1 to 20 (> 10 → true)
      engine.setVariable(1, 20);

      engine.step(); // start → c1
      engine.step(); // condition → true branch

      expect(engine.state.currentNodeId).toBe("t1");
    });

    it("script error defaults to false branch and logs error in transcript", () => {
      const condNode = makeNode("c1", "condition", {
        type: "condition",
        condition: {
          id: "cond-1",
          type: "script",
          script: "undefinedThing.foo.bar",
        },
      } as Partial<ConditionNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          condNode,
          makeNode("t1", "end"),
          makeNode("f1", "end"),
        ],
        [
          makeEdge("e-1", "s1", "c1"),
          makeEdge("e-true", "c1", "t1", "true"),
          makeEdge("e-false", "c1", "f1", "false"),
        ],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // start → c1
      engine.step(); // condition → false branch (error)

      expect(engine.state.currentNodeId).toBe("f1");

      // Verify transcript has error result
      const condEntry = engine.state.transcript.find(
        (t) => t.nodeType === "condition",
      );
      expect(condEntry).toBeDefined();
      expect(condEntry!.result).toBe("error");
    });
  });

  describe("step — menu nodes", () => {
    it("presents choices and waits", () => {
      const menuNode = makeNode("m1", "menu", {
        type: "menu",
        choices: [
          { id: "ch-0", text: "Option A" },
          { id: "ch-1", text: "Option B" },
        ],
        cancelType: "disallow",
        windowBackground: 0,
        windowPosition: 1,
      } as Partial<MenuNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          menuNode,
          makeNode("ea", "end"),
          makeNode("eb", "end"),
        ],
        [
          makeEdge("e-1", "s1", "m1"),
          makeEdge("e-c0", "m1", "ea", "choice-0"),
          makeEdge("e-c1", "m1", "eb", "choice-1"),
        ],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // start → m1
      engine.step(); // process menu → waiting_choice

      expect(engine.state.status).toBe("waiting_choice");
      expect(engine.state.availableChoices).toHaveLength(2);
      expect(engine.state.availableChoices[0].text).toBe("Option A");
    });

    it("advances on choice selection", () => {
      const menuNode = makeNode("m1", "menu", {
        type: "menu",
        choices: [
          { id: "ch-0", text: "Option A" },
          { id: "ch-1", text: "Option B" },
        ],
        cancelType: "disallow",
        windowBackground: 0,
        windowPosition: 1,
      } as Partial<MenuNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          menuNode,
          makeNode("ea", "end"),
          makeNode("eb", "end"),
        ],
        [
          makeEdge("e-1", "s1", "m1"),
          makeEdge("e-c0", "m1", "ea", "choice-0"),
          makeEdge("e-c1", "m1", "eb", "choice-1"),
        ],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // start → m1
      engine.step(); // process menu → waiting_choice
      engine.step(1); // select choice 1 → eb

      expect(engine.state.currentNodeId).toBe("eb");
      expect(engine.state.choiceHistory).toEqual([1]);
    });

    it("hides choices with met hideCondition", () => {
      const menuNode = makeNode("m1", "menu", {
        type: "menu",
        choices: [
          { id: "ch-0", text: "Visible" },
          {
            id: "ch-1",
            text: "Hidden",
            hideCondition: {
              id: "hc-1",
              type: "switch",
              switchId: 1,
              switchValue: "on",
            },
          },
        ],
        cancelType: "disallow",
        windowBackground: 0,
        windowPosition: 1,
      } as Partial<MenuNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          menuNode,
          makeNode("ea", "end"),
          makeNode("eb", "end"),
        ],
        [
          makeEdge("e-1", "s1", "m1"),
          makeEdge("e-c0", "m1", "ea", "choice-0"),
          makeEdge("e-c1", "m1", "eb", "choice-1"),
        ],
      );
      const engine = new PreviewEngine(doc);

      // Set switch 1 ON to trigger hideCondition
      engine.setSwitch(1, true);

      engine.step(); // start → m1
      engine.step(); // process menu → waiting_choice

      const nonHidden = engine.state.availableChoices.filter((c) => !c.hidden);
      expect(nonHidden).toHaveLength(1);
      expect(nonHidden[0].text).toBe("Visible");
    });

    it("marks disabled choices", () => {
      const menuNode = makeNode("m1", "menu", {
        type: "menu",
        choices: [
          { id: "ch-0", text: "Normal" },
          {
            id: "ch-1",
            text: "Disabled",
            disableCondition: {
              id: "dc-1",
              type: "switch",
              switchId: 2,
              switchValue: "on",
            },
          },
        ],
        cancelType: "disallow",
        windowBackground: 0,
        windowPosition: 1,
      } as Partial<MenuNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          menuNode,
          makeNode("ea", "end"),
          makeNode("eb", "end"),
        ],
        [
          makeEdge("e-1", "s1", "m1"),
          makeEdge("e-c0", "m1", "ea", "choice-0"),
          makeEdge("e-c1", "m1", "eb", "choice-1"),
        ],
      );
      const engine = new PreviewEngine(doc);

      // Set switch 2 ON to trigger disableCondition
      engine.setSwitch(2, true);

      engine.step(); // start → m1
      engine.step(); // process menu → waiting_choice

      expect(engine.state.availableChoices[1].disabled).toBe(true);
    });
  });

  describe("step — muted nodes", () => {
    it("skips muted action", () => {
      const mutedAction = makeNode("a1", "action", {
        type: "action",
        muted: true,
        actions: [
          {
            id: "act-1",
            type: "set_variable",
            variableId: 1,
            variableOperation: "set",
            variableValue: 99,
          },
        ],
      } as Partial<ActionNodeData>);

      const doc = makeDoc(
        [makeNode("s1", "start"), mutedAction, makeNode("e1", "end")],
        [makeEdge("e-1", "s1", "a1"), makeEdge("e-2", "a1", "e1")],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // start → a1
      engine.step(); // muted action → skipped → e1

      expect(engine.state.variables.get(1)).toBeUndefined();
      expect(engine.state.currentNodeId).toBe("e1");
    });

    it("skips muted condition (follows true)", () => {
      const mutedCond = makeNode("c1", "condition", {
        type: "condition",
        muted: true,
        condition: {
          id: "cond-1",
          type: "switch",
          switchId: 5,
          switchValue: "on",
        },
      } as Partial<ConditionNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          mutedCond,
          makeNode("t1", "end"),
          makeNode("f1", "end"),
        ],
        [
          makeEdge("e-1", "s1", "c1"),
          makeEdge("e-true", "c1", "t1", "true"),
          makeEdge("e-false", "c1", "f1", "false"),
        ],
      );
      const engine = new PreviewEngine(doc);

      // Switch 5 is OFF — normally would go to false branch
      // But muted condition should always follow true

      engine.step(); // start → c1
      engine.step(); // muted condition → true branch → t1

      expect(engine.state.currentNodeId).toBe("t1");
    });

    it("skips muted menu (follows choice-0)", () => {
      const mutedMenu = makeNode("m1", "menu", {
        type: "menu",
        muted: true,
        choices: [
          { id: "ch-0", text: "Option A" },
          { id: "ch-1", text: "Option B" },
        ],
        cancelType: "disallow",
        windowBackground: 0,
        windowPosition: 1,
      } as Partial<MenuNodeData>);

      const doc = makeDoc(
        [
          makeNode("s1", "start"),
          mutedMenu,
          makeNode("ea", "end"),
          makeNode("eb", "end"),
        ],
        [
          makeEdge("e-1", "s1", "m1"),
          makeEdge("e-c0", "m1", "ea", "choice-0"),
          makeEdge("e-c1", "m1", "eb", "choice-1"),
        ],
      );
      const engine = new PreviewEngine(doc);

      engine.step(); // start → m1
      engine.step(); // muted menu → choice-0 → ea

      expect(engine.state.currentNodeId).toBe("ea");
      expect(engine.state.status).not.toBe("waiting_choice");
    });
  });
});
