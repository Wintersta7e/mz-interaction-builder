import { memo } from "react";
import { Play } from "lucide-react";
import { BaseNode } from "./BaseNode";
import { useDocumentStore } from "../stores";
import type { StartNodeData } from "../types";

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
      accentColor="#34d399"
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
