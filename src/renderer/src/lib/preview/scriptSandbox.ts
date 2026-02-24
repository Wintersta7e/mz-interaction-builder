/**
 * Script Sandbox — evaluates RPG Maker MZ scripts in a safe(r) scope
 * by providing mock $gameSwitches, $gameVariables, $gameSelfSwitches
 * objects backed by the preview engine's Maps.
 *
 * NOTE: new Function() is used intentionally here — this is a game script
 * preview tool that must evaluate user-authored RPG Maker MZ scripts in
 * a sandboxed context with mock game objects. The scripts are authored by
 * the same user running the application (not untrusted input).
 */

interface GameSwitches {
  value(id: number): boolean;
  setValue(id: number, val: boolean): void;
}

interface GameVariables {
  value(id: number): number;
  setValue(id: number, val: number): void;
}

interface GameSelfSwitches {
  value(): boolean;
  setValue(): void;
}

function createMockSwitches(switches: Map<number, boolean>): GameSwitches {
  return {
    value(id: number): boolean {
      return switches.get(id) ?? false;
    },
    setValue(id: number, val: boolean): void {
      switches.set(id, val);
    },
  };
}

function createMockVariables(variables: Map<number, number>): GameVariables {
  return {
    value(id: number): number {
      return variables.get(id) ?? 0;
    },
    setValue(id: number, val: number): void {
      variables.set(id, val);
    },
  };
}

function createMockSelfSwitches(): GameSelfSwitches {
  return {
    value(): boolean {
      return false;
    },
    setValue(): void {
      // no-op
    },
  };
}

/**
 * Evaluate a script expression and return its result.
 * Used for condition evaluation (e.g. `$gameVariables.value(1) > 10`).
 *
 * @returns The expression result, or an Error instance if evaluation failed.
 */
export function evaluateScript(
  script: string,
  variables: Map<number, number>,
  switches: Map<number, boolean>,
): unknown {
  try {
    const fn = new Function(
      "$gameSwitches",
      "$gameVariables",
      "$gameSelfSwitches",
      '"use strict"; return (' + script + ");",
    );
    return fn(
      createMockSwitches(switches),
      createMockVariables(variables),
      createMockSelfSwitches(),
    );
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Execute a script as statements (no return value).
 * Used for action scripts (e.g. `$gameVariables.setValue(1, 99)`).
 *
 * @returns null on success, or an Error instance if execution failed.
 */
export function executeScript(
  script: string,
  variables: Map<number, number>,
  switches: Map<number, boolean>,
): Error | null {
  try {
    const fn = new Function(
      "$gameSwitches",
      "$gameVariables",
      "$gameSelfSwitches",
      '"use strict"; ' + script,
    );
    fn(
      createMockSwitches(switches),
      createMockVariables(variables),
      createMockSelfSwitches(),
    );
    return null;
  } catch (err) {
    return err instanceof Error ? err : new Error(String(err));
  }
}
