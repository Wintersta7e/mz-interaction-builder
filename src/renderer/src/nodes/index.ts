import { StartNode } from "./StartNode";
import { MenuNode } from "./MenuNode";
import { ActionNode } from "./ActionNode";
import { ConditionNode } from "./ConditionNode";
import { EndNode } from "./EndNode";
import { GroupNode } from "./GroupNode";

export const nodeTypes = {
  start: StartNode,
  menu: MenuNode,
  action: ActionNode,
  condition: ConditionNode,
  end: EndNode,
  group: GroupNode,
};

export { StartNode, MenuNode, ActionNode, ConditionNode, EndNode, GroupNode };
