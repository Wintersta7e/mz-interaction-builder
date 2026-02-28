import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { usePreviewStore, useProjectStore } from "../../stores";

export function VariableInspector(): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(true);
  const engine = usePreviewStore((s) => s.engine);
  const previewState = usePreviewStore((s) => s.previewState);
  const projectPath = useProjectStore((s) => s.projectPath);
  const projectVariables = useProjectStore((s) => s.variables);
  const projectSwitches = useProjectStore((s) => s.switches);

  // Compute referenced IDs once when engine changes
  const referencedIds = useMemo(() => {
    if (!engine) return { variableIds: [], switchIds: [] };
    return engine.getReferencedIds();
  }, [engine]);

  const { variableIds, switchIds } = referencedIds;

  const handleResetAll = useCallback(() => {
    const store = usePreviewStore.getState();
    for (const id of variableIds) {
      store.setVariable(id, 0);
    }
    for (const id of switchIds) {
      store.setSwitch(id, false);
    }
  }, [variableIds, switchIds]);

  // Nothing to show
  if (variableIds.length === 0 && switchIds.length === 0) {
    return null;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        className="flex items-center gap-1.5 w-full px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        Variables
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Variable rows */}
          {variableIds.map((id) => {
            const name = projectPath
              ? projectVariables.find((v) => v.id === id)?.name
              : undefined;
            const value = previewState?.variables.get(id) ?? 0;

            return (
              <div key={`var-${id}`} className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground flex-1 truncate">
                  Var #{id}
                  {name && (
                    <span className="text-muted-foreground/70"> ({name})</span>
                  )}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) =>
                    usePreviewStore
                      .getState()
                      .setVariable(id, Number(e.target.value))
                  }
                  className="w-20 px-2 py-0.5 text-xs rounded border border-border bg-slate-800 text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            );
          })}

          {/* Switch rows */}
          {switchIds.map((id) => {
            const name = projectPath
              ? projectSwitches.find((s) => s.id === id)?.name
              : undefined;
            const value = previewState?.switches.get(id) ?? false;

            return (
              <div key={`sw-${id}`} className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground flex-1 truncate">
                  Sw #{id}
                  {name && (
                    <span className="text-muted-foreground/70"> ({name})</span>
                  )}
                </label>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    usePreviewStore.getState().setSwitch(id, e.target.checked)
                  }
                  className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                />
              </div>
            );
          })}

          {/* Reset All button */}
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1 mt-1 px-2 py-1 text-xs rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset All
          </button>
        </div>
      )}
    </div>
  );
}
