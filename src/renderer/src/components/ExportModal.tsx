import { useState, useEffect } from 'react'
import { X, Copy, Check, Download } from 'lucide-react'
import { useDocumentStore, useProjectStore } from '../stores'
import { exportToMZCommands, exportAsJSON } from '../lib/export'
import '../types/api.d'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { document } = useDocumentStore()
  const { projectPath, setProjectPath, maps, setMaps } = useProjectStore()

  const [selectedMapId, setSelectedMapId] = useState<number | null>(null)
  const [events, setEvents] = useState<{ id: number; name: string; pages: number }[]>([])
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [selectedPageIndex, setSelectedPageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load maps when project path changes
  useEffect(() => {
    if (projectPath && isOpen) {
      loadMaps()
    }
  }, [projectPath, isOpen])

  // Load events when map changes
  useEffect(() => {
    if (selectedMapId !== null) {
      loadEvents(selectedMapId)
    }
  }, [selectedMapId])

  const loadMaps = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.project.getMaps()
      if ('error' in result) {
        setError(result.error)
      } else {
        setMaps(result)
      }
    } catch (e) {
      setError((e as Error).message)
    }
    setIsLoading(false)
  }

  const loadEvents = async (mapId: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await window.api.project.getMapEvents(mapId)
      if ('error' in result) {
        setError(result.error)
      } else {
        setEvents(result)
        setSelectedEventId(null)
      }
    } catch (e) {
      setError((e as Error).message)
    }
    setIsLoading(false)
  }

  const handleSelectProject = async () => {
    const path = await window.api.dialog.openFolder()
    if (!path) return

    const validation = await window.api.project.validate(path)
    if (!validation.valid) {
      setError(validation.error || 'Invalid project')
      return
    }

    await window.api.project.setPath(path)
    setProjectPath(path)
  }

  const handleCopyJSON = async () => {
    const json = exportAsJSON(document)
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportToMap = async () => {
    if (!selectedMapId || !selectedEventId) {
      setError('Please select a map and event')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const commands = exportToMZCommands(document)
      const result = await window.api.project.exportToMap({
        mapId: selectedMapId,
        eventId: selectedEventId,
        pageIndex: selectedPageIndex,
        commands
      })

      if (!result.success) {
        setError(result.error || 'Export failed')
      } else {
        await window.api.dialog.message({
          type: 'info',
          title: 'Export Successful',
          message: `Exported ${result.commandCount} commands to Map ${selectedMapId}, Event ${selectedEventId}, Page ${selectedPageIndex + 1}.\n\nReload the map in RPG Maker to see the changes.`
        })
        onClose()
      }
    } catch (e) {
      setError((e as Error).message)
    }

    setIsLoading(false)
  }

  if (!isOpen) return null

  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const pageCount = selectedEvent?.pages || 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[500px] rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Export Interaction</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-4">
          {/* Copy JSON Section */}
          <div className="rounded border border-border p-4">
            <h3 className="mb-2 font-medium">Copy as JSON</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Copy the generated RPG Maker commands to clipboard for manual pasting.
            </p>
            <button
              onClick={handleCopyJSON}
              className="flex items-center gap-2 rounded bg-secondary px-4 py-2 text-sm hover:bg-secondary/80"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>

          {/* Export to Map Section */}
          <div className="rounded border border-border p-4">
            <h3 className="mb-2 font-medium">Export to Map</h3>
            <p className="mb-3 text-sm text-muted-foreground">
              Export directly into an RPG Maker MZ map event.
            </p>

            {/* Project Selection */}
            <div className="mb-3">
              <label className="mb-1 block text-sm text-muted-foreground">Project</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={projectPath || ''}
                  readOnly
                  className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
                  placeholder="No project selected"
                />
                <button
                  onClick={handleSelectProject}
                  className="rounded bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
                >
                  Browse
                </button>
              </div>
            </div>

            {/* Map Selection */}
            <div className="mb-3">
              <label className="mb-1 block text-sm text-muted-foreground">Map</label>
              <select
                value={selectedMapId || ''}
                onChange={(e) => setSelectedMapId(e.target.value ? parseInt(e.target.value, 10) : null)}
                disabled={!projectPath || isLoading}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">-- Select Map --</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}: {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Selection */}
            <div className="mb-3">
              <label className="mb-1 block text-sm text-muted-foreground">Event</label>
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(e.target.value ? parseInt(e.target.value, 10) : null)}
                disabled={!selectedMapId || isLoading}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">-- Select Event --</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.id}: {e.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Selection */}
            <div className="mb-3">
              <label className="mb-1 block text-sm text-muted-foreground">Page</label>
              <select
                value={selectedPageIndex}
                onChange={(e) => setSelectedPageIndex(parseInt(e.target.value, 10))}
                disabled={!selectedEventId || isLoading}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {Array.from({ length: pageCount }, (_, i) => (
                  <option key={i} value={i}>
                    Page {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Error display */}
            {error && (
              <div className="mb-3 rounded bg-destructive/10 p-2 text-sm text-destructive">{error}</div>
            )}

            {/* Export Button */}
            <button
              onClick={handleExportToMap}
              disabled={!selectedMapId || !selectedEventId || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isLoading ? 'Exporting...' : 'Export to Map'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
