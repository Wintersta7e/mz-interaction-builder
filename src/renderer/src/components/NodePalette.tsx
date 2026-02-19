import {
  Play,
  List,
  Zap,
  GitBranch,
  Square,
  Group,
  MessageSquare,
} from "lucide-react";
import type { InteractionNodeType } from "../types";

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
    </div>
  );
}
