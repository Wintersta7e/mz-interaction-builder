// Node types for the interaction builder
export type InteractionNodeType = 'start' | 'menu' | 'action' | 'condition' | 'end'

// Base node data interface
export interface BaseNodeData {
  label: string
}

// Start node - entry point
export interface StartNodeData extends BaseNodeData {
  type: 'start'
}

// Choice in a menu node
export interface MenuChoice {
  id: string
  text: string
  hideCondition?: Condition
  disableCondition?: Condition
}

// Menu node - shows choices to player
export interface MenuNodeData extends BaseNodeData {
  type: 'menu'
  choices: MenuChoice[]
  cancelType: 'disallow' | 'branch' | 'last_choice' // RPG Maker cancel behavior
  windowBackground: 0 | 1 | 2 // 0=Window, 1=Dim, 2=Transparent
  windowPosition: 0 | 1 | 2 // 0=Left, 1=Middle, 2=Right
}

// Action types available
export type ActionType =
  | 'script'
  | 'set_variable'
  | 'set_switch'
  | 'common_event'
  | 'show_text'
  | 'plugin_command'

// Single action in an action node
export interface Action {
  id: string
  type: ActionType
  // Script action
  script?: string
  // Variable action
  variableId?: number
  variableOperation?: 'set' | 'add' | 'sub' | 'mul' | 'div' | 'mod'
  variableValue?: number | string
  variableValueType?: 'constant' | 'variable' | 'random' | 'script'
  variableValueMin?: number
  variableValueMax?: number
  // Switch action
  switchId?: number
  switchValue?: 'on' | 'off' | 'toggle'
  // Common event action
  commonEventId?: number
  // Show text action
  text?: string
  faceName?: string
  faceIndex?: number
  textBackground?: 0 | 1 | 2
  textPosition?: 0 | 1 | 2
  // Plugin command
  pluginName?: string
  commandName?: string
  commandArgs?: Record<string, unknown>
}

// Action node - executes one or more actions
export interface ActionNodeData extends BaseNodeData {
  type: 'action'
  actions: Action[]
}

// Condition operators
export type ConditionOperator = '==' | '!=' | '>' | '<' | '>=' | '<='

// Condition for branching
export interface Condition {
  id: string
  type: 'switch' | 'variable' | 'script'
  // Switch condition
  switchId?: number
  switchValue?: 'on' | 'off'
  // Variable condition
  variableId?: number
  variableOperator?: ConditionOperator
  variableCompareType?: 'constant' | 'variable'
  variableCompareValue?: number
  variableCompareVariableId?: number
  // Script condition
  script?: string
}

// Condition node - branches based on condition
export interface ConditionNodeData extends BaseNodeData {
  type: 'condition'
  condition: Condition
}

// End node - exit point
export interface EndNodeData extends BaseNodeData {
  type: 'end'
}

// Union type for all node data
export type InteractionNodeData =
  | StartNodeData
  | MenuNodeData
  | ActionNodeData
  | ConditionNodeData
  | EndNodeData

// Custom node type for React Flow
export interface InteractionNode {
  id: string
  type: InteractionNodeType
  position: { x: number; y: number }
  data: InteractionNodeData
}

// Edge types
export type InteractionEdgeType = 'default' | 'choice' | 'condition-true' | 'condition-false'

// Custom edge with metadata
export interface InteractionEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: InteractionEdgeType
  data?: {
    choiceIndex?: number
    conditionBranch?: 'true' | 'false'
  }
}

// Variable preset
export interface VariablePreset {
  id: string
  name: string
  description: string
  variables: {
    id: string
    name: string
    type: 'switch' | 'variable'
    mzId?: number // RPG Maker switch/variable ID
    getter?: string // Script to get value
    setter?: string // Script to set value
  }[]
}

// Document structure for saving/loading
export interface InteractionDocument {
  version: string
  name: string
  description: string
  nodes: InteractionNode[]
  edges: InteractionEdge[]
  variables: VariablePreset[]
  projectPath?: string
}

// Default empty document
export function createEmptyDocument(): InteractionDocument {
  return {
    version: '1.0.0',
    name: 'New Interaction',
    description: '',
    nodes: [
      {
        id: 'start-1',
        type: 'start',
        position: { x: 100, y: 200 },
        data: { type: 'start', label: 'Start' }
      }
    ],
    edges: [],
    variables: []
  }
}
