import { memo } from "react";
import { Play } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useDocumentStore } from "../stores";
import type { StartNodeData } from "../types";
import { NODE_ACCENT_COLORS } from "../lib/nodeColors";

interface StartNodeProps {
  id: string;
  data: StartNodeData;
  selected?: boolean;
}

function StartNodeComponent({ id, data, selected }: StartNodeProps) {
  const bookmarked = useDocumentStore((s) =>
    (s.document.bookmarks ?? []).includes(id),
  );

  return (
    <BaseNode
      accentColor={NODE_ACCENT_COLORS.start}
      icon={<Play className="h-4 w-4" />}
      label={data.label || "Start"}
      selected={selected}
      bookmarked={bookmarked}
      muted={!!data.muted}
      hasInput={false}
      hasOutput={true}
    >
      <p className="text-xs text-muted-foreground">
        Entry point for the interaction
      </p>
    </BaseNode>
  );
}

export const StartNode = memo(StartNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data;
});
