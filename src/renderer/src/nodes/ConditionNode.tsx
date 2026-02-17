import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { GitBranch } from 'lucide-react'
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
      className={`min-w-[180px] rounded-lg border-2 bg-card shadow-lg transition-all ${
        selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
      style={{ borderColor: 'hsl(45, 93%, 47%)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-md px-3 py-2 text-white"
        style={{ backgroundColor: 'hsl(45, 93%, 47%)' }}
      >
        <GitBranch className="h-4 w-4" />
        <span className="font-semibold">{data.label || 'Condition'}</span>
      </div>

      {/* Content */}
      <div className="relative p-3">
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
          className="!-left-[6px] !top-1/2 !h-3 !w-3 !-translate-y-1/2 !border-2 !border-background !bg-muted-foreground"
        />

        {/* True output */}
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          className="!-right-[6px] !h-3 !w-3 !border-2 !border-background !bg-green-500"
          style={{ top: '60%' }}
        />

        {/* False output */}
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          className="!-right-[6px] !h-3 !w-3 !border-2 !border-background !bg-red-500"
          style={{ top: '80%' }}
        />
      </div>
    </div>
  )
}

export const ConditionNode = memo(ConditionNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data
})
