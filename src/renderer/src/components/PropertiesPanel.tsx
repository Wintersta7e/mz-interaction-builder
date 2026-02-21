import { useDocumentStore, useUIStore, useProjectStore } from "../stores";
import type {
  InteractionNode,
  MenuNodeData,
  ActionNodeData,
  ConditionNodeData,
  CommentNodeData,
  GroupColor,
  MenuChoice,
  Action,
  Condition,
} from "../types";
import { v4 as uuid } from "uuid";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Ban,
  Save,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useDebouncedSync } from "../hooks/useDebouncedSync";
import { parseIntSafe } from "../lib/parseIntSafe";
import { SearchableSelect } from "./SearchableSelect";
import { SaveTemplateModal } from "./SaveTemplateModal";

const GROUP_COLORS: Record<string, string> = {
  blue: "hsl(210 80% 60%)",
  green: "hsl(150 60% 50%)",
  purple: "hsl(270 60% 60%)",
  amber: "hsl(40 90% 55%)",
  rose: "hsl(350 70% 60%)",
  gray: "hsl(220 10% 50%)",
};

// ============================================
// Debounced Input Wrappers
// ============================================

function DebouncedInput({
  value,
  onChange,
  type = "text",
  className,
  placeholder,
  min,
  max,
}: {
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  const { localValue, setLocalValue, flush } = useDebouncedSync(
    String(value ?? ""),
    onChange,
    300,
  );
  return (
    <input
      type={type}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={flush}
      className={className}
      placeholder={placeholder}
      min={min}
      max={max}
    />
  );
}

function DebouncedTextarea({
  value,
  onChange,
  className,
  rows,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
}) {
  const { localValue, setLocalValue, flush } = useDebouncedSync(
    value,
    onChange,
    300,
  );
  return (
    <textarea
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={flush}
      className={className}
      rows={rows}
      placeholder={placeholder}
    />
  );
}

export function PropertiesPanel() {
  const selectedNodeId = useUIStore((s) => s.selectedNodeId);
  const updateNode = useDocumentStore((s) => s.updateNode);
  const selectedNode = useDocumentStore(
    useCallback(
      (s) =>
        selectedNodeId
          ? (s.document.nodes.find((n) => n.id === selectedNodeId) ?? null)
          : null,
      [selectedNodeId],
    ),
  );

  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  if (!selectedNode) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-muted-foreground">
        <p className="text-center text-sm">
          Select a node to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        PROPERTIES
      </h2>

      {/* Common properties */}
      <div className="mb-4">
        <label className="mb-1 block text-xs text-muted-foreground">
          Label
        </label>
        <DebouncedInput
          value={selectedNode.data.label}
          onChange={(value) =>
            updateNode(selectedNode.id, {
              data: { ...selectedNode.data, label: value },
            })
          }
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* Type-specific properties */}
      {selectedNode.type === "menu" && (
        <MenuProperties node={selectedNode} updateNode={updateNode} />
      )}
      {selectedNode.type === "action" && (
        <ActionProperties node={selectedNode} updateNode={updateNode} />
      )}
      {selectedNode.type === "condition" && (
        <ConditionProperties node={selectedNode} updateNode={updateNode} />
      )}
      {selectedNode.type === "group" && selectedNode.data.type === "group" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Color
            </label>
            <div className="flex gap-1.5">
              {(
                ["blue", "green", "purple", "amber", "rose", "gray"] as const
              ).map((c) => (
                <button
                  key={c}
                  onClick={() =>
                    updateNode(selectedNode.id, {
                      data: { ...selectedNode.data, color: c as GroupColor },
                    })
                  }
                  className={`h-6 w-6 rounded-full border-2 ${
                    selectedNode.data.color === c
                      ? "border-white"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: GROUP_COLORS[c] }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {selectedNode.type === "comment" &&
        selectedNode.data.type === "comment" && (
          <CommentProperties node={selectedNode} updateNode={updateNode} />
        )}
      {selectedNode.type !== "group" && selectedNode.type !== "comment" && (
        <>
          <div className="mt-6 border-t border-border pt-4">
            <button
              onClick={() => setSaveTemplateOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Save className="h-3.5 w-3.5" />
              Save as Template
            </button>
          </div>
          <SaveTemplateModal
            isOpen={saveTemplateOpen}
            onClose={() => setSaveTemplateOpen(false)}
            nodes={[selectedNode]}
            edges={[]}
          />
        </>
      )}
    </div>
  );
}

// ============================================
// Condition Editor Component (Reusable)
// ============================================
interface ConditionEditorProps {
  condition: Condition | undefined;
  onChange: (condition: Condition) => void;
  onRemove?: () => void;
  label?: string;
}

function ConditionEditor({
  condition,
  onChange,
  onRemove,
  label,
}: ConditionEditorProps) {
  const { switches, variables } = useProjectStore();
  const currentCondition = condition || { id: uuid(), type: "script" as const };

  return (
    <div className="rounded border border-border p-2 space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">
          {label || "Condition"}
        </label>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        )}
      </div>

      <select
        value={currentCondition.type}
        onChange={(e) =>
          onChange({
            ...currentCondition,
            type: e.target.value as Condition["type"],
          })
        }
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
      >
        <option value="switch">Switch</option>
        <option value="variable">Variable</option>
        <option value="script">Script</option>
      </select>

      {currentCondition.type === "switch" && (
        <div className="space-y-1">
          <SearchableSelect
            items={switches}
            value={currentCondition.switchId ?? null}
            onChange={(id) => onChange({ ...currentCondition, switchId: id })}
            placeholder="-- Select Switch --"
          />
          <select
            value={currentCondition.switchValue || "on"}
            onChange={(e) =>
              onChange({
                ...currentCondition,
                switchValue: e.target.value as "on" | "off",
              })
            }
            className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="on">ON</option>
            <option value="off">OFF</option>
          </select>
        </div>
      )}

      {currentCondition.type === "variable" && (
        <div className="space-y-1">
          <SearchableSelect
            items={variables}
            value={currentCondition.variableId ?? null}
            onChange={(id) => onChange({ ...currentCondition, variableId: id })}
            placeholder="-- Select Variable --"
          />
          <div className="flex gap-1">
            <select
              value={currentCondition.variableOperator || "=="}
              onChange={(e) =>
                onChange({
                  ...currentCondition,
                  variableOperator: e.target
                    .value as Condition["variableOperator"],
                })
              }
              className="w-20 rounded border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="==">=</option>
              <option value="!=">≠</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
            </select>
            <input
              type="number"
              value={currentCondition.variableCompareValue || ""}
              onChange={(e) => {
                const val = parseIntSafe(e.target.value);
                if (val !== undefined)
                  onChange({ ...currentCondition, variableCompareValue: val });
              }}
              className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
              placeholder="Value"
            />
          </div>
        </div>
      )}

      {currentCondition.type === "script" && (
        <DebouncedTextarea
          value={currentCondition.script || ""}
          onChange={(value) => onChange({ ...currentCondition, script: value })}
          className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs"
          rows={2}
          placeholder="JavaScript expression (returns boolean)"
        />
      )}
    </div>
  );
}

// ============================================
// Menu Properties
// ============================================
interface MenuPropertiesProps {
  node: InteractionNode;
  updateNode: (id: string, data: Partial<InteractionNode>) => void;
}

function MenuProperties({ node, updateNode }: MenuPropertiesProps) {
  // Safe: parent renders this component only when selectedNode.type === 'menu'
  const data = node.data as MenuNodeData;
  const choices = data.choices || [];
  const [expandedChoice, setExpandedChoice] = useState<string | null>(null);

  const addChoice = () => {
    const newChoice: MenuChoice = {
      id: uuid(),
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
                              hideCondition: { id: uuid(), type: "switch" },
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
                              disableCondition: { id: uuid(), type: "switch" },
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

// ============================================
// Action Properties
// ============================================
interface ActionPropertiesProps {
  node: InteractionNode;
  updateNode: (id: string, data: Partial<InteractionNode>) => void;
}

function ActionProperties({ node, updateNode }: ActionPropertiesProps) {
  // Safe: parent renders this component only when selectedNode.type === 'action'
  const data = node.data as ActionNodeData;
  const actions = data.actions || [];
  const { switches, variables } = useProjectStore();

  const addAction = () => {
    const newAction: Action = {
      id: uuid(),
      type: "script",
      script: "",
    };
    updateNode(node.id, {
      data: { ...data, actions: [...actions, newAction] },
    });
  };

  const updateAction = (index: number, updates: Partial<Action>) => {
    const newActions = actions.map((a, i) =>
      i === index ? { ...a, ...updates } : a,
    );
    updateNode(node.id, { data: { ...data, actions: newActions } });
  };

  const removeAction = (index: number) => {
    const newActions = actions.filter((_, i) => i !== index);
    updateNode(node.id, { data: { ...data, actions: newActions } });
  };

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs text-muted-foreground">Actions</label>
        <button
          onClick={addAction}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      <div className="space-y-3">
        {actions.map((action, index) => (
          <div key={action.id} className="rounded border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <select
                value={action.type}
                onChange={(e) =>
                  updateAction(index, {
                    type: e.target.value as Action["type"],
                  })
                }
                className="rounded border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="script">Script</option>
                <option value="set_variable">Set Variable</option>
                <option value="set_switch">Set Switch</option>
                <option value="common_event">Common Event</option>
                <option value="show_text">Show Text</option>
                <option value="plugin_command">Plugin Command</option>
              </select>
              <button
                onClick={() => removeAction(index)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {action.type === "script" && (
              <DebouncedTextarea
                value={action.script || ""}
                onChange={(value) => updateAction(index, { script: value })}
                className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs"
                rows={3}
                placeholder="JavaScript code..."
              />
            )}

            {action.type === "set_switch" && (
              <div className="space-y-2">
                <SearchableSelect
                  items={switches}
                  value={action.switchId ?? null}
                  onChange={(id) => updateAction(index, { switchId: id })}
                  placeholder="-- Select Switch --"
                />
                <select
                  value={action.switchValue || "on"}
                  onChange={(e) =>
                    updateAction(index, {
                      switchValue: e.target.value as "on" | "off" | "toggle",
                    })
                  }
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                  <option value="toggle">Toggle</option>
                </select>
              </div>
            )}

            {action.type === "set_variable" && (
              <div className="space-y-2">
                <SearchableSelect
                  items={variables}
                  value={action.variableId ?? null}
                  onChange={(id) => updateAction(index, { variableId: id })}
                  placeholder="-- Select Variable --"
                />
                <div className="flex gap-2">
                  <select
                    value={action.variableOperation || "set"}
                    onChange={(e) =>
                      updateAction(index, {
                        variableOperation: e.target
                          .value as Action["variableOperation"],
                      })
                    }
                    className="w-20 rounded border border-border bg-background px-2 py-1 text-sm"
                  >
                    <option value="set">=</option>
                    <option value="add">+=</option>
                    <option value="sub">-=</option>
                    <option value="mul">*=</option>
                    <option value="div">/=</option>
                    <option value="mod">%=</option>
                  </select>
                  <input
                    type="number"
                    value={action.variableValue || ""}
                    onChange={(e) => {
                      const val = parseIntSafe(e.target.value);
                      if (val !== undefined)
                        updateAction(index, { variableValue: val });
                    }}
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                    placeholder="Value"
                  />
                </div>
              </div>
            )}

            {action.type === "common_event" && (
              <input
                type="number"
                value={action.commonEventId || ""}
                onChange={(e) => {
                  const val = parseIntSafe(e.target.value);
                  if (val !== undefined)
                    updateAction(index, { commonEventId: val });
                }}
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                placeholder="Common Event ID"
              />
            )}

            {action.type === "show_text" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <DebouncedInput
                    value={action.faceName || ""}
                    onChange={(value) =>
                      updateAction(index, { faceName: value })
                    }
                    className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                    placeholder="Face Name"
                  />
                  <input
                    type="number"
                    value={action.faceIndex ?? ""}
                    onChange={(e) => {
                      const val = parseIntSafe(e.target.value);
                      if (val !== undefined)
                        updateAction(index, { faceIndex: val });
                    }}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-sm"
                    placeholder="Idx"
                    min={0}
                    max={7}
                  />
                </div>
                <DebouncedTextarea
                  value={action.text || ""}
                  onChange={(value) => updateAction(index, { text: value })}
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  rows={3}
                  placeholder="Message text..."
                />
              </div>
            )}

            {action.type === "plugin_command" && (
              <div className="space-y-2">
                <DebouncedInput
                  value={action.pluginName || ""}
                  onChange={(value) =>
                    updateAction(index, { pluginName: value })
                  }
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  placeholder="Plugin Name"
                />
                <DebouncedInput
                  value={action.commandName || ""}
                  onChange={(value) =>
                    updateAction(index, { commandName: value })
                  }
                  className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                  placeholder="Command Name"
                />
                <DebouncedTextarea
                  value={
                    action.commandArgs ? JSON.stringify(action.commandArgs) : ""
                  }
                  onChange={(value) => {
                    try {
                      const args = value ? JSON.parse(value) : undefined;
                      updateAction(index, { commandArgs: args });
                    } catch (e) {
                      if (!(e instanceof SyntaxError)) throw e;
                      // Invalid JSON — user still typing, ignore
                    }
                  }}
                  className="w-full rounded border border-border bg-background px-2 py-1 font-mono text-xs"
                  rows={2}
                  placeholder='{"arg1": "value1"}'
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Condition Properties
// ============================================
interface ConditionPropertiesProps {
  node: InteractionNode;
  updateNode: (id: string, data: Partial<InteractionNode>) => void;
}

function ConditionProperties({ node, updateNode }: ConditionPropertiesProps) {
  // Safe: parent renders this component only when selectedNode.type === 'condition'
  const data = node.data as ConditionNodeData;
  const condition = data.condition || { id: uuid(), type: "switch" as const };
  const { switches, variables } = useProjectStore();

  const updateCondition = (updates: Partial<Condition>) => {
    updateNode(node.id, {
      data: { ...data, condition: { ...condition, ...updates } },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Condition Type
        </label>
        <select
          value={condition.type}
          onChange={(e) =>
            updateCondition({ type: e.target.value as Condition["type"] })
          }
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="switch">Switch</option>
          <option value="variable">Variable</option>
          <option value="script">Script</option>
        </select>
      </div>

      {condition.type === "switch" && (
        <>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Switch
            </label>
            <SearchableSelect
              items={switches}
              value={condition.switchId ?? null}
              onChange={(id) => updateCondition({ switchId: id })}
              placeholder="-- Select Switch --"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Value
            </label>
            <select
              value={condition.switchValue || "on"}
              onChange={(e) =>
                updateCondition({ switchValue: e.target.value as "on" | "off" })
              }
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="on">ON</option>
              <option value="off">OFF</option>
            </select>
          </div>
        </>
      )}

      {condition.type === "variable" && (
        <>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Variable
            </label>
            <SearchableSelect
              items={variables}
              value={condition.variableId ?? null}
              onChange={(id) => updateCondition({ variableId: id })}
              placeholder="-- Select Variable --"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Operator
            </label>
            <select
              value={condition.variableOperator || "=="}
              onChange={(e) =>
                updateCondition({
                  variableOperator: e.target
                    .value as Condition["variableOperator"],
                })
              }
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="==">=</option>
              <option value="!=">≠</option>
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Compare Value
            </label>
            <input
              type="number"
              value={condition.variableCompareValue || ""}
              onChange={(e) => {
                const val = parseIntSafe(e.target.value);
                if (val !== undefined)
                  updateCondition({ variableCompareValue: val });
              }}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              placeholder="Value"
            />
          </div>
        </>
      )}

      {condition.type === "script" && (
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Script (returns boolean)
          </label>
          <DebouncedTextarea
            value={condition.script || ""}
            onChange={(value) => updateCondition({ script: value })}
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-xs"
            rows={4}
            placeholder="return $gameVariables.value(1) > 0;"
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Comment Properties
// ============================================
interface CommentPropertiesProps {
  node: InteractionNode;
  updateNode: (id: string, data: Partial<InteractionNode>) => void;
}

function CommentProperties({ node, updateNode }: CommentPropertiesProps) {
  const data = node.data as CommentNodeData;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Note Text
        </label>
        <DebouncedTextarea
          value={data.text || ""}
          onChange={(value) =>
            updateNode(node.id, { data: { ...data, text: value } })
          }
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          rows={6}
          placeholder="Add notes, reminders, or documentation..."
        />
      </div>
    </div>
  );
}
