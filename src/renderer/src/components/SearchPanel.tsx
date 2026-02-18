import { useCallback, useEffect, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import { useUIStore } from '../stores'

interface SearchPanelProps {
  onNavigateToNode: (nodeId: string) => void
}

export function SearchPanel({ onNavigateToNode }: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTerm = useUIStore((s) => s.searchTerm)
  const searchMatches = useUIStore((s) => s.searchMatches)
  const searchCurrentIndex = useUIStore((s) => s.searchCurrentIndex)
  const setSearchTerm = useUIStore((s) => s.setSearchTerm)
  const setSearchCurrentIndex = useUIStore((s) => s.setSearchCurrentIndex)
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Navigate to current match
  useEffect(() => {
    if (searchMatches.length > 0 && searchCurrentIndex >= 0) {
      onNavigateToNode(searchMatches[searchCurrentIndex])
    }
  }, [searchCurrentIndex, searchMatches, onNavigateToNode])

  const cycleNext = useCallback(() => {
    if (searchMatches.length === 0) return
    setSearchCurrentIndex((searchCurrentIndex + 1) % searchMatches.length)
  }, [searchMatches.length, searchCurrentIndex, setSearchCurrentIndex])

  const cyclePrev = useCallback(() => {
    if (searchMatches.length === 0) return
    setSearchCurrentIndex(
      (searchCurrentIndex - 1 + searchMatches.length) % searchMatches.length
    )
  }, [searchMatches.length, searchCurrentIndex, setSearchCurrentIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) cyclePrev()
        else cycleNext()
      }
    },
    [setSearchOpen, cycleNext, cyclePrev]
  )

  return (
    <div className="absolute left-1/2 top-3 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card/95 px-3 py-2 shadow-xl backdrop-blur-md">
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search nodes..."
        className="w-48 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
      {searchTerm && (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {searchMatches.length > 0
            ? `${searchCurrentIndex + 1} of ${searchMatches.length}`
            : 'No matches'}
        </span>
      )}
      <button
        onClick={cyclePrev}
        disabled={searchMatches.length === 0}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      <button
        onClick={cycleNext}
        disabled={searchMatches.length === 0}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <button
        onClick={() => setSearchOpen(false)}
        className="rounded p-0.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
