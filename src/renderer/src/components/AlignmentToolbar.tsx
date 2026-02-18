import {
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
} from "lucide-react";
import type { AlignMode, DistributeMode } from "../lib/alignNodes";
import type { InteractionNode } from "../types";

interface AlignmentToolbarProps {
  selectedNodes: InteractionNode[];
  onAlign: (mode: AlignMode) => void;
  onDistribute: (mode: DistributeMode) => void;
}

const alignButtons: { mode: AlignMode; icon: typeof AlignHorizontalJustifyStart; title: string }[] = [
  { mode: "left", icon: AlignHorizontalJustifyStart, title: "Align Left (Alt+L)" },
  { mode: "center", icon: AlignHorizontalJustifyCenter, title: "Align Center (Alt+C)" },
  { mode: "right", icon: AlignHorizontalJustifyEnd, title: "Align Right (Alt+R)" },
  { mode: "top", icon: AlignVerticalJustifyStart, title: "Align Top (Alt+T)" },
  { mode: "middle", icon: AlignVerticalJustifyCenter, title: "Align Middle (Alt+M)" },
  { mode: "bottom", icon: AlignVerticalJustifyEnd, title: "Align Bottom (Alt+B)" },
];

const distributeButtons: { mode: DistributeMode; icon: typeof AlignHorizontalSpaceAround; title: string }[] = [
  { mode: "horizontal", icon: AlignHorizontalSpaceAround, title: "Distribute Horizontally" },
  { mode: "vertical", icon: AlignVerticalSpaceAround, title: "Distribute Vertically" },
];

export function AlignmentToolbar({
  selectedNodes,
  onAlign,
  onDistribute,
}: AlignmentToolbarProps): React.JSX.Element | null {
  if (selectedNodes.length < 2) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-0.5 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-lg px-1.5 py-1">
        {alignButtons.map(({ mode, icon: Icon, title }) => (
          <button
            key={mode}
            type="button"
            title={title}
            className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onAlign(mode)}
          >
            <Icon size={16} />
          </button>
        ))}

        {/* Separator between align and distribute */}
        <div className="mx-1 h-5 w-px bg-border" />

        {distributeButtons.map(({ mode, icon: Icon, title }) => (
          <button
            key={mode}
            type="button"
            title={title}
            className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onDistribute(mode)}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}
