import { describe, it, expect } from "vitest";
import { evaluateScript, executeScript } from "../scriptSandbox";

describe("evaluateScript", () => {
  it("evaluates simple boolean expression", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(evaluateScript("true", vars, switches)).toBe(true);
  });

  it("evaluates arithmetic expressions", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(evaluateScript("2 + 3", vars, switches)).toBe(5);
  });

  it("reads $gameSwitches.value() — returns true when set", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>([[5, true]]);
    expect(evaluateScript("$gameSwitches.value(5)", vars, switches)).toBe(true);
  });

  it("reads $gameSwitches.value() — defaults to false when unset", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(evaluateScript("$gameSwitches.value(99)", vars, switches)).toBe(false);
  });

  it("reads $gameVariables.value() — returns value when set", () => {
    const vars = new Map<number, number>([[10, 42]]);
    const switches = new Map<number, boolean>();
    expect(evaluateScript("$gameVariables.value(10)", vars, switches)).toBe(42);
  });

  it("reads $gameVariables.value() — defaults to 0 when unset", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(evaluateScript("$gameVariables.value(99)", vars, switches)).toBe(0);
  });

  it("evaluates comparison with variables", () => {
    const vars = new Map<number, number>([[10, 42]]);
    const switches = new Map<number, boolean>();
    expect(evaluateScript("$gameVariables.value(10) > 20", vars, switches)).toBe(true);
    expect(evaluateScript("$gameVariables.value(10) > 100", vars, switches)).toBe(false);
  });

  it("returns Error for syntax errors", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(evaluateScript("if (", vars, switches)).toBeInstanceOf(Error);
  });

  it("returns Error for reference errors", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(evaluateScript("undefinedThing.foo", vars, switches)).toBeInstanceOf(Error);
  });

  it("shadows window/document/fetch as undefined", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(evaluateScript("typeof window", vars, switches)).toBe("undefined");
    expect(evaluateScript("typeof document", vars, switches)).toBe("undefined");
    expect(evaluateScript("typeof fetch", vars, switches)).toBe("undefined");
    expect(evaluateScript("typeof XMLHttpRequest", vars, switches)).toBe("undefined");
    expect(evaluateScript("typeof globalThis", vars, switches)).toBe("undefined");
    expect(evaluateScript("typeof self", vars, switches)).toBe("undefined");
  });

  it("exposes all three mock game objects", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(
      evaluateScript(
        "typeof $gameSwitches === 'object' && typeof $gameVariables === 'object' && typeof $gameSelfSwitches === 'object'",
        vars,
        switches,
      ),
    ).toBe(true);
  });

  it("$gameSelfSwitches.value() returns false", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    expect(evaluateScript("$gameSelfSwitches.value()", vars, switches)).toBe(false);
  });
});

describe("executeScript", () => {
  it("$gameVariables.setValue() mutates the variables map", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    const result = executeScript("$gameVariables.setValue(1, 99)", vars, switches);
    expect(result).toBeNull();
    expect(vars.get(1)).toBe(99);
  });

  it("$gameSwitches.setValue() mutates the switches map", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    const result = executeScript("$gameSwitches.setValue(2, true)", vars, switches);
    expect(result).toBeNull();
    expect(switches.get(2)).toBe(true);
  });

  it("executes multi-statement scripts", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    const result = executeScript(
      "$gameVariables.setValue(1, 10); $gameVariables.setValue(2, 20);",
      vars,
      switches,
    );
    expect(result).toBeNull();
    expect(vars.get(1)).toBe(10);
    expect(vars.get(2)).toBe(20);
  });

  it("returns Error for invalid scripts", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    const result = executeScript("undefinedThing.bar()", vars, switches);
    expect(result).toBeInstanceOf(Error);
  });

  it("returns Error for syntax errors", () => {
    const vars = new Map<number, number>();
    const switches = new Map<number, boolean>();
    const result = executeScript("if ( {", vars, switches);
    expect(result).toBeInstanceOf(Error);
  });

  it("does not modify vars/switches on error", () => {
    const vars = new Map<number, number>([[1, 42]]);
    const switches = new Map<number, boolean>();
    executeScript("undefinedThing.crash(); $gameVariables.setValue(1, 0)", vars, switches);
    // Script errored before reaching setValue, so var 1 should be unchanged
    expect(vars.get(1)).toBe(42);
  });
});
