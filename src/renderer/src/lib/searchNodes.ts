import type {
  InteractionNode,
  InteractionNodeData,
  MenuNodeData,
  ActionNodeData,
  ConditionNodeData
} from '../types'

/** Extract all searchable text from a node as a single lowercase string */
export function getSearchableText(node: InteractionNode): string {
  const parts: string[] = [node.data.label]
  const data = node.data as InteractionNodeData

  switch (data.type) {
    case 'menu': {
      const menuData = data as MenuNodeData
      for (const choice of menuData.choices) {
        parts.push(choice.text)
      }
      break
    }
    case 'action': {
      const actionData = data as ActionNodeData
      for (const action of actionData.actions) {
        if (action.script) parts.push(action.script)
        if (action.text) parts.push(action.text)
      }
      break
    }
    case 'condition': {
      const condData = data as ConditionNodeData
      if (condData.condition.script) parts.push(condData.condition.script)
      break
    }
  }

  return parts.join(' ')
}

/** Return array of node IDs matching the search term (case-insensitive substring) */
export function searchNodes(nodes: InteractionNode[], term: string): string[] {
  if (!term.trim()) return []
  const lower = term.toLowerCase()
  return nodes
    .filter((node) => getSearchableText(node).toLowerCase().includes(lower))
    .map((node) => node.id)
}
