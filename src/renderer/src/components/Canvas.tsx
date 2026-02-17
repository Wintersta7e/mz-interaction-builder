import { useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  ReactFlowProvider,
  useReactFlow,
  SelectionMode,
  type NodeChange,
  type EdgeChange,
  type OnMoveEnd
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes } from '../nodes'
import { edgeTypes } from '../edges'
import { useDocumentStore, useUIStore, useHistoryStore, generateId } from '../stores'
import type { InteractionNodeType, InteractionNode, InteractionEdge, InteractionNodeData } from '../types'

function getDefaultNodeData(type: InteractionNodeType): InteractionNodeData {
  switch (type) {
    case 'start':
      return { type: 'start', label: 'Start' }
    case 'menu':
      return { type: 'menu', label: 'Choice Menu', choices: [], cancelType: 'disallow', windowBackground: 0, windowPosition: 2 }
    case 'action':
      return { type: 'action', label: 'Action', actions: [] }
    case 'condition':
      return { type: 'condition', label: 'Condition', condition: { id: generateId('cond'), type: 'switch' } }
    case 'end':
      return { type: 'end', label: 'End' }
    default:
      return { type: 'start', label: 'Start' }
  }
}

// Node accent color mapping (matches CSS variables and node components)
const NODE_ACCENT_COLORS: Record<InteractionNodeType, string> = {
  start: '#34d399',
  menu: '#a78bfa',
  action: '#38bdf8',
  condition: '#fbbf24',
  end: '#fb7185'
}

function getEdgeTypeAndData(
  connection: Connection,
  nodes: InteractionNode[]
): { type: string; data: Record<string, unknown> } {
  const sourceNode = nodes.find((n) => n.id === connection.source)
  const targetNode = nodes.find((n) => n.id === connection.target)
  const sourceType = sourceNode?.type as InteractionNodeType | undefined
  const targetType = targetNode?.type as InteractionNodeType | undefined

  const sourceColor = sourceType ? NODE_ACCENT_COLORS[sourceType] : '#9ca3af'
  const targetColor = targetType ? NODE_ACCENT_COLORS[targetType] : '#9ca3af'

  if (sourceType === 'condition' && connection.sourceHandle === 'true') {
    return {
      type: 'interaction',
      data: { edgeStyle: 'condition-true', sourceColor: '#34d399', targetColor, conditionBranch: 'true' }
    }
  }
  if (sourceType === 'condition' && connection.sourceHandle === 'false') {
    return {
      type: 'interaction',
      data: { edgeStyle: 'condition-false', sourceColor: '#fb7185', targetColor, conditionBranch: 'false' }
    }
  }
  if (sourceType === 'menu' && connection.sourceHandle?.startsWith('choice-')) {
    const choiceIndex = parseInt(connection.sourceHandle.replace('choice-', ''), 10)
    return {
      type: 'interaction',
      data: { edgeStyle: 'choice', sourceColor: '#a78bfa', targetColor, choiceIndex }
    }
  }

  return {
    type: 'interaction',
    data: { edgeStyle: 'default', sourceColor, targetColor }
  }
}

function CanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { document, setNodes, setEdges, addNode, addEdge: addDocEdge } = useDocumentStore()
  const { selectedNodeId, setSelectedNodeId, showMinimap, zoom, setZoom } = useUIStore()
  const { push } = useHistoryStore()
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodesState, onNodesChange] = useNodesState(document.nodes)
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(document.edges)

  // Refs to track latest state for use in callbacks (avoids stale closures)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => {
    nodesRef.current = nodes
  }, [nodes])
  useEffect(() => {
    edgesRef.current = edges
  }, [edges])

  // Sync local state when document changes (e.g., file load, undo/redo)
  useEffect(() => {
    setNodesState(document.nodes)
    setEdgesState(document.edges)
  }, [document.nodes, document.edges, setNodesState, setEdgesState])

  // Sync nodes/edges changes to document store
  const handleNodesChange = useCallback(
    (changes: NodeChange<InteractionNode>[]) => {
      // Check for significant changes first
      const significantChange = changes.some(
        (c) => c.type === 'remove' || c.type === 'add' || (c.type === 'position' && !c.dragging)
      )

      // Push current document to history BEFORE applying changes
      if (significantChange) {
        push(useDocumentStore.getState().document)
      }

      // Apply changes to local ReactFlow state
      onNodesChange(changes)

      // Sync to document store using computed new nodes
      if (significantChange) {
        const newNodes = applyNodeChanges(changes, nodesRef.current)
        setNodes(newNodes)
      }
    },
    [onNodesChange, setNodes, push]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<InteractionEdge>[]) => {
      const significantChange = changes.some((c) => c.type === 'remove' || c.type === 'add')

      // Push current document to history BEFORE applying changes
      if (significantChange) {
        push(useDocumentStore.getState().document)
      }

      // Apply changes to local ReactFlow state
      onEdgesChange(changes)

      // Sync to document store using computed new edges
      if (significantChange) {
        const newEdges = applyEdgeChanges(changes, edgesRef.current)
        setEdges(newEdges)
      }
    },
    [onEdgesChange, setEdges, push]
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      // Push current document to history before making changes
      push(useDocumentStore.getState().document)
      const { type, data } = getEdgeTypeAndData(connection, nodesRef.current)
      const newEdge: InteractionEdge = {
        ...connection,
        id: generateId('edge'),
        type,
        data,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined
      }
      setEdgesState((eds) => addEdge(newEdge, eds))
      addDocEdge(newEdge)
    },
    [setEdgesState, addDocEdge, push]
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: InteractionNode) => {
      setSelectedNodeId(node.id)
    },
    [setSelectedNodeId]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [setSelectedNodeId])

  const onEdgeClick = useCallback(() => {
    // Deselect node when edge is clicked
    setSelectedNodeId(null)
  }, [setSelectedNodeId])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/interaction-node') as InteractionNodeType
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      })

      const newNode: InteractionNode = {
        id: generateId(type),
        type,
        position,
        data: getDefaultNodeData(type)
      }

      // Push current document to history before making changes
      push(useDocumentStore.getState().document)
      addNode(newNode)
      setNodesState((nds) => [...nds, newNode])
    },
    [screenToFlowPosition, addNode, setNodesState, push]
  )

  const onMoveEnd: OnMoveEnd = useCallback(
    (_event, viewport) => {
      setZoom(viewport.zoom)
    },
    [setZoom]
  )

  // Clipboard for copy/paste
  const clipboardRef = useRef<{ nodes: InteractionNode[]; edges: InteractionEdge[] } | null>(null)

  // Handle Delete key to remove selected node and Copy/Paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Delete/Backspace - remove selected nodes and/or edges
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const currentNodes = nodesRef.current
        const currentEdges = edgesRef.current
        const selectedNodes = currentNodes.filter((n) => n.selected)
        const selectedEdgesArr = currentEdges.filter((edge) => edge.selected)

        if (selectedNodes.length === 0 && selectedEdgesArr.length === 0) return

        e.preventDefault()
        push(useDocumentStore.getState().document)

        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id))
        const selectedEdgeIds = new Set(selectedEdgesArr.map((edge) => edge.id))

        // Remove selected nodes and any edges connected to them, plus selected edges
        const newNodes = currentNodes.filter((n) => !selectedNodeIds.has(n.id))
        const newEdges = currentEdges.filter(
          (edge) =>
            !selectedEdgeIds.has(edge.id) &&
            !selectedNodeIds.has(edge.source) &&
            !selectedNodeIds.has(edge.target)
        )

        setNodesState(newNodes)
        setEdgesState(newEdges)
        setNodes(newNodes)
        setEdges(newEdges)
        setSelectedNodeId(null)
      }

      // Ctrl+C - copy selected nodes and internal edges
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        const currentDoc = useDocumentStore.getState().document
        const currentNodes = nodesRef.current
        let nodesToCopy = currentNodes.filter((n) => n.selected)

        // Fall back to single selected node
        if (nodesToCopy.length === 0 && selectedNodeId) {
          const node = currentDoc.nodes.find((n) => n.id === selectedNodeId)
          if (node) nodesToCopy = [node]
        }

        if (nodesToCopy.length === 0) return

        e.preventDefault()
        const selectedIds = new Set(nodesToCopy.map((n) => n.id))
        const internalEdges = currentDoc.edges.filter(
          (edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target)
        )

        clipboardRef.current = {
          nodes: JSON.parse(JSON.stringify(nodesToCopy)),
          edges: JSON.parse(JSON.stringify(internalEdges))
        }
      }

      // Ctrl+V - paste nodes and remap edges
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (!clipboardRef.current || clipboardRef.current.nodes.length === 0) return

        e.preventDefault()
        push(useDocumentStore.getState().document)

        const offset = { x: 20, y: 20 }
        const idMap = new Map<string, string>() // oldId → newId

        // Create new nodes with new IDs and offset positions
        const newNodes: InteractionNode[] = clipboardRef.current.nodes.map((node) => {
          const newId = generateId(node.type || 'node')
          idMap.set(node.id, newId)
          return {
            ...JSON.parse(JSON.stringify(node)),
            id: newId,
            position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
            selected: true
          }
        })

        // Remap edges: replace source/target IDs and generate new edge IDs
        const newEdges: InteractionEdge[] = clipboardRef.current.edges.map((edge) => ({
          ...JSON.parse(JSON.stringify(edge)),
          id: generateId('edge'),
          source: idMap.get(edge.source) || edge.source,
          target: idMap.get(edge.target) || edge.target
        }))

        // Update clipboard positions for next paste
        clipboardRef.current = {
          nodes: clipboardRef.current.nodes.map((n) => ({
            ...n,
            position: { x: n.position.x + offset.x, y: n.position.y + offset.y }
          })),
          edges: clipboardRef.current.edges
        }

        // Deselect existing nodes, then add new ones
        setNodesState((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...newNodes])
        setEdgesState((eds) => [...eds, ...newEdges])

        // Sync to document store
        const docState = useDocumentStore.getState()
        setNodes([...docState.document.nodes, ...newNodes])
        setEdges([...docState.document.edges, ...newEdges])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, push, setNodes, setEdges, setNodesState, setEdgesState, setSelectedNodeId])

  return (
    <div ref={reactFlowWrapper} className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultViewport={{ x: 0, y: 0, zoom }}
        minZoom={0.25}
        maxZoom={2}
        edgesFocusable={true}
        elementsSelectable={true}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        className="bg-background"
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="hsl(230 15% 15%)"
          gap={20}
          size={1.5}
        />
        <Controls className="!bg-card/80 !border-border !shadow-lg !backdrop-blur-sm !rounded-xl" />
        {showMinimap && (
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-card/60 !border-border !rounded-xl !backdrop-blur-md"
            maskColor="hsl(230 25% 7% / 0.8)"
            nodeBorderRadius={4}
            nodeColor={(node) => NODE_ACCENT_COLORS[(node.type as InteractionNodeType) || 'start'] || '#9ca3af'}
            pannable
            zoomable
            style={{ width: 180, height: 120 }}
          />
        )}
      </ReactFlow>
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
