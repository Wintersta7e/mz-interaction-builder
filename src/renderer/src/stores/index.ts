import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  InteractionDocument,
  InteractionNode,
  InteractionEdge,
  VariablePreset
} from '../types'
import { createEmptyDocument } from '../types'
import { v4 as uuid } from 'uuid'

// ============================================
// Document Store - Main graph state
// ============================================
export interface DocumentState {
  document: InteractionDocument
  savedPath: string | null
  isDirty: boolean

  // Document actions
  setDocument: (doc: InteractionDocument) => void
  updateDocument: (updates: Partial<InteractionDocument>) => void
  setSavedPath: (path: string | null) => void
  setDirty: (dirty: boolean) => void
  newDocument: () => void

  // Node actions
  addNode: (node: InteractionNode) => void
  updateNode: (id: string, data: Partial<InteractionNode>) => void
  removeNode: (id: string) => void
  setNodes: (nodes: InteractionNode[]) => void

  // Edge actions
  addEdge: (edge: InteractionEdge) => void
  updateEdge: (id: string, data: Partial<InteractionEdge>) => void
  removeEdge: (id: string) => void
  setEdges: (edges: InteractionEdge[]) => void

  // Variable presets
  addPreset: (preset: VariablePreset) => void
  updatePreset: (id: string, preset: Partial<VariablePreset>) => void
  removePreset: (id: string) => void

  // Bookmarks
  toggleBookmark: (nodeId: string) => void
  removeBookmark: (nodeId: string) => void
}

export const useDocumentStore = create<DocumentState>()((set) => ({
  document: createEmptyDocument(),
  savedPath: null,
  isDirty: false,

  setDocument: (document) => set({ document, isDirty: false }),
  updateDocument: (updates) =>
    set((state) => ({
      document: { ...state.document, ...updates },
      isDirty: true
    })),
  setSavedPath: (savedPath) => set({ savedPath }),
  setDirty: (isDirty) => set({ isDirty }),
  newDocument: () => set({ document: createEmptyDocument(), savedPath: null, isDirty: false }),

  // Nodes
  addNode: (node) =>
    set((state) => ({
      document: { ...state.document, nodes: [...state.document.nodes, node] },
      isDirty: true
    })),
  updateNode: (id, data) =>
    set((state) => ({
      document: {
        ...state.document,
        nodes: state.document.nodes.map((n) => (n.id === id ? { ...n, ...data } : n))
      },
      isDirty: true
    })),
  removeNode: (id) =>
    set((state) => ({
      document: {
        ...state.document,
        nodes: state.document.nodes.filter((n) => n.id !== id),
        // Also remove connected edges
        edges: state.document.edges.filter((e) => e.source !== id && e.target !== id),
        bookmarks: (state.document.bookmarks ?? []).filter((bid) => bid !== id)
      },
      isDirty: true
    })),
  setNodes: (nodes) =>
    set((state) => ({
      document: { ...state.document, nodes },
      isDirty: true
    })),

  // Edges
  addEdge: (edge) =>
    set((state) => ({
      document: { ...state.document, edges: [...state.document.edges, edge] },
      isDirty: true
    })),
  updateEdge: (id, data) =>
    set((state) => ({
      document: {
        ...state.document,
        edges: state.document.edges.map((e) => (e.id === id ? { ...e, ...data } : e))
      },
      isDirty: true
    })),
  removeEdge: (id) =>
    set((state) => ({
      document: {
        ...state.document,
        edges: state.document.edges.filter((e) => e.id !== id)
      },
      isDirty: true
    })),
  setEdges: (edges) =>
    set((state) => ({
      document: { ...state.document, edges },
      isDirty: true
    })),

  // Presets
  addPreset: (preset) =>
    set((state) => ({
      document: { ...state.document, variables: [...state.document.variables, preset] },
      isDirty: true
    })),
  updatePreset: (id, preset) =>
    set((state) => ({
      document: {
        ...state.document,
        variables: state.document.variables.map((p) => (p.id === id ? { ...p, ...preset } : p))
      },
      isDirty: true
    })),
  removePreset: (id) =>
    set((state) => ({
      document: {
        ...state.document,
        variables: state.document.variables.filter((p) => p.id !== id)
      },
      isDirty: true
    })),

  // Bookmarks
  toggleBookmark: (nodeId) =>
    set((state) => {
      const bookmarks = state.document.bookmarks ?? []
      const exists = bookmarks.includes(nodeId)
      return {
        document: {
          ...state.document,
          bookmarks: exists
            ? bookmarks.filter((id) => id !== nodeId)
            : [...bookmarks, nodeId]
        },
        isDirty: true
      }
    }),
  removeBookmark: (nodeId) =>
    set((state) => ({
      document: {
        ...state.document,
        bookmarks: (state.document.bookmarks ?? []).filter((id) => id !== nodeId)
      },
      isDirty: true
    }))
}))

// ============================================
// History Store - Undo/Redo
// ============================================
interface HistoryEntry {
  document: InteractionDocument
  timestamp: number
}

interface HistoryState {
  past: HistoryEntry[]
  future: HistoryEntry[]

  push: (document: InteractionDocument) => void
  undo: () => InteractionDocument | null
  redo: () => InteractionDocument | null
  clear: () => void
  canUndo: () => boolean
  canRedo: () => boolean
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  past: [],
  future: [],

  push: (document) =>
    set((state) => ({
      // Keep only 20 history entries to save memory
      past: [...state.past.slice(-19), { document, timestamp: Date.now() }],
      future: []
    })),

  undo: () => {
    const { past, future } = get()
    if (past.length === 0) return null

    const previous = past[past.length - 1]
    // Snapshot read (not a subscription) — necessary to save current state before restoring
    const currentDoc = useDocumentStore.getState().document

    set({
      past: past.slice(0, -1),
      future: [{ document: currentDoc, timestamp: Date.now() }, ...future]
    })

    return previous.document
  },

  redo: () => {
    const { past, future } = get()
    if (future.length === 0) return null

    const next = future[0]
    // Snapshot read (not a subscription) — necessary to save current state before restoring
    const currentDoc = useDocumentStore.getState().document

    set({
      past: [...past, { document: currentDoc, timestamp: Date.now() }],
      future: future.slice(1)
    })

    return next.document
  },

  clear: () => set({ past: [], future: [] }),
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0
}))

// ============================================
// UI Store - Selection and view state
// ============================================
interface UIState {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  paletteWidth: number
  propertiesWidth: number
  showMinimap: boolean
  zoom: number
  // Search (Phase 3A)
  searchOpen: boolean
  searchTerm: string
  searchMatches: string[]
  searchCurrentIndex: number
  // Path highlighting (Phase 3B)
  highlightedNodeIds: string[]
  highlightedEdgeIds: string[]
  // Bookmarks (Phase 3C)
  showBookmarks: boolean

  setSelectedNodeId: (id: string | null) => void
  setSelectedEdgeId: (id: string | null) => void
  setPaletteWidth: (width: number) => void
  setPropertiesWidth: (width: number) => void
  setShowMinimap: (show: boolean) => void
  setZoom: (zoom: number) => void
  clearSelection: () => void
  setSearchOpen: (open: boolean) => void
  setSearchTerm: (term: string) => void
  setSearchMatches: (matches: string[]) => void
  setSearchCurrentIndex: (index: number) => void
  setSearchResults: (matches: string[], currentIndex: number) => void
  setHighlightedPaths: (nodeIds: string[], edgeIds: string[]) => void
  clearHighlightedPaths: () => void
  setShowBookmarks: (show: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedNodeId: null,
      selectedEdgeId: null,
      paletteWidth: 200,
      propertiesWidth: 320,
      showMinimap: true,
      zoom: 1,
      searchOpen: false,
      searchTerm: '',
      searchMatches: [],
      searchCurrentIndex: 0,
      highlightedNodeIds: [],
      highlightedEdgeIds: [],
      showBookmarks: true,

      setSelectedNodeId: (selectedNodeId) => set({ selectedNodeId, selectedEdgeId: null }),
      setSelectedEdgeId: (selectedEdgeId) => set({ selectedEdgeId, selectedNodeId: null }),
      setPaletteWidth: (paletteWidth) => set({ paletteWidth }),
      setPropertiesWidth: (propertiesWidth) => set({ propertiesWidth }),
      setShowMinimap: (showMinimap) => set({ showMinimap }),
      setZoom: (zoom) => set({ zoom }),
      clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
      setSearchOpen: (searchOpen) => set({ searchOpen, ...(searchOpen ? {} : { searchTerm: '', searchMatches: [], searchCurrentIndex: 0 }) }),
      setSearchTerm: (searchTerm) => set({ searchTerm }),
      setSearchMatches: (searchMatches) => set({ searchMatches }),
      setSearchCurrentIndex: (searchCurrentIndex) => set({ searchCurrentIndex }),
      setSearchResults: (searchMatches, searchCurrentIndex) => set({ searchMatches, searchCurrentIndex }),
      setHighlightedPaths: (highlightedNodeIds, highlightedEdgeIds) => set({ highlightedNodeIds, highlightedEdgeIds }),
      clearHighlightedPaths: () => set({ highlightedNodeIds: [], highlightedEdgeIds: [] }),
      setShowBookmarks: (showBookmarks) => set({ showBookmarks })
    }),
    {
      name: 'mz-interaction-builder-ui',
      partialize: (state) => ({
        paletteWidth: state.paletteWidth,
        propertiesWidth: state.propertiesWidth,
        showMinimap: state.showMinimap,
        showBookmarks: state.showBookmarks
      })
    }
  )
)

// ============================================
// Project Store - RPG Maker project data
// ============================================
interface ProjectState {
  projectPath: string | null
  recentProjects: string[]
  maps: { id: number; name: string }[]
  switches: { id: number; name: string }[]
  variables: { id: number; name: string }[]
  isLoading: boolean
  error: string | null

  setProjectPath: (path: string | null) => void
  addRecentProject: (path: string) => void
  setMaps: (maps: { id: number; name: string }[]) => void
  setSwitches: (switches: { id: number; name: string }[]) => void
  setVariables: (variables: { id: number; name: string }[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearProject: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projectPath: null,
      recentProjects: [],
      maps: [],
      switches: [],
      variables: [],
      isLoading: false,
      error: null,

      setProjectPath: (projectPath) => set({ projectPath, error: null }),
      addRecentProject: (path) =>
        set((state) => ({
          recentProjects: [path, ...state.recentProjects.filter((p) => p !== path)].slice(0, 10)
        })),
      setMaps: (maps) => set({ maps }),
      setSwitches: (switches) => set({ switches }),
      setVariables: (variables) => set({ variables }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearProject: () =>
        set({
          projectPath: null,
          maps: [],
          switches: [],
          variables: [],
          error: null
        })
    }),
    {
      name: 'mz-interaction-builder-project',
      partialize: (state) => ({ recentProjects: state.recentProjects })
    }
  )
)

// ============================================
// Helper to generate unique IDs
// ============================================
export function generateId(prefix: string = 'node'): string {
  return `${prefix}-${uuid().slice(0, 8)}`
}
