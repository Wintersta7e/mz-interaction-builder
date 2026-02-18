import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import type { InteractionNode } from "../types";

export const GROUP_COLORS: Record<string, string> = {
  blue: "hsl(210 80% 60%)",
  green: "hsl(150 60% 50%)",
  purple: "hsl(270 60% 60%)",
  amber: "hsl(40 90% 55%)",
  rose: "hsl(350 70% 60%)",
  gray: "hsl(220 10% 50%)",
};

function GroupNodeComponent({ data, selected }: NodeProps<InteractionNode>) {
  if (data.type !== "group") return null;

  const accentColor = GROUP_COLORS[data.color] || GROUP_COLORS.blue;

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        lineClassName="!border-primary"
        handleClassName="!bg-primary !border-primary !w-2 !h-2"
      />
      <div
        className="h-full w-full rounded-lg border-2 border-dashed"
        style={{
          borderColor: `${accentColor}40`,
          backgroundColor: `${accentColor}08`,
        }}
      >
        <div
          className="flex items-center gap-2 rounded-t-lg px-3 py-1.5"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-xs font-medium" style={{ color: accentColor }}>
            {data.label}
          </span>
        </div>
      </div>
    </>
  );
}

export const GroupNode = memo(GroupNodeComponent);
