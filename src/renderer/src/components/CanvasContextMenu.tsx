import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Play,
  List,
  Zap,
  GitBranch,
  Square,
  Group,
  MessageSquare,
  BookmarkPlus,
  VolumeX,
} from "lucide-react";
import type { InteractionNodeType } from "../types";
import { NODE_ACCENT_COLORS } from "../lib/nodeColors";

interface MenuPosition {
  x: number;
  y: number;
}

interface CanvasContextMenuProps {
  position: MenuPosition;
  onAddNode: (type: InteractionNodeType) => void;
  onClose: () => void;
  onSaveAsTemplate?: () => void;
  onToggleMute?: () => void;
  hasSelectedNodes?: boolean;
  isMuted?: boolean;
}

const menuItems: {
  type: InteractionNodeType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "start",
    label: "Start",
    icon: <Play className="h-4 w-4" />,
  },
  {
    type: "menu",
    label: "Choice Menu",
    icon: <List className="h-4 w-4" />,
  },
  {
    type: "action",
    label: "Action",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    type: "condition",
    label: "Condition",
    icon: <GitBranch className="h-4 w-4" />,
  },
  {
    type: "end",
    label: "End",
    icon: <Square className="h-4 w-4" />,
  },
  {
    type: "group",
    label: "Group",
    icon: <Group className="h-4 w-4" />,
  },
  {
    type: "comment",
    label: "Comment",
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

export function CanvasContextMenu({
  position,
  onAddNode,
  onClose,
  onSaveAsTemplate,
  onToggleMute,
  hasSelectedNodes,
  isMuted,
}: CanvasContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);
  const [clampedPosition, setClampedPosition] = useState(position);

  // Clamp menu position to stay within viewport (B8)
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) {
      setClampedPosition(position);
      return;
    }

    const parent = menu.parentElement;
    if (!parent) {
      setClampedPosition(position);
      return;
    }

    const menuRect = menu.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const maxX = parentRect.width - menuRect.width;
    const maxY = parentRect.height - menuRect.height;

    setClampedPosition({
      x: Math.max(0, Math.min(position.x, maxX)),
      y: Math.max(0, Math.min(position.y, maxY)),
    });
  }, [position]);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-[180px] rounded-xl border border-border bg-card/95 py-1 shadow-xl backdrop-blur-md"
      style={{ left: clampedPosition.x, top: clampedPosition.y }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Add Node
      </div>
      {menuItems.map((item) => (
        <button
          key={item.type}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          onClick={() => {
            onAddNode(item.type);
            onClose();
          }}
        >
          <span style={{ color: NODE_ACCENT_COLORS[item.type] }}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
      {hasSelectedNodes && onSaveAsTemplate && (
        <>
          <div className="my-1 border-t border-border" />
          <button
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            onClick={() => {
              onSaveAsTemplate();
              onClose();
            }}
          >
            <span className="text-muted-foreground">
              <BookmarkPlus className="h-4 w-4" />
            </span>
            <span>Save as Template</span>
          </button>
        </>
      )}
      {hasSelectedNodes && onToggleMute && (
        <>
          <div className="my-1 border-t border-border" />
          <button
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            onClick={onToggleMute}
          >
            <span className="text-muted-foreground">
              <VolumeX className="h-4 w-4" />
            </span>
            <span>{isMuted ? "Unmute Node" : "Mute Node"}</span>
            <span className="ml-auto text-xs text-muted-foreground">M</span>
          </button>
        </>
      )}
    </div>
  );
}
