import { memo } from 'react'
import { Play } from 'lucide-react'
import { BaseNode } from './BaseNode'
import type { StartNodeData } from '../types'

interface StartNodeProps {
  data: StartNodeData
  selected?: boolean
}

function StartNodeComponent({ data, selected }: StartNodeProps) {
  return (
    <BaseNode
      color="hsl(142, 71%, 45%)"
      icon={<Play className="h-4 w-4" />}
      label={data.label || 'Start'}
      selected={selected}
      hasInput={false}
      hasOutput={true}
    >
      <p className="text-xs text-muted-foreground">Entry point for the interaction</p>
    </BaseNode>
  )
}

export const StartNode = memo(StartNodeComponent)
