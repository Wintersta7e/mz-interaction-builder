import { useEffect, useRef } from 'react'
import { Play, List, Zap, GitBranch, Square } from 'lucide-react'
import type { InteractionNodeType } from '../types'

interface MenuPosition {
  x: number
  y: number
}

interface CanvasContextMenuProps {
  position: MenuPosition
  onAddNode: (type: InteractionNodeType) => void
  onClose: () => void
}

const menuItems: {
  type: InteractionNodeType
  label: string
  icon: React.ReactNode
  color: string
}[] = [
  { type: 'start', label: 'Start', icon: <Play className="h-4 w-4" />, color: '#34d399' },
  { type: 'menu', label: 'Choice Menu', icon: <List className="h-4 w-4" />, color: '#a78bfa' },
  { type: 'action', label: 'Action', icon: <Zap className="h-4 w-4" />, color: '#38bdf8' },
  {
    type: 'condition',
    label: 'Condition',
    icon: <GitBranch className="h-4 w-4" />,
    color: '#fbbf24'
  },
  { type: 'end', label: 'End', icon: <Square className="h-4 w-4" />, color: '#fb7185' }
]

export function CanvasContextMenu({
  position,
  onAddNode,
  onClose
}: CanvasContextMenuProps): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-[180px] rounded-xl border border-border bg-card/95 py-1 shadow-xl backdrop-blur-md"
      style={{ left: position.x, top: position.y }}
    >
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Add Node
      </div>
      {menuItems.map((item) => (
        <button
          key={item.type}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
          onClick={() => {
            onAddNode(item.type)
            onClose()
          }}
        >
          <span style={{ color: item.color }}>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
