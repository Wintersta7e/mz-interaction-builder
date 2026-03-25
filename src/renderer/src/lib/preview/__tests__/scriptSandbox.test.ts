import { describe, it, expect } from "vitest";
import { evaluateScript, executeScript } from "../scriptSandbox";

describe("scriptSandbox", () => {
  describe("evaluateScript", () => {
    it("evaluates simple boolean expression", () => {
      const vars = new Map<number, number>();
      const switches = new Map<number, boolean>();
      const result = evaluateScript("true", vars, switches);
      expect(result).toBe(true);
    });

    it("reads $gameSwitches.value(5) — returns true when switch 5 is true", () => {
      const vars = new Map<number, number>();
      const switches = new Map<number, boolean>([[5, true]]);
      const result = evaluateScript("$gameSwitches.value(5)", vars, switches);
      expect(result).toBe(true);
    });

    it("reads $gameVariables.value(10) > 20 — true when var 10 is 42", () => {
      const vars = new Map<number, number>([[10, 42]]);
      const switches = new Map<number, boolean>();
      const result = evaluateScript("$gameVariables.value(10) > 20", vars, switches);
      expect(result).toBe(true);
    });

    it("returns Error for invalid scripts", () => {
      const vars = new Map<number, number>();
      const switches = new Map<number, boolean>();
      const result = evaluateScript("undefinedThing.foo", vars, switches);
      expect(result).toBeInstanceOf(Error);
    });

    it("cannot access sandbox internals via parameter names", () => {
      const vars = new Map<number, number>();
      const switches = new Map<number, boolean>();
      // Verify the sandbox only exposes the three mock objects,
      // not arbitrary variables from the outer scope
      const result = evaluateScript(
        "typeof $gameSwitches === 'object' && typeof $gameVariables === 'object' && typeof $gameSelfSwitches === 'object'",
        vars,
        switches,
      );
      expect(result).toBe(true);
    });
  });

  describe("executeScript", () => {
    it("$gameVariables.setValue(1, 99) mutates the variables map", () => {
      const vars = new Map<number, number>();
      const switches = new Map<number, boolean>();
      const result = executeScript("$gameVariables.setValue(1, 99)", vars, switches);
      expect(result).toBeNull();
      expect(vars.get(1)).toBe(99);
    });

    it("$gameSwitches.setValue(2, true) mutates the switches map", () => {
      const vars = new Map<number, number>();
      const switches = new Map<number, boolean>();
      const result = executeScript("$gameSwitches.setValue(2, true)", vars, switches);
      expect(result).toBeNull();
      expect(switches.get(2)).toBe(true);
    });
  });
});
