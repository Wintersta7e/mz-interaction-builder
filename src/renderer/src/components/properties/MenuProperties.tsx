import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Ban,
} from "lucide-react";
import { generateId } from "../../stores";
import { parseIntSafe } from "../../lib/parseIntSafe";
import type { InteractionNode, MenuNodeData, MenuChoice } from "../../types";
import { DebouncedInput } from "../DebouncedInputs";
import { ConditionEditor } from "../ConditionEditor";

export interface MenuPropertiesProps {
  node: InteractionNode;
  updateNode: (id: string, data: Partial<InteractionNode>) => void;
}

export function MenuProperties({ node, updateNode }: MenuPropertiesProps) {
  // Safe: parent renders this component only when selectedNode.type === 'menu'
  const data = node.data as MenuNodeData;
  const choices = data.choices || [];
  const [expandedChoice, setExpandedChoice] = useState<string | null>(null);

  const addChoice = () => {
    const newChoice: MenuChoice = {
      id: generateId("choice"),
      text: `Choice ${choices.length + 1}`,
    };
    updateNode(node.id, {
      data: { ...data, choices: [...choices, newChoice] },
    });
  };

  const updateChoice = (index: number, updates: Partial<MenuChoice>) => {
    const newChoices = choices.map((c, i) =>
      i === index ? { ...c, ...updates } : c,
    );
    updateNode(node.id, { data: { ...data, choices: newChoices } });
  };

  const removeChoice = (index: number) => {
    const newChoices = choices.filter((_, i) => i !== index);
    updateNode(node.id, { data: { ...data, choices: newChoices } });
  };

  const moveChoice = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= choices.length) return;
    const newChoices = [...choices];
    [newChoices[index], newChoices[newIndex]] = [
      newChoices[newIndex],
      newChoices[index],
    ];
    updateNode(node.id, { data: { ...data, choices: newChoices } });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-xs text-muted-foreground">Choices</label>
          <button
            onClick={addChoice}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {choices.map((choice, index) => (
            <div key={choice.id} className="rounded border border-border">
              {/* Choice header */}
              <div className="flex items-center gap-1 p-2">
                <div className="flex flex-col">
                  <button
                    onClick={() => moveChoice(index, "up")}
                    disabled={index === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveChoice(index, "down")}
                    disabled={index === choices.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
                <DebouncedInput
                  value={choice.text}
                  onChange={(value) => updateChoice(index, { text: value })}
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                  placeholder={`Choice ${index + 1}`}
                />
                <button
                  onClick={() =>
                    setExpandedChoice(
                      expandedChoice === choice.id ? null : choice.id,
                    )
                  }
                  className={`flex h-6 w-6 items-center justify-center rounded ${
                    choice.hideCondition || choice.disableCondition
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  } hover:bg-muted`}
                  title="Conditions"
                >
                  {choice.hideCondition ? (
                    <EyeOff className="h-3 w-3" />
                  ) : choice.disableCondition ? (
                    <Ban className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={() => removeChoice(index)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {/* Expanded conditions */}
              {expandedChoice === choice.id && (
                <div className="border-t border-border p-2 space-y-2">
                  {/* Hide Condition */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-amber-500 flex items-center gap-1">
                        <EyeOff className="h-3 w-3" /> Hide Condition
                      </span>
                      {!choice.hideCondition && (
                        <button
                          onClick={() =>
                            updateChoice(index, {
                              hideCondition: {
                                id: generateId("choice"),
                                type: "switch",
                              },
                            })
                          }
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                    {choice.hideCondition && (
                      <ConditionEditor
                        condition={choice.hideCondition}
                        onChange={(cond) =>
                          updateChoice(index, { hideCondition: cond })
                        }
                        onRemove={() =>
                          updateChoice(index, { hideCondition: undefined })
                        }
                      />
                    )}
                    {!choice.hideCondition && (
                      <p className="text-xs text-muted-foreground italic">
                        Choice always visible
                      </p>
                    )}
                  </div>

                  {/* Disable Condition */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-red-500 flex items-center gap-1">
                        <Ban className="h-3 w-3" /> Disable Condition
                      </span>
                      {!choice.disableCondition && (
                        <button
                          onClick={() =>
                            updateChoice(index, {
                              disableCondition: {
                                id: generateId("choice"),
                                type: "switch",
                              },
                            })
                          }
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                    {choice.disableCondition && (
                      <ConditionEditor
                        condition={choice.disableCondition}
                        onChange={(cond) =>
                          updateChoice(index, { disableCondition: cond })
                        }
                        onRemove={() =>
                          updateChoice(index, { disableCondition: undefined })
                        }
                      />
                    )}
                    {!choice.disableCondition && (
                      <p className="text-xs text-muted-foreground italic">
                        Choice always enabled
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Cancel Behavior
        </label>
        <select
          value={data.cancelType || "disallow"}
          onChange={(e) =>
            updateNode(node.id, {
              data: {
                ...data,
                cancelType: e.target.value as
                  | "disallow"
                  | "branch"
                  | "last_choice",
              },
            })
          }
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="disallow">Disallow</option>
          <option value="branch">Branch</option>
          <option value="last_choice">Last Choice</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Window Background
        </label>
        <select
          value={data.windowBackground ?? 0}
          onChange={(e) => {
            const val = parseIntSafe(e.target.value, 0) as 0 | 1 | 2;
            updateNode(node.id, { data: { ...data, windowBackground: val } });
          }}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        >
          <option value={0}>Window</option>
          <option value={1}>Dim</option>
          <option value={2}>Transparent</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Window Position
        </label>
        <select
          value={data.windowPosition ?? 2}
          onChange={(e) => {
            const val = parseIntSafe(e.target.value, 2) as 0 | 1 | 2;
            updateNode(node.id, { data: { ...data, windowPosition: val } });
          }}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        >
          <option value={0}>Left</option>
          <option value={1}>Middle</option>
          <option value={2}>Right</option>
        </select>
      </div>
    </div>
  );
}
