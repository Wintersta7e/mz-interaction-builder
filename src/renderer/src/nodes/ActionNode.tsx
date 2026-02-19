import { memo } from "react";
import { Zap } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useDocumentStore } from "../stores";
import type { Action, ActionNodeData } from "../types";

interface ActionNodeProps {
  id: string;
  data: ActionNodeData;
  selected?: boolean;
}

const OP_SYMBOLS: Record<string, string> = {
  set: "=",
  add: "+=",
  sub: "-=",
  mul: "*=",
  div: "/=",
  mod: "%=",
};

function getActionSummary(action: Action): string {
  switch (action.type) {
    case "set_switch": {
      const id = action.switchId != null ? `#${action.switchId}` : "?";
      const val = (action.switchValue ?? "on").toUpperCase();
      return `Switch ${id} → ${val}`;
    }
    case "set_variable": {
      const id = action.variableId != null ? `#${action.variableId}` : "?";
      const op = OP_SYMBOLS[action.variableOperation ?? "set"] ?? "=";
      const val = action.variableValue ?? 0;
      return `Var ${id} ${op} ${val}`;
    }
    case "common_event":
      return `Common Event #${action.commonEventId ?? "?"}`;
    case "show_text":
      return action.text
        ? `"${action.text.slice(0, 24)}${action.text.length > 24 ? "..." : ""}"`
        : "Show Text";
    case "plugin_command":
      return action.pluginName && action.commandName
        ? `${action.pluginName}:${action.commandName}`
        : "Plugin Command";
    case "script":
      return action.script
        ? action.script.slice(0, 28) + (action.script.length > 28 ? "..." : "")
        : "Script";
    default:
      return "Action";
  }
}

function ActionNodeComponent({ id, data, selected }: ActionNodeProps) {
  const bookmarked = useDocumentStore((s) =>
    (s.document.bookmarks ?? []).includes(id),
  );
  const actions = data.actions || [];

  return (
    <BaseNode
      accentColor="#38bdf8"
      icon={<Zap className="h-4 w-4" />}
      label={data.label || "Action"}
      selected={selected}
      bookmarked={bookmarked}
      hasInput={true}
      hasOutput={true}
    >
      {actions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No actions defined</p>
      ) : (
        <div className="space-y-1">
          {actions.slice(0, 3).map((action) => (
            <div
              key={action.id}
              className="truncate rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground"
            >
              {getActionSummary(action)}
            </div>
          ))}
          {actions.length > 3 && (
            <p className="text-[11px] text-muted-foreground">
              +{actions.length - 3} more
            </p>
          )}
        </div>
      )}
    </BaseNode>
  );
}

export const ActionNode = memo(ActionNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data;
});
