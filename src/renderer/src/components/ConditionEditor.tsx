import { useProjectStore, generateId } from "../stores";
import { SearchableSelect } from "./SearchableSelect";
import { DebouncedTextarea } from "./DebouncedInputs";
import { parseIntSafe } from "../lib/parseIntSafe";
import type { Condition } from "../types";

export interface ConditionEditorProps {
  condition: Condition | undefined;
  onChange: (condition: Condition) => void;
  onRemove?: () => void;
  label?: string;
  scriptRows?: number;
}

export function ConditionEditor({
  condition,
  onChange,
  onRemove,
  label,
  scriptRows = 2,
}: ConditionEditorProps) {
  const { switches, variables } = useProjectStore();
  const currentCondition = condition || {
    id: generateId("cond"),
    type: "script" as const,
  };

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
          rows={scriptRows}
          placeholder="JavaScript expression (returns boolean)"
        />
      )}
    </div>
  );
}
