import type { InteractionNode, InteractionEdge } from '../types'

interface TraversalResult {
  nodeIds: Set<string>
  edgeIds: Set<string>
}

/** BFS backward from nodeId, collecting all upstream nodes and edges */
export function findUpstreamNodes(
  nodeId: string,
  _nodes: InteractionNode[],
  edges: InteractionEdge[]
): TraversalResult {
  const nodeIds = new Set<string>([nodeId])
  const edgeIds = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of edges) {
      if (edge.target === current && !nodeIds.has(edge.source)) {
        nodeIds.add(edge.source)
        edgeIds.add(edge.id)
        queue.push(edge.source)
      }
    }
  }

  return { nodeIds, edgeIds }
}

/** BFS forward from nodeId, collecting all downstream nodes and edges */
export function findDownstreamNodes(
  nodeId: string,
  _nodes: InteractionNode[],
  edges: InteractionEdge[]
): TraversalResult {
  const nodeIds = new Set<string>([nodeId])
  const edgeIds = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of edges) {
      if (edge.source === current && !nodeIds.has(edge.target)) {
        nodeIds.add(edge.target)
        edgeIds.add(edge.id)
        queue.push(edge.target)
      }
    }
  }

  return { nodeIds, edgeIds }
}

/** BFS from source to target, returns ordered array of node IDs or null if unreachable */
export function findShortestPath(
  sourceId: string,
  targetId: string,
  _nodes: InteractionNode[],
  edges: InteractionEdge[]
): string[] | null {
  if (sourceId === targetId) return [sourceId]

  const visited = new Set<string>([sourceId])
  const parent = new Map<string, string>()
  const queue = [sourceId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        visited.add(edge.target)
        parent.set(edge.target, current)
        if (edge.target === targetId) {
          const path: string[] = [targetId]
          let node = targetId
          while (parent.has(node)) {
            node = parent.get(node)!
            path.unshift(node)
          }
          return path
        }
        queue.push(edge.target)
      }
    }
  }

  return null
}
