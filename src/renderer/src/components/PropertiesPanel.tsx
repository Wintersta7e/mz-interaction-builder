import { useDocumentStore, useUIStore } from "../stores";
import type { GroupColor } from "../types";
import { Save } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "../lib/utils";
import { SaveTemplateModal } from "./SaveTemplateModal";
import { DebouncedInput } from "./DebouncedInputs";
import { GROUP_COLORS } from "../nodes/GroupNode";
import { MenuProperties } from "./properties/MenuProperties";
import { ActionProperties } from "./properties/ActionProperties";
import { ConditionProperties } from "./properties/ConditionProperties";
import { CommentProperties } from "./properties/CommentProperties";

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

      {/* Mute toggle (Phase 5E) — only for mutable node types */}
      {selectedNode.type !== "start" &&
        selectedNode.type !== "group" &&
        selectedNode.type !== "comment" && (
          <div className="mb-4 flex items-center justify-between">
            <label className="text-xs text-muted-foreground">
              Muted (skip in export)
            </label>
            <button
              onClick={() =>
                updateNode(selectedNode.id, {
                  data: {
                    ...selectedNode.data,
                    muted: !selectedNode.data.muted,
                  },
                })
              }
              className={cn(
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                selectedNode.data.muted
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {selectedNode.data.muted ? "Muted" : "Active"}
            </button>
          </div>
        )}

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
