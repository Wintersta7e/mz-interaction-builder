import { type EdgeProps, getBezierPath } from '@xyflow/react'

export function InteractionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}: EdgeProps) {
  const edgeStyle = (data as Record<string, unknown>)?.edgeStyle as string | undefined
  const sourceColor = ((data as Record<string, unknown>)?.sourceColor as string) || 'hsl(230 5% 65% / 0.5)'
  const targetColor = ((data as Record<string, unknown>)?.targetColor as string) || sourceColor

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
    </>
  )
}
