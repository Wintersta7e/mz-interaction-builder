import { useCallback, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
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
  type NodeChange,
  type EdgeChange,
  type OnMoveEnd
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { nodeTypes } from '../nodes'
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

function CanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { document, setNodes, setEdges, addNode, addEdge: addDocEdge, removeNode } = useDocumentStore()
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
      const newEdge: InteractionEdge = {
        ...connection,
        id: generateId('edge'),
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
  const clipboardRef = useRef<InteractionNode | null>(null)

  // Handle Delete key to remove selected node and Copy/Paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input field
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Delete/Backspace - remove selected node or edges
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Check for selected edges first (use ref for latest value)
        const currentEdges = edgesRef.current
        const selectedEdges = currentEdges.filter((edge) => edge.selected)
        if (selectedEdges.length > 0) {
          e.preventDefault()
          // Get fresh document state for history
          push(useDocumentStore.getState().document)
          const selectedEdgeIds = selectedEdges.map((edge) => edge.id)
          setEdgesState((eds) => eds.filter((edge) => !selectedEdgeIds.includes(edge.id)))
          setEdges(currentEdges.filter((edge) => !selectedEdgeIds.includes(edge.id)))
          return
        }

        // Then check for selected node
        if (selectedNodeId) {
          e.preventDefault()
          // Get fresh document state for history
          push(useDocumentStore.getState().document)
          removeNode(selectedNodeId)
          setNodesState((nds) => nds.filter((n) => n.id !== selectedNodeId))
          // Also remove connected edges
          setEdgesState((eds) => eds.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
          setSelectedNodeId(null)
        }
      }

      // Ctrl+C - copy selected node
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedNodeId) {
          // Get fresh document state
          const currentDoc = useDocumentStore.getState().document
          const node = currentDoc.nodes.find((n) => n.id === selectedNodeId)
          if (node) {
            e.preventDefault()
            clipboardRef.current = JSON.parse(JSON.stringify(node)) // Deep clone
          }
        }
      }

      // Ctrl+V - paste node
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardRef.current) {
          e.preventDefault()
          const pastedNode: InteractionNode = {
            ...JSON.parse(JSON.stringify(clipboardRef.current)),
            id: generateId(clipboardRef.current.type),
            position: {
              x: clipboardRef.current.position.x + 50,
              y: clipboardRef.current.position.y + 50
            }
          }
          // Update the clipboard position for subsequent pastes
          clipboardRef.current.position = pastedNode.position

          // Get fresh document state for history
          push(useDocumentStore.getState().document)
          addNode(pastedNode)
          setNodesState((nds) => [...nds, pastedNode])
          setSelectedNodeId(pastedNode.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, push, removeNode, addNode, setNodesState, setEdgesState, setSelectedNodeId, setEdges])

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
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultViewport={{ x: 0, y: 0, zoom }}
        minZoom={0.25}
        maxZoom={2}
        edgesFocusable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        className="bg-background"
      >
        <Background color="hsl(var(--muted-foreground) / 0.2)" gap={16} />
        <Controls className="!bg-card !border-border !shadow-lg" />
        {showMinimap && (
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-card !border-border"
            maskColor="hsl(var(--background) / 0.8)"
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
