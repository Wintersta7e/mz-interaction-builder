import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { List } from 'lucide-react'
import type { MenuNodeData } from '../types'

interface MenuNodeProps {
  data: MenuNodeData
  selected?: boolean
}

// Constants for layout calculations
const HEADER_HEIGHT = 40 // px-3 py-2 ≈ 40px
const CONTENT_PADDING = 12 // p-3 = 12px
const CHOICE_HEIGHT = 30 // py-1.5 + text ≈ 30px
const CHOICE_GAP = 8 // space-y-2 = 8px

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
      className={`min-w-[200px] rounded-lg border-2 bg-card shadow-lg transition-all ${
        selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
      style={{ borderColor: 'hsl(271, 91%, 65%)' }}
    >
      {/* Input Handle - on the left, vertically centered */}
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
        style={{ top: getInputHandleTop(), left: -6 }}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2 rounded-t-md px-3 py-2 text-white"
        style={{ backgroundColor: 'hsl(271, 91%, 65%)' }}
      >
        <List className="h-4 w-4" />
        <span className="font-semibold">{data.label || 'Choice Menu'}</span>
      </div>

      {/* Content - Choices */}
      <div className="p-3">
        {choices.length === 0 ? (
          <>
            <p className="text-xs text-muted-foreground">No choices defined</p>
            {/* Default output handle when no choices */}
            <Handle
              type="source"
              position={Position.Right}
              id="default"
              className="!h-3 !w-3 !border-2 !border-background !bg-muted-foreground"
              style={{ top: HEADER_HEIGHT + CONTENT_PADDING + 10, right: -6 }}
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
          className="!h-3 !w-3 !border-2 !border-background"
          style={{
            top: getChoiceHandleTop(index),
            right: -6,
            backgroundColor: 'hsl(271, 91%, 65%)'
          }}
          title={choice.text || `Choice ${index + 1}`}
        />
      ))}
    </div>
  )
}

export const MenuNode = memo(MenuNodeComponent)
