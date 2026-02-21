import { describe, it, expect } from "vitest";
import { validateDocument } from "../validateDocument";
import type { InteractionNode, InteractionEdge } from "../../types";

/** Helper to create a minimal node */
function node(
  id: string,
  type: InteractionNode["type"],
  data?: Partial<InteractionNode["data"]>,
): InteractionNode {
  return {
    id,
    type,
    position: { x: 0, y: 0 },
    data: { label: id, ...data } as InteractionNode["data"],
  };
}

describe("validateDocument", () => {
  describe("start node checks", () => {
    it("returns an error when no start node exists", () => {
      const nodes = [node("end-1", "end")];
      const edges: InteractionEdge[] = [];
      const issues = validateDocument(nodes, edges);
      const startErrors = issues.filter(
        (i) => i.type === "error" && i.message.includes("No Start node"),
      );
      expect(startErrors).toHaveLength(1);
    });

    it("returns errors when multiple start nodes exist", () => {
      const nodes = [node("s1", "start"), node("s2", "start")];
      const edges: InteractionEdge[] = [];
      const issues = validateDocument(nodes, edges);
      const startErrors = issues.filter(
        (i) => i.type === "error" && i.message.includes("Multiple Start"),
      );
      expect(startErrors).toHaveLength(2);
      expect(startErrors[0].nodeId).toBe("s1");
      expect(startErrors[1].nodeId).toBe("s2");
    });

    it("returns no start-related errors for exactly one start node", () => {
      const nodes = [node("s1", "start"), node("e1", "end")];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "e1" },
      ];
      const issues = validateDocument(nodes, edges);
      const startErrors = issues.filter(
        (i) =>
          i.type === "error" &&
          (i.message.includes("Start node") || i.message.includes("Multiple")),
      );
      expect(startErrors).toHaveLength(0);
    });
  });

  describe("disconnected node checks", () => {
    it("warns when a non-start node has no incoming edges", () => {
      const nodes = [node("s1", "start"), node("a1", "action")];
      const edges: InteractionEdge[] = [];
      const issues = validateDocument(nodes, edges);
      const unreachable = issues.filter((i) =>
        i.message.includes("unreachable"),
      );
      expect(unreachable).toHaveLength(1);
      expect(unreachable[0].nodeId).toBe("a1");
    });

    it("does not warn about start node having no incoming edges", () => {
      const nodes = [node("s1", "start"), node("e1", "end")];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "e1" },
      ];
      const issues = validateDocument(nodes, edges);
      const startUnreachable = issues.filter(
        (i) => i.nodeId === "s1" && i.message.includes("unreachable"),
      );
      expect(startUnreachable).toHaveLength(0);
    });

    it("warns when a non-end node has no outgoing edges", () => {
      const nodes = [node("s1", "start"), node("a1", "action")];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "a1" },
      ];
      const issues = validateDocument(nodes, edges);
      const deadEnd = issues.filter((i) => i.message.includes("dead end"));
      expect(deadEnd).toHaveLength(1);
      expect(deadEnd[0].nodeId).toBe("a1");
    });

    it("does not warn about end node having no outgoing edges", () => {
      const nodes = [node("s1", "start"), node("e1", "end")];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "e1" },
      ];
      const issues = validateDocument(nodes, edges);
      const endDeadEnd = issues.filter(
        (i) => i.nodeId === "e1" && i.message.includes("dead end"),
      );
      expect(endDeadEnd).toHaveLength(0);
    });
  });

  describe("menu node checks", () => {
    it("warns when a menu choice has no connection", () => {
      const nodes = [
        node("s1", "start"),
        node("m1", "menu", {
          type: "menu",
          choices: [
            { id: "c0", text: "Yes" },
            { id: "c1", text: "No" },
          ],
          cancelType: "disallow",
          windowBackground: 0,
          windowPosition: 1,
        }),
      ];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "m1" },
        {
          id: "e-2",
          source: "m1",
          target: "s1",
          sourceHandle: "choice-0",
        },
        // choice-1 has no connection
      ];
      const issues = validateDocument(nodes, edges);
      const choiceWarnings = issues.filter(
        (i) => i.nodeId === "m1" && i.message.includes("Choice 2"),
      );
      expect(choiceWarnings).toHaveLength(1);
    });

    it("does not warn when all menu choices are connected", () => {
      const nodes = [
        node("s1", "start"),
        node("m1", "menu", {
          type: "menu",
          choices: [{ id: "c0", text: "Yes" }],
          cancelType: "disallow",
          windowBackground: 0,
          windowPosition: 1,
        }),
        node("e1", "end"),
      ];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "m1" },
        {
          id: "e-2",
          source: "m1",
          target: "e1",
          sourceHandle: "choice-0",
        },
      ];
      const issues = validateDocument(nodes, edges);
      const choiceWarnings = issues.filter(
        (i) => i.nodeId === "m1" && i.message.includes("Choice"),
      );
      expect(choiceWarnings).toHaveLength(0);
    });
  });

  describe("condition node checks", () => {
    it("warns when true branch has no connection", () => {
      const nodes = [node("s1", "start"), node("c1", "condition")];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "c1" },
        {
          id: "e-2",
          source: "c1",
          target: "s1",
          sourceHandle: "false",
        },
      ];
      const issues = validateDocument(nodes, edges);
      const trueWarnings = issues.filter(
        (i) => i.nodeId === "c1" && i.message.includes("True branch"),
      );
      expect(trueWarnings).toHaveLength(1);
    });

    it("warns when false branch has no connection", () => {
      const nodes = [node("s1", "start"), node("c1", "condition")];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "c1" },
        {
          id: "e-2",
          source: "c1",
          target: "s1",
          sourceHandle: "true",
        },
      ];
      const issues = validateDocument(nodes, edges);
      const falseWarnings = issues.filter(
        (i) => i.nodeId === "c1" && i.message.includes("False branch"),
      );
      expect(falseWarnings).toHaveLength(1);
    });

    it("warns about both branches when neither is connected", () => {
      const nodes = [node("s1", "start"), node("c1", "condition")];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "c1" },
      ];
      const issues = validateDocument(nodes, edges);
      const branchWarnings = issues.filter(
        (i) => i.nodeId === "c1" && i.message.includes("branch"),
      );
      expect(branchWarnings).toHaveLength(2);
    });

    it("does not warn when both branches are connected", () => {
      const nodes = [
        node("s1", "start"),
        node("c1", "condition"),
        node("e1", "end"),
        node("e2", "end"),
      ];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "c1" },
        {
          id: "e-2",
          source: "c1",
          target: "e1",
          sourceHandle: "true",
        },
        {
          id: "e-3",
          source: "c1",
          target: "e2",
          sourceHandle: "false",
        },
      ];
      const issues = validateDocument(nodes, edges);
      const branchWarnings = issues.filter(
        (i) => i.nodeId === "c1" && i.message.includes("branch"),
      );
      expect(branchWarnings).toHaveLength(0);
    });
  });

  describe("action node checks", () => {
    it("warns when action node has no actions defined", () => {
      const nodes = [
        node("s1", "start"),
        node("a1", "action", {
          type: "action",
          actions: [],
        }),
      ];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "a1" },
      ];
      const issues = validateDocument(nodes, edges);
      const emptyActions = issues.filter(
        (i) => i.nodeId === "a1" && i.message.includes("no actions"),
      );
      expect(emptyActions).toHaveLength(1);
    });

    it("does not warn when action node has actions", () => {
      const nodes = [
        node("s1", "start"),
        node("a1", "action", {
          type: "action",
          actions: [{ id: "act-1", type: "script", script: "console.log(1)" }],
        }),
        node("e1", "end"),
      ];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "a1" },
        { id: "e-2", source: "a1", target: "e1" },
      ];
      const issues = validateDocument(nodes, edges);
      const emptyActions = issues.filter(
        (i) => i.nodeId === "a1" && i.message.includes("no actions"),
      );
      expect(emptyActions).toHaveLength(0);
    });
  });

  describe("valid document", () => {
    it("returns no issues for a well-formed document", () => {
      const nodes = [
        node("s1", "start"),
        node("m1", "menu", {
          type: "menu",
          choices: [{ id: "c0", text: "OK" }],
          cancelType: "disallow",
          windowBackground: 0,
          windowPosition: 1,
        }),
        node("a1", "action", {
          type: "action",
          actions: [{ id: "act-1", type: "script", script: "doStuff()" }],
        }),
        node("e1", "end"),
      ];
      const edges: InteractionEdge[] = [
        { id: "e-1", source: "s1", target: "m1" },
        {
          id: "e-2",
          source: "m1",
          target: "a1",
          sourceHandle: "choice-0",
        },
        { id: "e-3", source: "a1", target: "e1" },
      ];
      const issues = validateDocument(nodes, edges);
      expect(issues).toHaveLength(0);
    });
  });

  describe("empty document", () => {
    it("returns an error for empty nodes array", () => {
      const issues = validateDocument([], []);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("error");
      expect(issues[0].message).toContain("No Start node");
    });
  });
});
