import { X, Keyboard, Mouse, FileText, HelpCircle } from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-[600px] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HelpCircle className="h-5 w-5" />
            MZ Interaction Builder - Help
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(80vh-60px)] overflow-y-auto p-4">
          {/* Keyboard Shortcuts */}
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Keyboard className="h-4 w-4" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded bg-muted p-3">
                <div><kbd className="rounded bg-background px-2 py-0.5">Ctrl+N</kbd> New file</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Ctrl+O</kbd> Open file</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Ctrl+S</kbd> Save file</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Ctrl+Z</kbd> Undo</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Ctrl+Y</kbd> Redo</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Ctrl+Shift+Z</kbd> Redo</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Delete</kbd> Delete node</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Backspace</kbd> Delete node</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Ctrl+C</kbd> Copy node</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">Ctrl+V</kbd> Paste node</div>
                <div><kbd className="rounded bg-background px-2 py-0.5">F1</kbd> Help</div>
              </div>
            </div>
          </section>

          {/* Mouse Controls */}
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Mouse className="h-4 w-4" />
              Mouse Controls
            </h3>
            <div className="space-y-2 text-sm">
              <div className="rounded bg-muted p-3">
                <ul className="space-y-1">
                  <li><strong>Drag from palette</strong> - Add new node to canvas</li>
                  <li><strong>Click node</strong> - Select node for editing</li>
                  <li><strong>Drag node</strong> - Move node on canvas</li>
                  <li><strong>Drag from handle</strong> - Connect nodes</li>
                  <li><strong>Click canvas</strong> - Deselect node</li>
                  <li><strong>Scroll wheel</strong> - Zoom in/out</li>
                  <li><strong>Right-drag / Middle-drag</strong> - Pan canvas</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Node Types */}
          <section className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <FileText className="h-4 w-4" />
              Node Types
            </h3>
            <div className="space-y-2 text-sm">
              <div className="rounded border border-green-500/30 bg-green-500/10 p-3">
                <strong className="text-green-500">Start Node</strong>
                <p className="text-muted-foreground">Entry point of the interaction. Every interaction needs exactly one Start node.</p>
              </div>
              <div className="rounded border border-purple-500/30 bg-purple-500/10 p-3">
                <strong className="text-purple-500">Choice Menu Node</strong>
                <p className="text-muted-foreground">Displays choices to the player. Each choice has its own output handle. Supports hide/disable conditions.</p>
              </div>
              <div className="rounded border border-blue-500/30 bg-blue-500/10 p-3">
                <strong className="text-blue-500">Action Node</strong>
                <p className="text-muted-foreground">Executes actions: scripts, set variables, set switches, common events, show text, or plugin commands.</p>
              </div>
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                <strong className="text-amber-500">Condition Node</strong>
                <p className="text-muted-foreground">Branches based on switches, variables, or scripts. Has True (green) and False (red) outputs.</p>
              </div>
              <div className="rounded border border-red-500/30 bg-red-500/10 p-3">
                <strong className="text-red-500">End Node</strong>
                <p className="text-muted-foreground">Exit point of the interaction. Terminates the current branch.</p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section>
            <h3 className="mb-3 font-semibold">Tips</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Load your RPG Maker project first to enable switch/variable dropdowns</li>
              <li>Connect back to earlier nodes to create loops</li>
              <li>Use hide conditions to show choices only when conditions are met</li>
              <li>Use disable conditions to gray out choices but still show them</li>
              <li>Auto-save is enabled when the file has been saved at least once</li>
              <li>Export directly to a map event or copy commands to clipboard</li>
            </ul>
          </section>

          {/* About */}
          <section className="mt-6 border-t border-border pt-4">
            <p className="text-center text-sm text-muted-foreground">
              <strong>MZ Interaction Builder</strong> v1.0.0<br />
              Visual node-graph editor for RPG Maker MZ interactions
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
