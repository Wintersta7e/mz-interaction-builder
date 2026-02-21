import { describe, it, expect } from "vitest";
import { exportToMZCommands } from "../export";
import type {
  InteractionDocument,
  InteractionNode,
  InteractionEdge,
} from "../../types";

// Event codes for assertions
const CODE = {
  END: 0,
  SHOW_CHOICES: 102,
  CHOICE_BRANCH: 402,
  CHOICE_END: 404,
  CONDITIONAL_BRANCH: 111,
  CONDITIONAL_ELSE: 411,
  CONDITIONAL_END: 412,
  LABEL: 118,
  JUMP_TO_LABEL: 119,
  CONTROL_SWITCHES: 121,
  SCRIPT: 355,
  SCRIPT_LINE: 655,
};

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

describe("exportMuted — muted node bypass", () => {
  it("muted action node is skipped, flow continues through", () => {
    const nodes: InteractionNode[] = [
      {
        id: "start-1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { type: "start", label: "Start" },
      },
      {
        id: "act-1",
        type: "action",
        position: { x: 200, y: 0 },
        data: {
          type: "action",
          label: "MutedAct",
          muted: true,
          actions: [
            { id: "a1", type: "script", script: "console.log('should skip')" },
          ],
        },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 400, y: 0 },
        data: { type: "end", label: "End" },
      },
    ];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start-1", target: "act-1" },
      { id: "e2", source: "act-1", target: "end-1" },
    ];

    const commands = exportToMZCommands(makeDoc(nodes, edges));

    // No script commands should appear
    const scriptCmds = commands.filter(
      (c) => c.code === CODE.SCRIPT || c.code === CODE.SCRIPT_LINE,
    );
    expect(scriptCmds).toHaveLength(0);

    // Should still have the terminating END command
    expect(commands[commands.length - 1]).toEqual({
      code: CODE.END,
      indent: 0,
      parameters: [],
    });
  });

  it("muted condition follows true branch", () => {
    const nodes: InteractionNode[] = [
      {
        id: "start-1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { type: "start", label: "Start" },
      },
      {
        id: "cond-1",
        type: "condition",
        position: { x: 200, y: 0 },
        data: {
          type: "condition",
          label: "MutedCond",
          muted: true,
          condition: { id: "c1", type: "script", script: "true" },
        },
      },
      {
        id: "act-a",
        type: "action",
        position: { x: 400, y: -50 },
        data: {
          type: "action",
          label: "ActionA",
          actions: [{ id: "a1", type: "script", script: "console.log('A')" }],
        },
      },
      {
        id: "act-b",
        type: "action",
        position: { x: 400, y: 50 },
        data: {
          type: "action",
          label: "ActionB",
          actions: [{ id: "a2", type: "script", script: "console.log('B')" }],
        },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 600, y: 0 },
        data: { type: "end", label: "End" },
      },
    ];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start-1", target: "cond-1" },
      { id: "e2", source: "cond-1", target: "act-a", sourceHandle: "true" },
      { id: "e3", source: "cond-1", target: "act-b", sourceHandle: "false" },
      { id: "e4", source: "act-a", target: "end-1" },
      { id: "e5", source: "act-b", target: "end-1" },
    ];

    const commands = exportToMZCommands(makeDoc(nodes, edges));

    // ActionA's script should appear
    const scriptCmds = commands.filter((c) => c.code === CODE.SCRIPT);
    expect(scriptCmds.length).toBeGreaterThanOrEqual(1);
    expect(scriptCmds[0].parameters[0]).toBe("console.log('A')");

    // No conditional branch commands (muted condition is bypassed)
    const condCmds = commands.filter(
      (c) => c.code === CODE.CONDITIONAL_BRANCH,
    );
    expect(condCmds).toHaveLength(0);

    // ActionB's script should NOT appear (false branch not followed)
    const allScriptParams = commands
      .filter((c) => c.code === CODE.SCRIPT)
      .map((c) => c.parameters[0]);
    expect(allScriptParams).not.toContain("console.log('B')");
  });

  it("muted menu follows first choice (choice-0)", () => {
    const nodes: InteractionNode[] = [
      {
        id: "start-1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { type: "start", label: "Start" },
      },
      {
        id: "menu-1",
        type: "menu",
        position: { x: 200, y: 0 },
        data: {
          type: "menu",
          label: "MutedMenu",
          muted: true,
          choices: [
            { id: "ch1", text: "Yes" },
            { id: "ch2", text: "No" },
          ],
          cancelType: "disallow",
          windowBackground: 0,
          windowPosition: 2,
        },
      },
      {
        id: "act-a",
        type: "action",
        position: { x: 400, y: -50 },
        data: {
          type: "action",
          label: "ActionA",
          actions: [
            { id: "a1", type: "script", script: "console.log('yes')" },
          ],
        },
      },
      {
        id: "act-b",
        type: "action",
        position: { x: 400, y: 50 },
        data: {
          type: "action",
          label: "ActionB",
          actions: [
            { id: "a2", type: "script", script: "console.log('no')" },
          ],
        },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 600, y: 0 },
        data: { type: "end", label: "End" },
      },
    ];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start-1", target: "menu-1" },
      {
        id: "e2",
        source: "menu-1",
        target: "act-a",
        sourceHandle: "choice-0",
      },
      {
        id: "e3",
        source: "menu-1",
        target: "act-b",
        sourceHandle: "choice-1",
      },
      { id: "e4", source: "act-a", target: "end-1" },
      { id: "e5", source: "act-b", target: "end-1" },
    ];

    const commands = exportToMZCommands(makeDoc(nodes, edges));

    // ActionA's script should appear (choice-0 path followed)
    const scriptCmds = commands.filter((c) => c.code === CODE.SCRIPT);
    expect(scriptCmds.length).toBeGreaterThanOrEqual(1);
    expect(scriptCmds[0].parameters[0]).toBe("console.log('yes')");

    // No Show Choices commands (muted menu is bypassed)
    const choiceCmds = commands.filter(
      (c) => c.code === CODE.SHOW_CHOICES,
    );
    expect(choiceCmds).toHaveLength(0);

    // ActionB's script should NOT appear
    const allScriptParams = commands
      .filter((c) => c.code === CODE.SCRIPT)
      .map((c) => c.parameters[0]);
    expect(allScriptParams).not.toContain("console.log('no')");
  });

  it("muted end node — DFS stops naturally", () => {
    const nodes: InteractionNode[] = [
      {
        id: "start-1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { type: "start", label: "Start" },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 200, y: 0 },
        data: { type: "end", label: "MutedEnd", muted: true },
      },
    ];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start-1", target: "end-1" },
    ];

    const commands = exportToMZCommands(makeDoc(nodes, edges));

    // Only the terminating END command (code 0 at indent 0) should appear
    expect(commands).toHaveLength(1);
    expect(commands[0]).toEqual({
      code: CODE.END,
      indent: 0,
      parameters: [],
    });
  });

  it("start node mute is ignored", () => {
    const nodes: InteractionNode[] = [
      {
        id: "start-1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { type: "start", label: "Start", muted: true },
      },
      {
        id: "act-1",
        type: "action",
        position: { x: 200, y: 0 },
        data: {
          type: "action",
          label: "Act",
          actions: [
            { id: "a1", type: "script", script: "console.log('hello')" },
          ],
        },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 400, y: 0 },
        data: { type: "end", label: "End" },
      },
    ];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start-1", target: "act-1" },
      { id: "e2", source: "act-1", target: "end-1" },
    ];

    const commands = exportToMZCommands(makeDoc(nodes, edges));

    // Action's script commands should still appear (start mute is ignored)
    const scriptCmds = commands.filter((c) => c.code === CODE.SCRIPT);
    expect(scriptCmds.length).toBeGreaterThanOrEqual(1);
    expect(scriptCmds[0].parameters[0]).toBe("console.log('hello')");
  });

  it("multiple consecutive muted nodes chain correctly", () => {
    const nodes: InteractionNode[] = [
      {
        id: "start-1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { type: "start", label: "Start" },
      },
      {
        id: "act-1",
        type: "action",
        position: { x: 200, y: 0 },
        data: {
          type: "action",
          label: "MutedAct1",
          muted: true,
          actions: [
            { id: "a1", type: "script", script: "console.log('skip1')" },
          ],
        },
      },
      {
        id: "act-2",
        type: "action",
        position: { x: 400, y: 0 },
        data: {
          type: "action",
          label: "MutedAct2",
          muted: true,
          actions: [
            { id: "a2", type: "script", script: "console.log('skip2')" },
          ],
        },
      },
      {
        id: "act-3",
        type: "action",
        position: { x: 600, y: 0 },
        data: {
          type: "action",
          label: "Action3",
          actions: [
            { id: "a3", type: "script", script: "console.log('keep')" },
          ],
        },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 800, y: 0 },
        data: { type: "end", label: "End" },
      },
    ];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start-1", target: "act-1" },
      { id: "e2", source: "act-1", target: "act-2" },
      { id: "e3", source: "act-2", target: "act-3" },
      { id: "e4", source: "act-3", target: "end-1" },
    ];

    const commands = exportToMZCommands(makeDoc(nodes, edges));

    // Only Action3's script should appear
    const scriptCmds = commands.filter((c) => c.code === CODE.SCRIPT);
    expect(scriptCmds).toHaveLength(1);
    expect(scriptCmds[0].parameters[0]).toBe("console.log('keep')");

    // Skipped scripts should not appear
    const allScriptParams = commands
      .filter((c) => c.code === CODE.SCRIPT || c.code === CODE.SCRIPT_LINE)
      .map((c) => c.parameters[0]);
    expect(allScriptParams).not.toContain("console.log('skip1')");
    expect(allScriptParams).not.toContain("console.log('skip2')");
  });

  it("muted convergence node still gets label but skips commands", () => {
    // Graph: start -> mutedAction <- actionB (two incoming edges = convergence)
    //         start -> actionB -> mutedAction -> end
    // Actually: start branches to mutedAction AND actionB, both converge not needed.
    // Better: two paths lead to mutedAction (convergence)
    //   start -> actionA -> mutedAction -> end
    //                  \--> actionB -> mutedAction (second incoming edge)
    // We need start to connect to both actionA and actionB somehow.
    // Use a condition node to fork:
    //   start -> cond -> (true: actionA -> mutedAction -> end)
    //                    (false: actionB -> mutedAction -> end)
    const nodes: InteractionNode[] = [
      {
        id: "start-1",
        type: "start",
        position: { x: 0, y: 0 },
        data: { type: "start", label: "Start" },
      },
      {
        id: "cond-1",
        type: "condition",
        position: { x: 200, y: 0 },
        data: {
          type: "condition",
          label: "Fork",
          condition: { id: "c1", type: "script", script: "true" },
        },
      },
      {
        id: "act-a",
        type: "action",
        position: { x: 400, y: -50 },
        data: {
          type: "action",
          label: "ActionA",
          actions: [
            {
              id: "a1",
              type: "set_switch",
              switchId: 1,
              switchValue: "on",
            },
          ],
        },
      },
      {
        id: "act-b",
        type: "action",
        position: { x: 400, y: 50 },
        data: {
          type: "action",
          label: "ActionB",
          actions: [
            {
              id: "a2",
              type: "set_switch",
              switchId: 2,
              switchValue: "on",
            },
          ],
        },
      },
      {
        id: "muted-conv",
        type: "action",
        position: { x: 600, y: 0 },
        data: {
          type: "action",
          label: "MutedConvergence",
          muted: true,
          actions: [
            {
              id: "a3",
              type: "script",
              script: "console.log('should not appear')",
            },
          ],
        },
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 800, y: 0 },
        data: { type: "end", label: "End" },
      },
    ];
    const edges: InteractionEdge[] = [
      { id: "e1", source: "start-1", target: "cond-1" },
      { id: "e2", source: "cond-1", target: "act-a", sourceHandle: "true" },
      { id: "e3", source: "cond-1", target: "act-b", sourceHandle: "false" },
      { id: "e4", source: "act-a", target: "muted-conv" },
      { id: "e5", source: "act-b", target: "muted-conv" },
      { id: "e6", source: "muted-conv", target: "end-1" },
    ];

    const commands = exportToMZCommands(makeDoc(nodes, edges));

    // The muted convergence node should have a LABEL command
    const labelCmds = commands.filter((c) => c.code === CODE.LABEL);
    expect(labelCmds.length).toBeGreaterThanOrEqual(1);
    const mutedLabel = labelCmds.find((c) =>
      (c.parameters[0] as string).includes("muted-conv"),
    );
    expect(mutedLabel).toBeDefined();

    // The muted node's script should NOT appear
    const allScriptParams = commands
      .filter((c) => c.code === CODE.SCRIPT || c.code === CODE.SCRIPT_LINE)
      .map((c) => c.parameters[0]);
    expect(allScriptParams).not.toContain(
      "console.log('should not appear')",
    );

    // Both switch commands from ActionA and ActionB should be present
    const switchCmds = commands.filter(
      (c) => c.code === CODE.CONTROL_SWITCHES,
    );
    expect(switchCmds.length).toBeGreaterThanOrEqual(2);
  });
});
