import { ReactNode } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn } from '../lib/utils'

interface BaseNodeProps {
  children: ReactNode
  color: string
  icon: ReactNode
  label: string
  selected?: boolean
  hasInput?: boolean
  hasOutput?: boolean
  outputCount?: number
}

export function BaseNode({
  children,
  color,
  icon,
  label,
  selected,
  hasInput = true,
  hasOutput = true,
  outputCount = 1
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        'min-w-[180px] rounded-lg border-2 bg-card shadow-lg transition-all',
        selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      )}
      style={{ borderColor: color }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-md px-3 py-2 text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
        <span className="font-semibold">{label}</span>
      </div>

      {/* Content */}
      <div className="p-3">{children}</div>

      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
        />
      )}

      {/* Output Handle(s) */}
      {hasOutput && (
        <>
          {outputCount === 1 ? (
            <Handle
              type="source"
              position={Position.Right}
              className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
            />
          ) : (
            Array.from({ length: outputCount }).map((_, i) => (
              <Handle
                key={i}
                type="source"
                position={Position.Right}
                id={`output-${i}`}
                className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
                style={{
                  top: `${((i + 1) / (outputCount + 1)) * 100}%`
                }}
              />
            ))
          )}
        </>
      )}
    </div>
  )
}
