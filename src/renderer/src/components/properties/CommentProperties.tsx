import type { InteractionNode, CommentNodeData } from "../../types";
import { DebouncedTextarea } from "../DebouncedInputs";

export interface CommentPropertiesProps {
  node: InteractionNode;
  updateNode: (id: string, data: Partial<InteractionNode>) => void;
}

export function CommentProperties({
  node,
  updateNode,
}: CommentPropertiesProps) {
  const data = node.data as CommentNodeData;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">
          Note Text
        </label>
        <DebouncedTextarea
          value={data.text || ""}
          onChange={(value) =>
            updateNode(node.id, { data: { ...data, text: value } })
          }
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          rows={6}
          placeholder="Add notes, reminders, or documentation..."
        />
      </div>
    </div>
  );
}
