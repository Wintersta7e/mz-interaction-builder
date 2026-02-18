import { memo } from 'react'
import { Zap } from 'lucide-react'
import { BaseNode } from './BaseNode'
import { useDocumentStore } from '../stores'
import type { ActionNodeData } from '../types'

interface ActionNodeProps {
  id: string
  data: ActionNodeData
  selected?: boolean
}

function ActionNodeComponent({ id, data, selected }: ActionNodeProps) {
  const bookmarks = useDocumentStore((s) => s.document.bookmarks) ?? []
  const actions = data.actions || []

  const getActionLabel = (type: string): string => {
    switch (type) {
      case 'script':
        return 'Script'
      case 'set_variable':
        return 'Set Variable'
      case 'set_switch':
        return 'Set Switch'
      case 'common_event':
        return 'Common Event'
      case 'show_text':
        return 'Show Text'
      case 'plugin_command':
        return 'Plugin Command'
      default:
        return 'Action'
    }
  }

  return (
    <BaseNode
      accentColor="#38bdf8"
      icon={<Zap className="h-4 w-4" />}
      label={data.label || 'Action'}
      selected={selected}
      bookmarked={bookmarks.includes(id)}
      hasInput={true}
      hasOutput={true}
    >
      {actions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No actions defined</p>
      ) : (
        <div className="space-y-1">
          {actions.slice(0, 3).map((action) => (
            <div key={action.id} className="rounded bg-muted px-2 py-1 text-xs">
              {getActionLabel(action.type)}
            </div>
          ))}
          {actions.length > 3 && (
            <p className="text-xs text-muted-foreground">+{actions.length - 3} more</p>
          )}
        </div>
      )}
    </BaseNode>
  )
}

export const ActionNode = memo(ActionNodeComponent, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data
})
