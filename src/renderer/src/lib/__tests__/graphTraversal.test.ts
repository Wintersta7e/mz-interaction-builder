import { describe, it, expect } from 'vitest'
import {
  findUpstreamNodes,
  findDownstreamNodes,
  findShortestPath
} from '../graphTraversal'
import type { InteractionNode, InteractionEdge } from '../../types'

// Shared test graph:
//   start -> menu -> action -> end
//                 \-> condition -> end2
const nodes: InteractionNode[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 0, y: 0 },
    data: { type: 'start', label: 'Start' }
  },
  {
    id: 'menu',
    type: 'menu',
    position: { x: 200, y: 0 },
    data: {
      type: 'menu',
      label: 'Menu',
      choices: [],
      cancelType: 'disallow',
      windowBackground: 0,
      windowPosition: 2
    }
  },
  {
    id: 'action',
    type: 'action',
    position: { x: 400, y: 0 },
    data: { type: 'action', label: 'Action', actions: [] }
  },
  {
    id: 'condition',
    type: 'condition',
    position: { x: 400, y: 100 },
    data: { type: 'condition', label: 'Condition', condition: { id: 'c1', type: 'switch' } }
  },
  {
    id: 'end',
    type: 'end',
    position: { x: 600, y: 0 },
    data: { type: 'end', label: 'End' }
  },
  {
    id: 'end2',
    type: 'end',
    position: { x: 600, y: 100 },
    data: { type: 'end', label: 'End 2' }
  }
]

const edges: InteractionEdge[] = [
  { id: 'e1', source: 'start', target: 'menu' },
  { id: 'e2', source: 'menu', target: 'action' },
  { id: 'e3', source: 'menu', target: 'condition' },
  { id: 'e4', source: 'action', target: 'end' },
  { id: 'e5', source: 'condition', target: 'end2' }
]

describe('findUpstreamNodes', () => {
  it('returns just the node for start node (no upstream edges)', () => {
    const result = findUpstreamNodes('start', nodes, edges)
    expect(result.nodeIds).toEqual(new Set(['start']))
    expect(result.edgeIds).toEqual(new Set())
  })

  it('finds upstream path from end', () => {
    const result = findUpstreamNodes('end', nodes, edges)
    expect(result.nodeIds).toEqual(new Set(['start', 'menu', 'action', 'end']))
    expect(result.edgeIds).toEqual(new Set(['e1', 'e2', 'e4']))
  })

  it('finds upstream path from condition', () => {
    const result = findUpstreamNodes('condition', nodes, edges)
    expect(result.nodeIds).toEqual(new Set(['start', 'menu', 'condition']))
    expect(result.edgeIds).toEqual(new Set(['e1', 'e3']))
  })

  it('returns just the node for an unconnected node', () => {
    const isolated: InteractionNode = {
      id: 'solo',
      type: 'end',
      position: { x: 0, y: 0 },
      data: { type: 'end', label: 'Solo' }
    }
    const result = findUpstreamNodes('solo', [...nodes, isolated], edges)
    expect(result.nodeIds).toEqual(new Set(['solo']))
    expect(result.edgeIds).toEqual(new Set())
  })
})

describe('findDownstreamNodes', () => {
  it('returns just the node for end node (no downstream edges)', () => {
    const result = findDownstreamNodes('end', nodes, edges)
    expect(result.nodeIds).toEqual(new Set(['end']))
    expect(result.edgeIds).toEqual(new Set())
  })

  it('finds all downstream from start', () => {
    const result = findDownstreamNodes('start', nodes, edges)
    expect(result.nodeIds).toEqual(
      new Set(['start', 'menu', 'action', 'condition', 'end', 'end2'])
    )
    expect(result.edgeIds).toEqual(new Set(['e1', 'e2', 'e3', 'e4', 'e5']))
  })

  it('finds downstream from menu', () => {
    const result = findDownstreamNodes('menu', nodes, edges)
    expect(result.nodeIds).toEqual(new Set(['menu', 'action', 'condition', 'end', 'end2']))
    expect(result.edgeIds).toEqual(new Set(['e2', 'e3', 'e4', 'e5']))
  })
})

describe('findShortestPath', () => {
  it('returns null when no path exists', () => {
    const result = findShortestPath('end', 'start', nodes, edges)
    expect(result).toBeNull()
  })

  it('returns single node when source equals target', () => {
    const result = findShortestPath('start', 'start', nodes, edges)
    expect(result).toEqual(['start'])
  })

  it('finds shortest path start -> end', () => {
    const result = findShortestPath('start', 'end', nodes, edges)
    expect(result).toEqual(['start', 'menu', 'action', 'end'])
  })

  it('finds shortest path start -> end2', () => {
    const result = findShortestPath('start', 'end2', nodes, edges)
    expect(result).toEqual(['start', 'menu', 'condition', 'end2'])
  })

  it('finds shortest path start -> menu', () => {
    const result = findShortestPath('start', 'menu', nodes, edges)
    expect(result).toEqual(['start', 'menu'])
  })
})
