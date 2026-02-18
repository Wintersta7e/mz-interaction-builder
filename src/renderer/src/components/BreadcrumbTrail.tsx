import { useMemo, useCallback } from 'react'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { useDocumentStore, useUIStore } from '../stores'
import { findShortestPath } from '../lib/graphTraversal'

interface BreadcrumbTrailProps {
  onNavigateToNode: (nodeId: string) => void
}

export function BreadcrumbTrail({ onNavigateToNode }: BreadcrumbTrailProps) {
  const nodes = useDocumentStore((s) => s.document.nodes)
  const edges = useDocumentStore((s) => s.document.edges)
  const selectedNodeId = useUIStore((s) => s.selectedNodeId)

  const path = useMemo(() => {
    if (!selectedNodeId) return null
    const startNode = nodes.find((n) => n.type === 'start')
    if (!startNode) return null
    if (startNode.id === selectedNodeId) return [startNode.id]
    return findShortestPath(startNode.id, selectedNodeId, nodes, edges)
  }, [selectedNodeId, nodes, edges])

  const handleClick = useCallback(
    (nodeId: string) => {
      onNavigateToNode(nodeId)
    },
    [onNavigateToNode]
  )

  if (!path || path.length === 0) return null

  // Truncate: if >5 nodes, show first 2 + ... + last 2
  const MAX_VISIBLE = 5
  const truncated = path.length > MAX_VISIBLE
  const visiblePath = truncated
    ? [...path.slice(0, 2), '...', ...path.slice(-2)]
    : path

  return (
    <div className="flex items-center gap-1 border-b border-border bg-card/50 px-4 py-1.5 text-xs">
      {visiblePath.map((item, i) => {
        if (item === '...') {
          return (
            <span key="ellipsis" className="flex items-center gap-1 text-muted-foreground">
              <ChevronRight className="h-3 w-3" />
              <MoreHorizontal className="h-3 w-3" />
            </span>
          )
        }

        const node = nodes.find((n) => n.id === item)
        if (!node) return null
        const isLast = i === visiblePath.length - 1

        return (
          <span key={item} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <button
              onClick={() => handleClick(item)}
              className={`rounded px-1.5 py-0.5 transition-colors hover:bg-muted ${
                isLast ? 'font-medium text-foreground' : 'text-muted-foreground'
              }`}
            >
              {node.data.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}
