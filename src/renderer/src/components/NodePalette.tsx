import { useState } from "react";
import {
  Play,
  List,
  Zap,
  GitBranch,
  Square,
  Group,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { InteractionNodeType, NodeTemplate } from "../types";
import { useTemplateStore } from "../stores/templateStore";

interface NodeTypeConfig {
  type: InteractionNodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const nodeTypes: NodeTypeConfig[] = [
  {
    type: "start",
    label: "Start",
    icon: <Play className="h-4 w-4" />,
    color: "#34d399",
    description: "Entry point",
  },
  {
    type: "menu",
    label: "Choice Menu",
    icon: <List className="h-4 w-4" />,
    color: "#a78bfa",
    description: "Show choices",
  },
  {
    type: "action",
    label: "Action",
    icon: <Zap className="h-4 w-4" />,
    color: "#38bdf8",
    description: "Execute actions",
  },
  {
    type: "condition",
    label: "Condition",
    icon: <GitBranch className="h-4 w-4" />,
    color: "#fbbf24",
    description: "Branch logic",
  },
  {
    type: "end",
    label: "End",
    icon: <Square className="h-4 w-4" />,
    color: "#fb7185",
    description: "Exit point",
  },
  {
    type: "group",
    label: "Group",
    icon: <Group className="h-4 w-4" />,
    color: "#60a5fa",
    description: "Visual container",
  },
  {
    type: "comment",
    label: "Comment",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "#f59e0b",
    description: "Annotation note",
  },
];

interface NodePaletteProps {
  onDragStart: (type: InteractionNodeType) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    type: InteractionNodeType,
  ) => {
    e.dataTransfer.setData("application/interaction-node", type);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(type);
  };

  return (
    <div className="p-4">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        NODES
      </h2>
      <div className="space-y-2">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => handleDragStart(e, node.type)}
            className="flex cursor-grab items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted active:cursor-grabbing"
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded text-white"
              style={{ backgroundColor: node.color }}
            >
              {node.icon}
            </div>
            <div>
              <div className="text-sm font-medium">{node.label}</div>
              <div className="text-xs text-muted-foreground">
                {node.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          HELP
        </h2>
        <p className="text-xs text-muted-foreground">
          Drag nodes from here onto the canvas to create your interaction flow.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Connect nodes by dragging from output handles (right) to input handles
          (left).
        </p>
      </div>

      <TemplatePalette />
    </div>
  );
}

function TemplatePalette() {
  const { templates, isLoaded, deleteTemplate } = useTemplateStore();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );

  if (!isLoaded || templates.length === 0) return null;

  // Group templates by category
  const grouped = new Map<string, NodeTemplate[]>();
  for (const template of templates) {
    const cat = template.category || "General";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(template);
  }

  // Sort categories alphabetically, but "General" last
  const categories = Array.from(grouped.keys()).sort((a, b) => {
    if (a === "General") return 1;
    if (b === "General") return -1;
    return a.localeCompare(b);
  });

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, templateId: string) => {
    e.dataTransfer.setData("application/interaction-template", templateId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDelete = async (e: React.MouseEvent, template: NodeTemplate) => {
    e.stopPropagation();
    e.preventDefault();
    const result = await window.api.dialog.message({
      type: "question",
      title: "Delete Template",
      message: `Delete template "${template.name}"? This cannot be undone.`,
      buttons: ["Delete", "Cancel"],
    });
    if (result === 0) {
      await deleteTemplate(template.id);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        TEMPLATES
      </h2>
      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat}>
            <button
              onClick={() => toggleCategory(cat)}
              className="flex w-full items-center gap-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {collapsedCategories.has(cat) ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {cat}
            </button>
            {!collapsedCategories.has(cat) && (
              <div className="ml-1 space-y-1">
                {grouped.get(cat)!.map((template) => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, template.id)}
                    className="group flex cursor-grab items-center gap-2 rounded-lg border border-border p-2 transition-colors hover:bg-muted active:cursor-grabbing"
                    title={template.description || template.name}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {template.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {template.nodes.length} node
                        {template.nodes.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, template)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
