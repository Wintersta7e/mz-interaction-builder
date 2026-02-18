import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { List } from 'lucide-react'
import { cn } from '../lib/utils'
import type { MenuNodeData } from '../types'

interface MenuNodeProps {
  data: MenuNodeData
  selected?: boolean
}

// Constants for handle positioning — must match the Tailwind classes below.
// If you change px-3/py-2/p-3/py-1.5/space-y-2, update these values.
const HEADER_HEIGHT = 40 // header: px-3 py-2 + icon ≈ 40px
const CONTENT_PADDING = 12 // content: p-3 = 12px
const CHOICE_HEIGHT = 30 // choice row: py-1.5 + text-sm ≈ 30px
const CHOICE_GAP = 8 // gap: space-y-2 = 8px

function MenuNodeComponent({ data, selected }: MenuNodeProps) {
  const choices = data.choices || []

  // Calculate the vertical position of each choice handle relative to the node top
  const getChoiceHandleTop = (index: number): number => {
    return HEADER_HEIGHT + CONTENT_PADDING + (index * (CHOICE_HEIGHT + CHOICE_GAP)) + (CHOICE_HEIGHT / 2)
  }

  // Input handle position (middle of the node)
  const getInputHandleTop = (): number => {
    if (choices.length === 0) {
      return HEADER_HEIGHT + CONTENT_PADDING + 10 // Roughly middle of "No choices defined"
    }
    const totalHeight = HEADER_HEIGHT + CONTENT_PADDING * 2 + (choices.length * CHOICE_HEIGHT) + ((choices.length - 1) * CHOICE_GAP)
    return totalHeight / 2
  }

  return (
    <div
      className={cn(
        'interaction-node min-w-[200px] rounded-xl border shadow-lg'
      )}
      style={{
        borderColor: selected ? '#a78bfa' : 'color-mix(in srgb, #a78bfa 30%, transparent)',
        boxShadow: selected
          ? '0 0 0 2px #a78bfa, 0 0 15px color-mix(in srgb, #a78bfa 40%, transparent)'
          : '0 4px 12px hsl(0 0% 0% / 0.3)'
      }}
    >
      {/* Input Handle - on the left, vertically centered */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2 !border-background"
        style={{ top: getInputHandleTop(), left: -6, backgroundColor: 'hsl(230 10% 50%)' }}
      />

      {/* Accent strip */}
      <div className="h-1 rounded-t-xl" style={{ backgroundColor: '#a78bfa' }} />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <List className="h-4 w-4" style={{ color: '#a78bfa' }} />
        <span className="text-sm font-medium">{data.label || 'Choice Menu'}</span>
      </div>

      {/* Content - Choices */}
      <div className="px-3 pb-3">
        {choices.length === 0 ? (
          <>
            <p className="text-xs text-muted-foreground">No choices defined</p>
            {/* Default output handle when no choices */}
            <Handle
              type="source"
              position={Position.Right}
              id="default"
              className="!h-3 !w-3 !rounded-full !border-2 !border-background"
              style={{ top: HEADER_HEIGHT + CONTENT_PADDING + 10, right: -6, backgroundColor: '#a78bfa' }}
            />
          </>
        ) : (
          <div className="space-y-2">
            {choices.map((choice, index) => (
              <div
                key={choice.id}
                className="relative flex items-center justify-between rounded bg-muted px-2 py-1.5 text-sm"
              >
                <span className="truncate pr-6">{choice.text || `Choice ${index + 1}`}</span>
                <div className="flex items-center gap-1">
                  {choice.hideCondition && (
                    <span className="text-xs text-amber-500" title="Has hide condition">
                      H
                    </span>
                  )}
                  {choice.disableCondition && (
                    <span className="text-xs text-red-500" title="Has disable condition">
                      D
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output Handles for each choice - positioned to align with choice items */}
      {choices.map((choice, index) => (
        <Handle
          key={choice.id}
          type="source"
          position={Position.Right}
          id={`choice-${index}`}
          className="!h-3 !w-3 !rounded-full !border-2 !border-background"
          style={{
            top: getChoiceHandleTop(index),
            right: -6,
            backgroundColor: '#a78bfa'
          }}
          title={choice.text || `Choice ${index + 1}`}
        />
      ))}
    </div>
  )
}

export const MenuNode = memo(MenuNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data
})
