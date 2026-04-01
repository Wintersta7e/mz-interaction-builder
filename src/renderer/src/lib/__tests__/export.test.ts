import { describe, it, expect } from "vitest";
import { exportToMZCommands } from "../export";
import type { InteractionDocument, InteractionNode, InteractionEdge } from "../../types";

const CODE = {
  END: 0,
  SHOW_TEXT: 101,
  TEXT_LINE: 401,
  SHOW_CHOICES: 102,
  CHOICE_BRANCH: 402,
  CHOICE_END: 404,
  CONDITIONAL_BRANCH: 111,
  CONDITIONAL_ELSE: 411,
  CONDITIONAL_END: 412,
  LABEL: 118,
  JUMP_TO_LABEL: 119,
  COMMON_EVENT: 117,
  CONTROL_SWITCHES: 121,
  CONTROL_VARIABLES: 122,
  SCRIPT: 355,
  SCRIPT_LINE: 655,
  PLUGIN_COMMAND: 357,
};

function makeDoc(nodes: InteractionNode[], edges: InteractionEdge[]): InteractionDocument {
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

// ── Helpers ──

function startNode(id = "start"): InteractionNode {
  return { id, type: "start", position: { x: 0, y: 0 }, data: { type: "start", label: "Start" } };
}

function endNode(id = "end"): InteractionNode {
  return { id, type: "end", position: { x: 0, y: 0 }, data: { type: "end", label: "End" } };
}

function actionNode(id: string, actions: InteractionNode["data"]["actions"] = []): InteractionNode {
  return {
    id,
    type: "action",
    position: { x: 0, y: 0 },
    data: { type: "action", label: id, actions } as InteractionNode["data"],
  };
}

function conditionNode(id: string, condition: Record<string, unknown>): InteractionNode {
  return {
    id,
    type: "condition",
    position: { x: 0, y: 0 },
    data: { type: "condition", label: id, condition } as unknown as InteractionNode["data"],
  };
}

function menuNode(
  id: string,
  choices: { id: string; text: string; hideCondition?: unknown; disableCondition?: unknown }[],
): InteractionNode {
  return {
    id,
    type: "menu",
    position: { x: 0, y: 0 },
    data: {
      type: "menu",
      label: id,
      choices,
      cancelType: "disallow",
      windowBackground: 0,
      windowPosition: 2,
    } as InteractionNode["data"],
  };
}

function edge(id: string, source: string, target: string, sourceHandle?: string): InteractionEdge {
  return { id, source, target, ...(sourceHandle ? { sourceHandle } : {}) };
}

// ── Tests ──

describe("export — empty / minimal graphs", () => {
  it("returns warning and terminator when no start node exists", () => {
    const { commands, warnings } = exportToMZCommands(makeDoc([], []));
    expect(warnings).toContain("No start node found — export will be empty");
    expect(commands).toHaveLength(0);
  });

  it("exports terminator only for a disconnected start node", () => {
    const { commands, warnings } = exportToMZCommands(makeDoc([startNode()], []));
    expect(warnings).toHaveLength(0);
    expect(commands).toEqual([{ code: CODE.END, indent: 0, parameters: [] }]);
  });

  it("exports start → end as terminator only (no extra commands)", () => {
    const { commands } = exportToMZCommands(
      makeDoc([startNode(), endNode()], [edge("e1", "start", "end")]),
    );
    expect(commands).toEqual([{ code: CODE.END, indent: 0, parameters: [] }]);
  });
});

describe("export — action node types", () => {
  it("exports script action with multiline script", () => {
    const act = actionNode("a1", [{ id: "x", type: "script", script: "line1\nline2\nline3" }]);
    const { commands } = exportToMZCommands(
      makeDoc([startNode(), act, endNode()], [edge("e1", "start", "a1"), edge("e2", "a1", "end")]),
    );

    const scriptCmds = commands.filter(
      (c) => c.code === CODE.SCRIPT || c.code === CODE.SCRIPT_LINE,
    );
    expect(scriptCmds).toHaveLength(3);
    expect(scriptCmds[0]).toMatchObject({ code: CODE.SCRIPT, parameters: ["line1"] });
    expect(scriptCmds[1]).toMatchObject({ code: CODE.SCRIPT_LINE, parameters: ["line2"] });
    expect(scriptCmds[2]).toMatchObject({ code: CODE.SCRIPT_LINE, parameters: ["line3"] });
  });

  it("exports set_switch action", () => {
    const act = actionNode("a1", [{ id: "x", type: "set_switch", switchId: 5, switchValue: "on" }]);
    const { commands } = exportToMZCommands(
      makeDoc([startNode(), act, endNode()], [edge("e1", "start", "a1"), edge("e2", "a1", "end")]),
    );

    const switchCmd = commands.find((c) => c.code === CODE.CONTROL_SWITCHES);
    expect(switchCmd).toBeDefined();
    expect(switchCmd!.parameters).toEqual([5, 5, 0]); // switchId, switchId, ON=0
  });

  it("exports set_switch toggle with warning", () => {
    const act = actionNode("a1", [
      { id: "x", type: "set_switch", switchId: 3, switchValue: "toggle" },
    ]);
    const { warnings } = exportToMZCommands(
      makeDoc([startNode(), act, endNode()], [edge("e1", "start", "a1"), edge("e2", "a1", "end")]),
    );
    expect(warnings.some((w) => w.includes("toggle"))).toBe(true);
  });

  it("exports set_variable action", () => {
    const act = actionNode("a1", [
      {
        id: "x",
        type: "set_variable",
        variableId: 10,
        variableValue: 42,
        variableOperation: "set",
      },
    ]);
    const { commands } = exportToMZCommands(
      makeDoc([startNode(), act, endNode()], [edge("e1", "start", "a1"), edge("e2", "a1", "end")]),
    );

    const varCmd = commands.find((c) => c.code === CODE.CONTROL_VARIABLES);
    expect(varCmd).toBeDefined();
    expect(varCmd!.parameters).toEqual([10, 10, 0, 0, 42]); // id, id, set=0, constant=0, value
  });

  it("exports common_event action", () => {
    const act = actionNode("a1", [{ id: "x", type: "common_event", commonEventId: 7 }]);
    const { commands } = exportToMZCommands(
      makeDoc([startNode(), act, endNode()], [edge("e1", "start", "a1"), edge("e2", "a1", "end")]),
    );

    const ceCmd = commands.find((c) => c.code === CODE.COMMON_EVENT);
    expect(ceCmd).toBeDefined();
    expect(ceCmd!.parameters).toEqual([7]);
  });

  it("exports show_text action", () => {
    const act = actionNode("a1", [
      { id: "x", type: "show_text", text: "Hello\nWorld", faceName: "Actor1", faceIndex: 2 },
    ]);
    const { commands } = exportToMZCommands(
      makeDoc([startNode(), act, endNode()], [edge("e1", "start", "a1"), edge("e2", "a1", "end")]),
    );

    const textCmd = commands.find((c) => c.code === CODE.SHOW_TEXT);
    expect(textCmd).toBeDefined();
    expect(textCmd!.parameters[0]).toBe("Actor1");
    expect(textCmd!.parameters[1]).toBe(2);

    const lines = commands.filter((c) => c.code === CODE.TEXT_LINE);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.parameters[0]).toBe("Hello");
    expect(lines[1]!.parameters[0]).toBe("World");
  });

  it("exports plugin_command action", () => {
    const act = actionNode("a1", [
      {
        id: "x",
        type: "plugin_command",
        pluginName: "MyPlugin",
        commandName: "doThing",
        commandArgs: { key: "val" },
      },
    ]);
    const { commands } = exportToMZCommands(
      makeDoc([startNode(), act, endNode()], [edge("e1", "start", "a1"), edge("e2", "a1", "end")]),
    );

    const pluginCmd = commands.find((c) => c.code === CODE.PLUGIN_COMMAND);
    expect(pluginCmd).toBeDefined();
    expect(pluginCmd!.parameters).toEqual(["MyPlugin", "doThing", { key: "val" }]);
  });

  it("exports multiple actions in sequence from one action node", () => {
    const act = actionNode("a1", [
      { id: "x1", type: "set_switch", switchId: 1, switchValue: "on" },
      {
        id: "x2",
        type: "set_variable",
        variableId: 5,
        variableValue: 10,
        variableOperation: "add",
      },
      { id: "x3", type: "script", script: "alert(1)" },
    ]);
    const { commands } = exportToMZCommands(
      makeDoc([startNode(), act, endNode()], [edge("e1", "start", "a1"), edge("e2", "a1", "end")]),
    );

    expect(commands.filter((c) => c.code === CODE.CONTROL_SWITCHES)).toHaveLength(1);
    expect(commands.filter((c) => c.code === CODE.CONTROL_VARIABLES)).toHaveLength(1);
    expect(commands.filter((c) => c.code === CODE.SCRIPT)).toHaveLength(1);
  });
});

describe("export — condition node", () => {
  it("exports switch condition", () => {
    const cond = conditionNode("c1", { id: "x", type: "switch", switchId: 3, switchValue: "on" });
    const { commands } = exportToMZCommands(
      makeDoc(
        [startNode(), cond, endNode()],
        [edge("e1", "start", "c1"), edge("e2", "c1", "end", "true")],
      ),
    );

    const condCmd = commands.find((c) => c.code === CODE.CONDITIONAL_BRANCH);
    expect(condCmd).toBeDefined();
    expect(condCmd!.parameters).toEqual([0, 3, 0]); // type=switch, switchId, ON=0
  });

  it("exports variable condition", () => {
    const cond = conditionNode("c1", {
      id: "x",
      type: "variable",
      variableId: 5,
      variableOperator: ">=",
      variableCompareValue: 10,
    });
    const { commands } = exportToMZCommands(
      makeDoc(
        [startNode(), cond, endNode()],
        [edge("e1", "start", "c1"), edge("e2", "c1", "end", "true")],
      ),
    );

    const condCmd = commands.find((c) => c.code === CODE.CONDITIONAL_BRANCH);
    expect(condCmd).toBeDefined();
    expect(condCmd!.parameters).toEqual([1, 5, 0, 10, 1]); // type=var, id, constant, val, op>=1
  });

  it("exports script condition", () => {
    const cond = conditionNode("c1", {
      id: "x",
      type: "script",
      script: "$gameParty.gold() > 100",
    });
    const { commands } = exportToMZCommands(
      makeDoc(
        [startNode(), cond, endNode()],
        [edge("e1", "start", "c1"), edge("e2", "c1", "end", "true")],
      ),
    );

    const condCmd = commands.find((c) => c.code === CODE.CONDITIONAL_BRANCH);
    expect(condCmd).toBeDefined();
    expect(condCmd!.parameters).toEqual([12, "$gameParty.gold() > 100"]);
  });

  it("generates true/false branch structure with else", () => {
    const cond = conditionNode("c1", { id: "x", type: "script", script: "true" });
    const trueAct = actionNode("ta", [{ id: "x", type: "script", script: "trueScript" }]);
    const falseAct = actionNode("fa", [{ id: "x", type: "script", script: "falseScript" }]);

    const { commands } = exportToMZCommands(
      makeDoc(
        [startNode(), cond, trueAct, falseAct, endNode()],
        [
          edge("e1", "start", "c1"),
          edge("e2", "c1", "ta", "true"),
          edge("e3", "c1", "fa", "false"),
          edge("e4", "ta", "end"),
          edge("e5", "fa", "end"),
        ],
      ),
    );

    const codes = commands.map((c) => c.code);
    expect(codes).toContain(CODE.CONDITIONAL_BRANCH);
    expect(codes).toContain(CODE.CONDITIONAL_ELSE);
    expect(codes).toContain(CODE.CONDITIONAL_END);
  });

  it("warns when condition is undefined", () => {
    const cond: InteractionNode = {
      id: "c1",
      type: "condition",
      position: { x: 0, y: 0 },
      data: { type: "condition", label: "NoCond" } as InteractionNode["data"],
    };
    const { warnings } = exportToMZCommands(
      makeDoc([startNode(), cond], [edge("e1", "start", "c1")]),
    );
    expect(warnings.some((w) => w.includes("no condition defined"))).toBe(true);
  });
});

describe("export — static menu", () => {
  it("exports Show Choices with choice branches", () => {
    const menu = menuNode("m1", [
      { id: "c1", text: "Option A" },
      { id: "c2", text: "Option B" },
    ]);
    const actA = actionNode("aa", [{ id: "x", type: "script", script: "pickA" }]);
    const actB = actionNode("ab", [{ id: "x", type: "script", script: "pickB" }]);

    const { commands } = exportToMZCommands(
      makeDoc(
        [startNode(), menu, actA, actB, endNode()],
        [
          edge("e1", "start", "m1"),
          edge("e2", "m1", "aa", "choice-0"),
          edge("e3", "m1", "ab", "choice-1"),
          edge("e4", "aa", "end"),
          edge("e5", "ab", "end"),
        ],
      ),
    );

    const choicesCmd = commands.find((c) => c.code === CODE.SHOW_CHOICES);
    expect(choicesCmd).toBeDefined();
    expect(choicesCmd!.parameters[0]).toEqual(["Option A", "Option B"]);
    expect(choicesCmd!.parameters[1]).toBe(-1); // disallow cancel

    const branches = commands.filter((c) => c.code === CODE.CHOICE_BRANCH);
    expect(branches).toHaveLength(2);
    expect(branches[0]!.parameters).toEqual([0, "Option A"]);
    expect(branches[1]!.parameters).toEqual([1, "Option B"]);

    expect(commands.filter((c) => c.code === CODE.CHOICE_END)).toHaveLength(1);
  });

  it("handles branch cancel type", () => {
    const menu = menuNode("m1", [{ id: "c1", text: "Ok" }]);
    (menu.data as Record<string, unknown>)["cancelType"] = "branch";

    const { commands } = exportToMZCommands(
      makeDoc(
        [startNode(), menu, endNode()],
        [edge("e1", "start", "m1"), edge("e2", "m1", "end", "choice-0")],
      ),
    );

    const choicesCmd = commands.find((c) => c.code === CODE.SHOW_CHOICES);
    expect(choicesCmd!.parameters[1]).toBe(-2); // branch cancel
  });
});

describe("export — dynamic menu (with conditions)", () => {
  it("uses script-based choice setup when choices have hideCondition", () => {
    const menu = menuNode("m1", [
      {
        id: "c1",
        text: "Visible",
        hideCondition: { id: "hc", type: "switch", switchId: 1, switchValue: "on" },
      },
      { id: "c2", text: "Always" },
    ]);
    const { commands } = exportToMZCommands(
      makeDoc(
        [startNode(), menu, endNode()],
        [
          edge("e1", "start", "m1"),
          edge("e2", "m1", "end", "choice-0"),
          edge("e3", "m1", "end", "choice-1"),
        ],
      ),
    );

    // Dynamic menus use Script (355) to build choices
    const scriptCmds = commands.filter(
      (c) => c.code === CODE.SCRIPT || c.code === CODE.SCRIPT_LINE,
    );
    expect(scriptCmds.length).toBeGreaterThan(0);

    // Should still have Show Choices (to wait for input)
    expect(commands.filter((c) => c.code === CODE.SHOW_CHOICES)).toHaveLength(1);

    // Should use Conditional Branch for routing (not Choice Branch)
    expect(commands.filter((c) => c.code === CODE.CONDITIONAL_BRANCH)).toHaveLength(2);
    expect(commands.filter((c) => c.code === CODE.CHOICE_BRANCH)).toHaveLength(0);
  });
});

describe("export — convergence nodes (BUG-1 fix)", () => {
  it("emits convergence labels at indent 0, not inside branches", () => {
    // Condition → true: ActionA → Conv → End
    //           → false: ActionB → Conv (jump)
    const conv = actionNode("conv", [{ id: "x", type: "script", script: "shared" }]);
    const { commands } = exportToMZCommands(
      makeDoc(
        [
          startNode(),
          conditionNode("c1", { id: "x", type: "script", script: "true" }),
          actionNode("aa", [{ id: "x", type: "script", script: "pathA" }]),
          actionNode("ab", [{ id: "x", type: "script", script: "pathB" }]),
          conv,
          endNode(),
        ],
        [
          edge("e1", "start", "c1"),
          edge("e2", "c1", "aa", "true"),
          edge("e3", "c1", "ab", "false"),
          edge("e4", "aa", "conv"),
          edge("e5", "ab", "conv"),
          edge("e6", "conv", "end"),
        ],
      ),
    );

    // Convergence node label must be at indent 0
    const labels = commands.filter((c) => c.code === CODE.LABEL);
    expect(labels).toHaveLength(1);
    expect(labels[0]!.indent).toBe(0);
    expect(labels[0]!.parameters[0]).toBe("node_conv");

    // Both branches should have JUMP_TO_LABEL
    const jumps = commands.filter((c) => c.code === CODE.JUMP_TO_LABEL);
    expect(jumps.length).toBeGreaterThanOrEqual(2);
    expect(jumps.every((j) => j.parameters[0] === "node_conv")).toBe(true);

    // Convergence node's script should appear after the label at indent 0
    const labelIdx = commands.findIndex((c) => c.code === CODE.LABEL);
    const scriptAfterLabel = commands.slice(labelIdx + 1).find((c) => c.code === CODE.SCRIPT);
    expect(scriptAfterLabel).toBeDefined();
    expect(scriptAfterLabel!.parameters[0]).toBe("shared");
    expect(scriptAfterLabel!.indent).toBe(0);
  });

  it("handles convergence through menu choices", () => {
    // Menu with 2 choices both leading to same convergence node
    const conv = actionNode("conv", [{ id: "x", type: "script", script: "merged" }]);
    const { commands } = exportToMZCommands(
      makeDoc(
        [
          startNode(),
          menuNode("m1", [
            { id: "c1", text: "A" },
            { id: "c2", text: "B" },
          ]),
          conv,
          endNode(),
        ],
        [
          edge("e1", "start", "m1"),
          edge("e2", "m1", "conv", "choice-0"),
          edge("e3", "m1", "conv", "choice-1"),
          edge("e4", "conv", "end"),
        ],
      ),
    );

    // Convergence label at indent 0
    const labels = commands.filter((c) => c.code === CODE.LABEL);
    expect(labels).toHaveLength(1);
    expect(labels[0]!.indent).toBe(0);
  });

  it("handles multiple convergence nodes", () => {
    // Two separate convergence points
    const { commands } = exportToMZCommands(
      makeDoc(
        [
          startNode(),
          conditionNode("c1", { id: "x", type: "script", script: "true" }),
          actionNode("aa", [{ id: "x", type: "script", script: "a" }]),
          actionNode("ab", [{ id: "x", type: "script", script: "b" }]),
          actionNode("conv1", [{ id: "x", type: "script", script: "conv1" }]),
          conditionNode("c2", { id: "y", type: "script", script: "false" }),
          actionNode("ca", [{ id: "x", type: "script", script: "c" }]),
          actionNode("cb", [{ id: "x", type: "script", script: "d" }]),
          actionNode("conv2", [{ id: "x", type: "script", script: "conv2" }]),
          endNode(),
        ],
        [
          edge("e1", "start", "c1"),
          edge("e2", "c1", "aa", "true"),
          edge("e3", "c1", "ab", "false"),
          edge("e4", "aa", "conv1"),
          edge("e5", "ab", "conv1"),
          edge("e6", "conv1", "c2"),
          edge("e7", "c2", "ca", "true"),
          edge("e8", "c2", "cb", "false"),
          edge("e9", "ca", "conv2"),
          edge("e10", "cb", "conv2"),
          edge("e11", "conv2", "end"),
        ],
      ),
    );

    const labels = commands.filter((c) => c.code === CODE.LABEL);
    expect(labels).toHaveLength(2);
    // Both at indent 0
    expect(labels.every((l) => l.indent === 0)).toBe(true);
  });
});

describe("export — group/comment nodes are skipped", () => {
  it("ignores group and comment nodes in export", () => {
    const group: InteractionNode = {
      id: "g1",
      type: "group",
      position: { x: 0, y: 0 },
      data: { type: "group", label: "Group", color: "blue" } as InteractionNode["data"],
    };
    const comment: InteractionNode = {
      id: "cm1",
      type: "comment",
      position: { x: 0, y: 0 },
      data: { type: "comment", label: "Note", text: "Hello" } as InteractionNode["data"],
    };
    const act = actionNode("a1", [{ id: "x", type: "script", script: "run" }]);

    const { commands } = exportToMZCommands(
      makeDoc(
        [startNode(), group, comment, act, endNode()],
        [edge("e1", "start", "a1"), edge("e2", "a1", "end")],
      ),
    );

    // Script from action should be present; no commands from group/comment
    const scriptCmds = commands.filter((c) => c.code === CODE.SCRIPT);
    expect(scriptCmds).toHaveLength(1);
  });
});

describe("export — dynamic menu escaping (SEC-01)", () => {
  it("escapes backslashes, quotes, and newlines in dynamic choice text", () => {
    const m = menuNode("m1", [
      {
        id: "c1",
        text: "It's a \\test\nline",
        hideCondition: { id: "h1", type: "switch", switchId: 1, switchValue: "on" },
      },
    ]);

    const { commands } = exportToMZCommands(
      makeDoc([startNode(), m, endNode()], [edge("e1", "start", "m1"), edge("e2", "m1", "end", "choice-0")]),
    );

    // Find the script block
    const scriptLines = commands
      .filter((c) => c.code === CODE.SCRIPT || c.code === CODE.SCRIPT_LINE)
      .map((c) => c.parameters[0] as string);

    const joined = scriptLines.join("\n");
    // Backslash should be double-escaped, quote escaped, newline escaped
    expect(joined).toContain("It\\'s a \\\\test\\nline");
    // Must NOT contain a raw unescaped single-quote breaking out
    expect(joined).not.toContain("It's");
  });
});
