import type { InteractionNode, ConditionNodeData } from "../../types";
import { ConditionEditor } from "../ConditionEditor";

export interface ConditionPropertiesProps {
  node: InteractionNode;
  updateNode: (id: string, data: Partial<InteractionNode>) => void;
}

export function ConditionProperties({
  node,
  updateNode,
}: ConditionPropertiesProps) {
  const data = node.data as ConditionNodeData;
  return (
    <ConditionEditor
      condition={data.condition}
      onChange={(condition) =>
        updateNode(node.id, { data: { ...data, condition } })
      }
    />
  );
}
