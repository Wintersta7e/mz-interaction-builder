import { Bookmark, ChevronDown, ChevronRight, X } from 'lucide-react'
import { Play, List, Zap, GitBranch, Square } from 'lucide-react'
import { useDocumentStore, useUIStore } from '../stores'
import type { InteractionNodeType } from '../types'

const nodeIcons: Record<InteractionNodeType, React.ReactNode> = {
  start: <Play className="h-3 w-3" />,
  menu: <List className="h-3 w-3" />,
  action: <Zap className="h-3 w-3" />,
  condition: <GitBranch className="h-3 w-3" />,
  end: <Square className="h-3 w-3" />
}

const nodeColors: Record<InteractionNodeType, string> = {
  start: '#34d399',
  menu: '#a78bfa',
  action: '#38bdf8',
  condition: '#fbbf24',
  end: '#fb7185'
}

interface BookmarkPanelProps {
  onNavigateToNode: (nodeId: string) => void
}

export function BookmarkPanel({ onNavigateToNode }: BookmarkPanelProps) {
  const nodes = useDocumentStore((s) => s.document.nodes)
  const bookmarks = useDocumentStore((s) => s.document.bookmarks) ?? []
  const removeBookmark = useDocumentStore((s) => s.removeBookmark)
  const showBookmarks = useUIStore((s) => s.showBookmarks)
  const setShowBookmarks = useUIStore((s) => s.setShowBookmarks)

  if (bookmarks.length === 0) return null

  return (
    <div className="absolute bottom-3 left-3 z-40 min-w-[160px] rounded-xl border border-border bg-card/95 shadow-xl backdrop-blur-md">
      {/* Header */}
      <button
        onClick={() => setShowBookmarks(!showBookmarks)}
        className="flex w-full items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
      >
        <Bookmark className="h-3 w-3" />
        <span>Bookmarks ({bookmarks.length})</span>
        {showBookmarks ? (
          <ChevronDown className="ml-auto h-3 w-3" />
        ) : (
          <ChevronRight className="ml-auto h-3 w-3" />
        )}
      </button>

      {/* List */}
      {showBookmarks && (
        <div className="max-h-[200px] overflow-y-auto border-t border-border py-1">
          {bookmarks.map((nodeId) => {
            const node = nodes.find((n) => n.id === nodeId)
            if (!node) return null
            const nodeType = node.type as InteractionNodeType
            return (
              <button
                key={nodeId}
                className="group flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer text-left"
                onClick={() => onNavigateToNode(nodeId)}
              >
                <span style={{ color: nodeColors[nodeType] }}>
                  {nodeIcons[nodeType]}
                </span>
                <span className="flex-1 truncate text-foreground">
                  {node.data.label}
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeBookmark(nodeId)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      e.preventDefault()
                      removeBookmark(nodeId)
                    }
                  }}
                  className="hidden rounded p-0.5 text-muted-foreground hover:text-foreground group-hover:block"
                >
                  <X className="h-3 w-3" />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
