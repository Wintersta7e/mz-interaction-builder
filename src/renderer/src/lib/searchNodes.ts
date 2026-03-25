import type { InteractionNode } from "../types";

/** Extract all searchable text from a node as a single lowercase string */
export function getSearchableText(node: InteractionNode): string {
  const parts: string[] = [node.data.label];
  const data = node.data;

  switch (data.type) {
    case "menu": {
      const menuData = data;
      for (const choice of menuData.choices) {
        parts.push(choice.text);
      }
      break;
    }
    case "action": {
      const actionData = data;
      for (const action of actionData.actions) {
        if (action.script) parts.push(action.script);
        if (action.text) parts.push(action.text);
      }
      break;
    }
    case "condition": {
      const condData = data;
      if (condData.condition.script) parts.push(condData.condition.script);
      break;
    }
    case "comment": {
      const commentData = data;
      if (commentData.text) parts.push(commentData.text);
      break;
    }
  }

  return parts.join(" ");
}

/** Return array of node IDs matching the search term (case-insensitive substring) */
export function searchNodes(nodes: InteractionNode[], term: string): string[] {
  if (!term.trim()) return [];
  const lower = term.toLowerCase();
  return nodes
    .filter((node) => getSearchableText(node).toLowerCase().includes(lower))
    .map((node) => node.id);
}
