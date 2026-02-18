import { memo } from 'react'
import { Square } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useDocumentStore } from '../stores'
import type { EndNodeData } from '../types'

interface EndNodeProps {
  id: string
  data: EndNodeData
  selected?: boolean
}

function EndNodeComponent({ id, data, selected }: EndNodeProps) {
  const bookmarks = useDocumentStore((s) => s.document.bookmarks) ?? []

  return (
    <BaseNode
      accentColor="#fb7185"
      icon={<Square className="h-4 w-4" />}
      label={data.label || 'End'}
      selected={selected}
      bookmarked={bookmarks.includes(id)}
      hasInput={true}
      hasOutput={false}
    >
      <p className="text-xs text-muted-foreground">Exit the interaction</p>
    </BaseNode>
  )
}

export const EndNode = memo(EndNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data
})
