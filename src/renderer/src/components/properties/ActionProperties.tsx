import { Plus, Trash2 } from "lucide-react";
import { generateId, useProjectStore } from "../../stores";
import { parseIntSafe } from "../../lib/parseIntSafe";
import type { InteractionNode, ActionNodeData, Action } from "../../types";
import { DebouncedInput, DebouncedTextarea } from "../DebouncedInputs";
import { SearchableSelect } from "../SearchableSelect";

export interface ActionPropertiesProps {
  node: InteractionNode;
  updateNode: (id: string, data: Partial<InteractionNode>) => void;
}

export function ActionProperties({ node, updateNode }: ActionPropertiesProps) {
  // Safe: parent renders this component only when selectedNode.type === 'action'
  const data = node.data as ActionNodeData;
  const actions = data.actions || [];
  const { switches, variables } = useProjectStore();

  const addAction = () => {
    const newAction: Action = {
      id: generateId("action"),
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
