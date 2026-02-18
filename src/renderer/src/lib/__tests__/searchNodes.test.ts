import { describe, it, expect } from "vitest";
import { getSearchableText, searchNodes } from "../searchNodes";
import type { InteractionNode } from "../../types";

const testNodes: InteractionNode[] = [
  {
    id: "n1",
    type: "start",
    position: { x: 0, y: 0 },
    data: { type: "start", label: "Game Start" },
  },
  {
    id: "n2",
    type: "menu",
    position: { x: 0, y: 0 },
    data: {
      type: "menu",
      label: "Talk Menu",
      choices: [
        { id: "c1", text: "Ask about school" },
        { id: "c2", text: "Say goodbye" },
      ],
      cancelType: "disallow",
      windowBackground: 0,
      windowPosition: 2,
    },
  },
  {
    id: "n3",
    type: "action",
    position: { x: 0, y: 0 },
    data: {
      type: "action",
      label: "Set Affection",
      actions: [
        { id: "a1", type: "script", script: "$gameVariables.setValue(5, 10)" },
        { id: "a2", type: "show_text", text: "Sara smiles warmly." },
      ],
    },
  },
  {
    id: "n4",
    type: "condition",
    position: { x: 0, y: 0 },
    data: {
      type: "condition",
      label: "Check Flag",
      condition: {
        id: "cd1",
        type: "script",
        script: "$gameSwitches.value(42)",
      },
    },
  },
  {
    id: "n5",
    type: "end",
    position: { x: 0, y: 0 },
    data: { type: "end", label: "End" },
  },
];

describe("getSearchableText", () => {
  it("extracts label from start node", () => {
    expect(getSearchableText(testNodes[0])).toContain("Game Start");
  });

  it("extracts label and choice text from menu node", () => {
    const text = getSearchableText(testNodes[1]);
    expect(text).toContain("Talk Menu");
    expect(text).toContain("Ask about school");
    expect(text).toContain("Say goodbye");
  });

  it("extracts label, script, and text from action node", () => {
    const text = getSearchableText(testNodes[2]);
    expect(text).toContain("Set Affection");
    expect(text).toContain("$gameVariables.setValue(5, 10)");
    expect(text).toContain("Sara smiles warmly.");
  });

  it("extracts label and condition script from condition node", () => {
    const text = getSearchableText(testNodes[3]);
    expect(text).toContain("Check Flag");
    expect(text).toContain("$gameSwitches.value(42)");
  });
});

describe("searchNodes", () => {
  it("returns empty array for empty search term", () => {
    expect(searchNodes(testNodes, "")).toEqual([]);
  });

  it("finds nodes by label substring (case-insensitive)", () => {
    const result = searchNodes(testNodes, "menu");
    expect(result).toEqual(["n2"]);
  });

  it("finds nodes by choice text", () => {
    const result = searchNodes(testNodes, "school");
    expect(result).toEqual(["n2"]);
  });

  it("finds nodes by script content", () => {
    const result = searchNodes(testNodes, "gameVariables");
    expect(result).toEqual(["n3"]);
  });

  it("finds multiple matches", () => {
    const result = searchNodes(testNodes, "end");
    expect(result).toContain("n5");
  });

  it("finds nodes by show_text content", () => {
    const result = searchNodes(testNodes, "sara");
    expect(result).toEqual(["n3"]);
  });
});
