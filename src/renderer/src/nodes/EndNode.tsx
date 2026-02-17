import { memo } from 'react'
import { Square } from 'lucide-react'
import { BaseNode } from './BaseNode'
import type { EndNodeData } from '../types'

interface EndNodeProps {
  data: EndNodeData
  selected?: boolean
}

function EndNodeComponent({ data, selected }: EndNodeProps) {
  return (
    <BaseNode
      color="hsl(0, 72%, 51%)"
      icon={<Square className="h-4 w-4" />}
      label={data.label || 'End'}
      selected={selected}
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
