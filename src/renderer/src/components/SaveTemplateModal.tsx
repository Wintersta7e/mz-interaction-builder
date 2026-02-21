import { useState, useMemo, useEffect } from "react";
import { X } from "lucide-react";
import { v4 as uuid } from "uuid";
import { useTemplateStore } from "../stores/templateStore";
import { normalizePositions } from "../lib/templateUtils";
import type { InteractionNode, InteractionEdge, NodeTemplate } from "../types";

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: InteractionNode[];
  edges: InteractionEdge[];
}

export function SaveTemplateModal({
  isOpen,
  onClose,
  nodes,
  edges,
}: SaveTemplateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const { saveTemplate, templates } = useTemplateStore();

  // Reset form state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setDescription("");
      setCategory("");
    }
  }, [isOpen]);

  const existingCategories = useMemo(() => {
    const cats = new Set(templates.map((t) => t.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [templates]);

  // Count node types for preview
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      const t = node.type || "unknown";
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [nodes]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;

    // Filter edges to only include internal ones
    const nodeIds = new Set(nodes.map((n) => n.id));
    const internalEdges = edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
    );

    const template: NodeTemplate = {
      id: uuid(),
      name: name.trim(),
      description: description.trim(),
      category: category.trim(),
      createdAt: Date.now(),
      nodes: normalizePositions(nodes),
      edges: internalEdges,
    };

    const result = await saveTemplate(template);
    if (result.success) {
      onClose();
    } else {
      await window.api.dialog.message({
        type: "error",
        title: "Template Error",
        message: `Failed to save template: ${result.error}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Save as Template</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="mb-4 rounded-lg border border-border bg-background/50 p-3">
          <div className="text-xs text-muted-foreground">
            {nodes.length} node{nodes.length !== 1 ? "s" : ""}
            {Object.entries(typeCounts).map(([type, count]) => (
              <span key={type} className="ml-2">
                {count} {type}
              </span>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="e.g. Yes/No Branch"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="e.g. Dialogue, Combat"
              list="template-categories"
            />
            {existingCategories.length > 0 && (
              <datalist id="template-categories">
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
