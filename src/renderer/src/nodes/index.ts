import { StartNode } from "./StartNode";
import { MenuNode } from "./MenuNode";
import { ActionNode } from "./ActionNode";
import { ConditionNode } from "./ConditionNode";
import { EndNode } from "./EndNode";

export const nodeTypes = {
  start: StartNode,
  menu: MenuNode,
  action: ActionNode,
  condition: ConditionNode,
  end: EndNode,
};

export { StartNode, MenuNode, ActionNode, ConditionNode, EndNode };
