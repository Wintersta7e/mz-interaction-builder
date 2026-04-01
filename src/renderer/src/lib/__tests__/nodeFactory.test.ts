import { describe, it, expect } from "vitest";
import { getDefaultNodeData, createNode } from "../nodeFactory";
import type { InteractionNodeType } from "../../types";

describe("getDefaultNodeData", () => {
  const types: InteractionNodeType[] = ["start", "menu", "action", "condition", "end", "group", "comment"];

  it.each(types)("returns data with matching type field for %s", (type) => {
    const data = getDefaultNodeData(type);
    expect(data.type).toBe(type);
    expect(data.label).toBeTruthy();
  });

  it("returns choices array for menu node", () => {
    const data = getDefaultNodeData("menu");
    expect(data).toHaveProperty("choices");
    expect(Array.isArray((data as { choices: unknown[] }).choices)).toBe(true);
  });

  it("returns actions array for action node", () => {
    const data = getDefaultNodeData("action");
    expect(data).toHaveProperty("actions");
    expect(Array.isArray((data as { actions: unknown[] }).actions)).toBe(true);
  });

  it("returns condition object for condition node", () => {
    const data = getDefaultNodeData("condition");
    expect(data).toHaveProperty("condition");
    const cond = (data as { condition: { id: string; type: string } }).condition;
    expect(cond.id).toBeTruthy();
    expect(cond.type).toBe("switch");
  });

  it("returns color and collapsed for group node", () => {
    const data = getDefaultNodeData("group");
    expect((data as { color: string }).color).toBe("blue");
    expect((data as { collapsed: boolean }).collapsed).toBe(false);
  });

  it("returns text field for comment node", () => {
    const data = getDefaultNodeData("comment");
    expect((data as { text: string }).text).toBe("");
  });
});

describe("createNode", () => {
  it("creates a node with unique ID and correct position", () => {
    const pos = { x: 100, y: 200 };
    const node = createNode("action", pos);
    expect(node.id).toContain("action-");
    expect(node.type).toBe("action");
    expect(node.position).toEqual(pos);
    expect(node.data.type).toBe("action");
  });

  it("applies width/height style for group nodes", () => {
    const node = createNode("group", { x: 0, y: 0 });
    expect(node.style).toEqual({ width: 400, height: 300 });
    expect((node as { zIndex: number }).zIndex).toBe(-1);
  });

  it("applies width/height style for comment nodes", () => {
    const node = createNode("comment", { x: 0, y: 0 });
    expect(node.style).toEqual({ width: 200, height: 100 });
  });

  it("does not apply style overrides for standard nodes", () => {
    const node = createNode("start", { x: 0, y: 0 });
    expect(node.style).toBeUndefined();
  });

  it("generates unique IDs for each node", () => {
    const a = createNode("action", { x: 0, y: 0 });
    const b = createNode("action", { x: 0, y: 0 });
    expect(a.id).not.toBe(b.id);
  });
});
