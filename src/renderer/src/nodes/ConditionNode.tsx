import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
import { cn } from '../lib/utils'
import type { ConditionNodeData } from '../types'

interface ConditionNodeProps {
  data: ConditionNodeData
  selected?: boolean
}

function ConditionNodeComponent({ data, selected }: ConditionNodeProps) {
  const condition = data.condition

  const getConditionSummary = (): string => {
    if (!condition) return 'No condition'

    switch (condition.type) {
      case 'switch':
        return `Switch #${condition.switchId} is ${condition.switchValue}`
      case 'variable':
        return `Variable #${condition.variableId} ${condition.variableOperator} ${condition.variableCompareValue}`
      case 'script':
        return condition.script?.slice(0, 30) + (condition.script && condition.script.length > 30 ? '...' : '') || 'Script'
      default:
        return 'Unknown condition'
    }
  }

  return (
    <div
      className={cn(
        'interaction-node min-w-[180px] rounded-xl border shadow-lg'
      )}
      style={{
        borderColor: selected ? '#fbbf24' : 'color-mix(in srgb, #fbbf24 30%, transparent)',
        boxShadow: selected
          ? '0 0 0 2px #fbbf24, 0 0 15px color-mix(in srgb, #fbbf24 40%, transparent)'
          : '0 4px 12px hsl(0 0% 0% / 0.3)'
      }}
    >
      {/* Accent strip */}
      <div className="h-1 rounded-t-xl" style={{ backgroundColor: '#fbbf24' }} />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <GitBranch className="h-4 w-4" style={{ color: '#fbbf24' }} />
        <span className="text-sm font-medium">{data.label || 'Condition'}</span>
      </div>

      {/* Content */}
      <div className="relative px-3 pb-3">
        <p className="text-xs text-muted-foreground">{getConditionSummary()}</p>

        {/* Branch labels */}
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-green-500">True</span>
          <span className="text-red-500">False</span>
        </div>

        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className="!-left-[6px] !top-1/2 !h-3 !w-3 !-translate-y-1/2 !rounded-full !border-2 !border-background"
          style={{ backgroundColor: 'hsl(230 10% 50%)' }}
        />

        {/* True output */}
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className="!-right-[6px] !h-3 !w-3 !rounded-full !border-2 !border-background !bg-green-500"
          style={{ top: '60%' }}
        />

        {/* False output */}
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="!-right-[6px] !h-3 !w-3 !rounded-full !border-2 !border-background !bg-red-500"
          style={{ top: '80%' }}
        />
      </div>
    </div>
  )
}

export const ConditionNode = memo(ConditionNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data
})
