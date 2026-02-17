import { memo } from 'react'
import { type EdgeProps, getBezierPath, EdgeLabelRenderer } from '@xyflow/react'
import type { InteractionEdge as InteractionEdgeType } from '../types'

function InteractionEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}: EdgeProps<InteractionEdgeType>) {
  const edgeStyle = data?.edgeStyle
  const sourceColor = data?.sourceColor || 'hsl(230 5% 65% / 0.5)'
  const targetColor = data?.targetColor || sourceColor

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition
  })

  const gradientId = `edge-gradient-${id}`

  // Determine stroke color based on edge style
  let strokeColor = 'hsl(230 5% 65% / 0.5)' // default muted
  let useGradient = false

  switch (edgeStyle) {
    case 'condition-true':
      strokeColor = '#34d399'
      break
    case 'condition-false':
      strokeColor = '#fb7185'
      break
    case 'choice':
      useGradient = true // gradient from violet to target
      break
    default:
      strokeColor = 'hsl(230 5% 65% / 0.5)'
  }

  return (
    <>
      {useGradient && (
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1={sourceX}
            y1={sourceY}
            x2={targetX}
            y2={targetY}
          >
            <stop offset="0%" stopColor={sourceColor} />
            <stop offset="100%" stopColor={targetColor} />
          </linearGradient>
        </defs>
      )}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: useGradient ? `url(#${gradientId})` : strokeColor,
          strokeWidth: selected ? 3 : 2,
          filter: selected
            ? `drop-shadow(0 0 4px ${useGradient ? sourceColor : strokeColor})`
            : undefined
        }}
      />
      {/* Edge label */}
      {(edgeStyle === 'condition-true' ||
        edgeStyle === 'condition-false' ||
        edgeStyle === 'choice') && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
              backgroundColor:
                edgeStyle === 'condition-true'
                  ? '#34d399'
                  : edgeStyle === 'condition-false'
                    ? '#fb7185'
                    : '#a78bfa',
              color: edgeStyle === 'condition-false' ? '#fff' : '#000',
              opacity: selected ? 1 : 0.7
            }}
          >
            {edgeStyle === 'condition-true' && 'True'}
            {edgeStyle === 'condition-false' && 'False'}
            {edgeStyle === 'choice' &&
              `Choice ${(data?.choiceIndex ?? 0) + 1}`}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const InteractionEdge = memo(InteractionEdgeComponent)
