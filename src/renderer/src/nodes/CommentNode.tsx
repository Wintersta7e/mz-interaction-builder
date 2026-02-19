import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import type { InteractionNode } from "../types";

function CommentNodeComponent({ data, selected }: NodeProps<InteractionNode>) {
  if (data.type !== "comment") return null;

  return (
    <>
      <NodeResizer
        minWidth={150}
        minHeight={80}
        isVisible={selected}
        lineClassName="!border-amber-400"
        handleClassName="!bg-amber-400 !border-amber-400 !w-2 !h-2"
      />
      <div
        className="flex h-full w-full flex-col rounded-lg border-2 border-dashed"
        style={{
          borderColor: selected ? "hsl(40 90% 55%)" : "hsl(40 90% 55% / 0.4)",
          backgroundColor: "hsl(40 90% 55% / 0.08)",
        }}
      >
        <div className="flex items-center gap-1.5 px-3 py-1.5">
          <MessageSquare
            className="h-3.5 w-3.5 flex-shrink-0"
            style={{ color: "hsl(40 90% 55%)" }}
          />
          <span
            className="text-xs font-medium truncate"
            style={{ color: "hsl(40 90% 55%)" }}
          >
            {data.label || "Note"}
          </span>
        </div>
        {data.text && (
          <div className="flex-1 overflow-hidden px-3 pb-2">
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground line-clamp-6">
              {data.text}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export const CommentNode = memo(CommentNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data;
});
