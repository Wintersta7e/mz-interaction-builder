import { memo } from "react";
import { Square } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useDocumentStore } from "../stores";
import type { EndNodeData } from "../types";
import { NODE_ACCENT_COLORS } from "../lib/nodeColors";

interface EndNodeProps {
  id: string;
  data: EndNodeData;
  selected?: boolean;
}

function EndNodeComponent({ id, data, selected }: EndNodeProps) {
  const bookmarked = useDocumentStore((s) =>
    (s.document.bookmarks ?? []).includes(id),
  );

  return (
    <BaseNode
      accentColor={NODE_ACCENT_COLORS.end}
      icon={<Square className="h-4 w-4" />}
      label={data.label || "End"}
      selected={selected}
      bookmarked={bookmarked}
      muted={!!data.muted}
      hasInput={true}
      hasOutput={false}
    >
      <p className="text-xs text-muted-foreground">Exit the interaction</p>
    </BaseNode>
  );
}

export const EndNode = memo(EndNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data;
});
