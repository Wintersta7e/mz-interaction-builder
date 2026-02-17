import { useState, useCallback, useEffect, useRef } from 'react'
import { Layout } from './components/Layout'
import { Toolbar } from './components/Toolbar'
import { NodePalette } from './components/NodePalette'
import { Canvas } from './components/Canvas'
import { PropertiesPanel } from './components/PropertiesPanel'
import { StatusBar } from './components/StatusBar'
import { ExportModal } from './components/ExportModal'
import { HelpModal } from './components/HelpModal'
import { ValidationPanel } from './components/ValidationPanel'
import { useDocumentStore, useHistoryStore, useProjectStore } from './stores'
import type { InteractionNodeType } from './types'
import './types/api.d'
import './styles/globals.css'

// Auto-save interval in milliseconds (30 seconds)
const AUTO_SAVE_INTERVAL = 30000

export default function App() {
  const { document, setDocument, setSavedPath, savedPath, isDirty, newDocument } = useDocumentStore()
  const { clear } = useHistoryStore()
  const { setProjectPath, setMaps, setSwitches, setVariables, addRecentProject, setLoading, setError } =
    useProjectStore()

  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [, setDraggingNodeType] = useState<InteractionNodeType | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const projectLoadingRef = useRef<AbortController | null>(null)

  // Handle New
  const handleNew = useCallback(async () => {
    if (isDirty) {
      const result = await window.api.dialog.message({
        type: 'question',
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to save before creating a new file?',
        buttons: ['Save', "Don't Save", 'Cancel']
      })

      if (result === 0) {
        await handleSave()
      } else if (result === 2) {
        return
      }
    }

    newDocument()
    clear()
  }, [isDirty, newDocument, clear])

  // Handle Open
  const handleOpen = useCallback(async () => {
    if (isDirty) {
      const result = await window.api.dialog.message({
        type: 'question',
        title: 'Unsaved Changes',
        message: 'You have unsaved changes. Do you want to save before opening another file?',
        buttons: ['Save', "Don't Save", 'Cancel']
      })

      if (result === 0) {
        await handleSave()
      } else if (result === 2) {
        return
      }
    }

    const filePath = await window.api.dialog.openFile({
      filters: [
        { name: 'MZ Interaction Files', extensions: ['mzinteraction'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (!filePath) return

    const result = await window.api.file.load(filePath)
    if (!result.success || !result.content) {
      await window.api.dialog.message({
        type: 'error',
        title: 'Error',
        message: result.error || 'Failed to load file'
      })
      return
    }

    try {
      const doc = JSON.parse(result.content)

      // Validate required document structure
      if (!doc.version || !Array.isArray(doc.nodes) || !Array.isArray(doc.edges)) {
        throw new Error('Invalid document structure: missing version, nodes, or edges')
      }

      // Validate nodes have required fields
      for (const node of doc.nodes) {
        if (!node.id || !node.type || !node.position || !node.data) {
          throw new Error(`Invalid node: missing required fields (id, type, position, or data)`)
        }
      }

      // Validate edges have required fields
      for (const edge of doc.edges) {
        if (!edge.id || !edge.source || !edge.target) {
          throw new Error(`Invalid edge: missing required fields (id, source, or target)`)
        }
      }

      setDocument(doc)
      setSavedPath(filePath)
      clear()
    } catch (e) {
      await window.api.dialog.message({
        type: 'error',
        title: 'Error',
        message: e instanceof Error ? e.message : 'Invalid file format'
      })
    }
  }, [isDirty, setDocument, setSavedPath, clear])

  // Handle Save
  const handleSave = useCallback(async () => {
    let filePath = savedPath

    if (!filePath) {
      filePath = await window.api.dialog.saveFile({
        defaultPath: `${document.name}.mzinteraction`,
        filters: [
          { name: 'MZ Interaction Files', extensions: ['mzinteraction'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
    }

    if (!filePath) return

    const content = JSON.stringify(document, null, 2)
    const result = await window.api.file.save(filePath, content)

    if (!result.success) {
      await window.api.dialog.message({
        type: 'error',
        title: 'Error',
        message: result.error || 'Failed to save file'
      })
      return
    }

    setSavedPath(filePath)
    useDocumentStore.getState().setDirty(false)
  }, [savedPath, document, setSavedPath])

  // Handle Export
  const handleExport = useCallback(() => {
    setIsExportModalOpen(true)
  }, [])

  // Handle Open Project
  const handleOpenProject = useCallback(async () => {
    const folderPath = await window.api.dialog.openFolder()
    if (!folderPath) return

    // Cancel any in-progress load to prevent race conditions
    if (projectLoadingRef.current) {
      projectLoadingRef.current.abort()
    }
    projectLoadingRef.current = new AbortController()
    const signal = projectLoadingRef.current.signal

    setLoading(true)
    setError(null)

    try {
      // Validate it's an RPG Maker project
      const validation = await window.api.project.validate(folderPath)
      if (signal.aborted) return
      if (!validation.valid) {
        await window.api.dialog.message({
          type: 'error',
          title: 'Invalid Project',
          message: validation.error || 'Not a valid RPG Maker MZ project'
        })
        setLoading(false)
        return
      }

      // Set project path
      await window.api.project.setPath(folderPath)
      if (signal.aborted) return
      setProjectPath(folderPath)
      addRecentProject(folderPath)

      // Load maps
      const mapsResult = await window.api.project.getMaps()
      if (signal.aborted) return
      if (!('error' in mapsResult)) {
        setMaps(mapsResult)
      }

      // Load switches
      const switchesResult = await window.api.project.getSwitches()
      if (signal.aborted) return
      if (!('error' in switchesResult)) {
        setSwitches(switchesResult)
      }

      // Load variables
      const variablesResult = await window.api.project.getVariables()
      if (signal.aborted) return
      if (!('error' in variablesResult)) {
        setVariables(variablesResult)
      }

      await window.api.dialog.message({
        type: 'info',
        title: 'Project Loaded',
        message: `Loaded project from:\n${folderPath}`
      })
    } catch (error) {
      if (signal.aborted) return
      setError(error instanceof Error ? error.message : 'Failed to load project')
      await window.api.dialog.message({
        type: 'error',
        title: 'Error',
        message: 'Failed to load project'
      })
    } finally {
      if (projectLoadingRef.current?.signal === signal) {
        projectLoadingRef.current = null
      }
      setLoading(false)
    }
  }, [setProjectPath, setMaps, setSwitches, setVariables, addRecentProject, setLoading, setError])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault()
            handleNew()
            break
          case 'o':
            e.preventDefault()
            handleOpen()
            break
          case 's':
            e.preventDefault()
            handleSave()
            break
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              const doc = useHistoryStore.getState().redo()
              if (doc) setDocument(doc)
            } else {
              const doc = useHistoryStore.getState().undo()
              if (doc) setDocument(doc)
            }
            break
          case 'y':
            e.preventDefault()
            const doc = useHistoryStore.getState().redo()
            if (doc) setDocument(doc)
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNew, handleOpen, handleSave, setDocument])

  // Auto-save when document is dirty and has a saved path
  useEffect(() => {
    if (isDirty && savedPath) {
      // Clear any existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      // Set new timer for auto-save
      autoSaveTimerRef.current = setTimeout(async () => {
        // Get fresh state at save time to avoid stale closure issues
        const state = useDocumentStore.getState()
        const currentPath = state.savedPath
        if (!currentPath) return // Path was cleared (e.g., new file created)

        const content = JSON.stringify(state.document, null, 2)
        const result = await window.api.file.save(currentPath, content)
        if (result.success) {
          useDocumentStore.getState().setDirty(false)
          console.log('Auto-saved at', new Date().toLocaleTimeString())
        }
      }, AUTO_SAVE_INTERVAL)
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [isDirty, savedPath, document])

  // Toggle help with F1
  useEffect(() => {
    const handleF1 = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault()
        setIsHelpModalOpen(true)
      }
    }
    window.addEventListener('keydown', handleF1)
    return () => window.removeEventListener('keydown', handleF1)
  }, [])

  return (
    <div className="dark">
      <Layout
        toolbar={
          <Toolbar
            onNew={handleNew}
            onOpen={handleOpen}
            onSave={handleSave}
            onExport={handleExport}
            onOpenProject={handleOpenProject}
            onHelp={() => setIsHelpModalOpen(true)}
            onValidate={() => setShowValidation(!showValidation)}
          />
        }
        palette={<NodePalette onDragStart={setDraggingNodeType} />}
        canvas={<Canvas />}
        properties={<PropertiesPanel />}
        statusbar={<StatusBar />}
      />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
      {showValidation && <ValidationPanel onClose={() => setShowValidation(false)} />}
    </div>
  )
}
