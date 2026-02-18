import type { VariablePreset } from "../../types";

// Built-in presets for common game system variables
export const builtInPresets: VariablePreset[] = [
  {
    id: "relationship",
    name: "Relationship System",
    description: "Variables for managing character relationships",
    variables: [
      {
        id: "rel-affection",
        name: "Get Affection",
        type: "variable",
        getter: "Relationship.getAffection(charId)",
      },
      {
        id: "rel-corruption",
        name: "Get Corruption",
        type: "variable",
        getter: "Relationship.getCorruption(charId)",
      },
      {
        id: "rel-stage",
        name: "Get Stage",
        type: "variable",
        getter: "Relationship.getStage(charId)",
      },
      {
        id: "rel-add-affection",
        name: "Add Affection",
        type: "variable",
        setter: "Relationship.addAffection(charId, amount)",
      },
      {
        id: "rel-add-corruption",
        name: "Add Corruption",
        type: "variable",
        setter: "Relationship.addCorruption(charId, amount)",
      },
      {
        id: "rel-check-stage",
        name: "Check Stage",
        type: "switch",
        getter: "Relationship.checkStage(charId, stage)",
      },
    ],
  },
  {
    id: "time",
    name: "Time System",
    description: "Variables for time and energy management",
    variables: [
      {
        id: "time-slot",
        name: "Time Slot",
        type: "variable",
        mzId: 3,
        getter: "$gameVariables.value(3)",
      },
      {
        id: "time-energy",
        name: "Energy",
        type: "variable",
        mzId: 7,
        getter: "$gameVariables.value(7)",
      },
      {
        id: "time-day",
        name: "Current Day",
        type: "variable",
        mzId: 1,
        getter: "$gameVariables.value(1)",
      },
      {
        id: "time-weekday",
        name: "Weekday",
        type: "variable",
        mzId: 2,
        getter: "$gameVariables.value(2)",
      },
      {
        id: "time-action-points",
        name: "Action Points",
        type: "variable",
        mzId: 16,
        getter: "$gameVariables.value(16)",
      },
      {
        id: "time-is-school",
        name: "In School",
        type: "switch",
        mzId: 11,
        getter: "$gameSwitches.value(11)",
      },
    ],
  },
  {
    id: "player",
    name: "Player Data",
    description: "Variables for player stats and flags",
    variables: [
      {
        id: "player-money",
        name: "Money",
        type: "variable",
        mzId: 6,
        getter: "$gameParty.gold()",
      },
      {
        id: "player-school-period",
        name: "School Period",
        type: "variable",
        mzId: 15,
        getter: "$gameVariables.value(15)",
      },
    ],
  },
];

// Create a custom preset
export function createCustomPreset(
  name: string,
  description: string = "",
): VariablePreset {
  return {
    id: `custom-${Date.now()}`,
    name,
    description,
    variables: [],
  };
}

// Get preset by ID
export function getPreset(id: string): VariablePreset | undefined {
  return builtInPresets.find((p) => p.id === id);
}
