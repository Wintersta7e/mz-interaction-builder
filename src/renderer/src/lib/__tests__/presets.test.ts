import { describe, it, expect } from "vitest";
import { builtInPresets, createCustomPreset, getPreset } from "../presets";

describe("builtInPresets", () => {
  it("contains relationship, time, and player presets", () => {
    const ids = builtInPresets.map((p) => p.id);
    expect(ids).toContain("relationship");
    expect(ids).toContain("time");
    expect(ids).toContain("player");
  });

  it("all presets have required fields", () => {
    for (const preset of builtInPresets) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(Array.isArray(preset.variables)).toBe(true);
      expect(preset.variables.length).toBeGreaterThan(0);
    }
  });

  it("all variables have id, name, and type", () => {
    for (const preset of builtInPresets) {
      for (const v of preset.variables) {
        expect(v.id).toBeTruthy();
        expect(v.name).toBeTruthy();
        expect(["variable", "switch"]).toContain(v.type);
      }
    }
  });
});

describe("createCustomPreset", () => {
  it("creates a preset with unique ID", () => {
    const p = createCustomPreset("Test Preset", "Desc");
    expect(p.id).toContain("custom-");
    expect(p.name).toBe("Test Preset");
    expect(p.description).toBe("Desc");
    expect(p.variables).toEqual([]);
  });

  it("defaults description to empty string", () => {
    const p = createCustomPreset("Minimal");
    expect(p.description).toBe("");
  });

  it("ID includes timestamp prefix", () => {
    const p = createCustomPreset("Test");
    expect(p.id).toMatch(/^custom-\d+$/);
  });
});

describe("getPreset", () => {
  it("returns preset by ID", () => {
    const p = getPreset("relationship");
    expect(p).toBeDefined();
    expect(p!.name).toBe("Relationship System");
  });

  it("returns undefined for unknown ID", () => {
    expect(getPreset("nonexistent")).toBeUndefined();
  });
});
