import {
  FilePlus,
  FolderOpen,
  Save,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Folder,
  HelpCircle,
  AlertTriangle
} from 'lucide-react'
import { useDocumentStore, useHistoryStore, useUIStore, useProjectStore } from '../stores'
import { TitleBar } from './TitleBar'

interface ToolbarProps {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onExport: () => void
  onOpenProject: () => void
  onHelp?: () => void
  onValidate?: () => void
}

export function Toolbar({ onNew, onOpen, onSave, onExport, onOpenProject, onHelp, onValidate }: ToolbarProps) {
  const { isDirty } = useDocumentStore()
  const { canUndo, canRedo, undo, redo } = useHistoryStore()
  const { zoom, setZoom } = useUIStore()
  const { projectPath } = useProjectStore()
  const setDocument = useDocumentStore((s) => s.setDocument)

  const handleUndo = () => {
    const doc = undo()
    if (doc) setDocument(doc)
  }

  const handleRedo = () => {
    const doc = redo()
    if (doc) setDocument(doc)
  }

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.2, 2))
  }

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.2, 0.25))
  }

  const handleZoomReset = () => {
    setZoom(1)
  }

  return (
    <div>
      <TitleBar />
      <div className="flex items-center gap-1 border-t border-border px-2 py-1">
        {/* File operations */}
        <div className="flex items-center gap-1">
          <button
            onClick={onNew}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="New (Ctrl+N)"
          >
            <FilePlus className="h-4 w-4" />
          </button>
          <button
            onClick={onOpen}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Open (Ctrl+O)"
          >
            <FolderOpen className="h-4 w-4" />
          </button>
          <button
            onClick={onSave}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Save (Ctrl+S)"
          >
            <Save className={`h-4 w-4 ${isDirty ? 'text-amber-500' : ''}`} />
          </button>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo()}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted disabled:opacity-50"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo()}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted disabled:opacity-50"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="flex h-8 min-w-[60px] items-center justify-center rounded px-2 text-sm hover:bg-muted"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
            title="Fit View"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Project */}
        <button
          onClick={onOpenProject}
          className={`flex h-8 items-center gap-2 rounded px-3 text-sm hover:bg-muted ${
            projectPath ? 'text-primary' : 'text-muted-foreground'
          }`}
          title={projectPath ? `Project: ${projectPath}` : 'Open RPG Maker Project'}
        >
          <Folder className="h-4 w-4" />
          {projectPath ? 'Project Loaded' : 'Open Project'}
        </button>

        <div className="flex-1" />

        {/* Help & Validation */}
        <div className="flex items-center gap-1">
          {onValidate && (
            <button
              onClick={onValidate}
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
              title="Validate (Check for issues)"
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          )}
          {onHelp && (
            <button
              onClick={onHelp}
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted"
              title="Help (F1)"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mx-2 h-6 w-px bg-border" />

        {/* Export */}
        <button
          onClick={onExport}
          className="flex h-8 items-center gap-2 rounded bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>
    </div>
  )
}
