import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

export interface SelectItem {
  id: number
  name: string
}

export interface SearchableSelectProps {
  items: SelectItem[]
  value: number | null
  onChange: (id: number) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const VISIBLE_WINDOW = 20

function formatId(id: number): string {
  return String(id).padStart(4, '0')
}

function formatItem(item: SelectItem): string {
  const label = item.name || '(unnamed)'
  return `${formatId(item.id)}: ${label}`
}

function filterItems(items: SelectItem[], search: string): SelectItem[] {
  if (!search) return items
  const lower = search.toLowerCase()
  return items.filter((item) => {
    const nameMatch = item.name.toLowerCase().includes(lower)
    const idMatch = /^\d+$/.test(search) && formatId(item.id).includes(search)
    return nameMatch || idMatch
  })
}

export function SearchableSelect({
  items,
  value,
  onChange,
  placeholder,
  className,
  disabled
}: SearchableSelectProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedItem = useMemo(
    () => (value !== null ? items.find((item) => item.id === value) ?? null : null),
    [items, value]
  )

  const filtered = useMemo(() => filterItems(items, searchText), [items, searchText])

  // Compute the visible window slice for simple virtualization
  const visibleStart = useMemo(() => {
    if (filtered.length <= VISIBLE_WINDOW) return 0
    const half = Math.floor(VISIBLE_WINDOW / 2)
    const start = Math.max(0, highlightIndex - half)
    return Math.min(start, filtered.length - VISIBLE_WINDOW)
  }, [filtered.length, highlightIndex])

  const visibleItems = useMemo(
    () => filtered.slice(visibleStart, visibleStart + VISIBLE_WINDOW),
    [filtered, visibleStart]
  )

  // Close dropdown on click outside
  useEffect(() => {
    function handleMouseDown(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearchText('')
        setHighlightIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || highlightIndex < 0 || !listRef.current) return
    const adjustedIndex = highlightIndex - visibleStart
    const el = listRef.current.children[adjustedIndex] as HTMLElement | undefined
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [highlightIndex, isOpen, visibleStart])

  const handleOpen = useCallback(() => {
    if (disabled) return
    setIsOpen(true)
    setSearchText('')
    setHighlightIndex(-1)
  }, [disabled])

  const handleSelect = useCallback(
    (id: number) => {
      onChange(id)
      setIsOpen(false)
      setSearchText('')
      setHighlightIndex(-1)
    },
    [onChange]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          handleOpen()
          e.preventDefault()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (highlightIndex >= 0 && highlightIndex < filtered.length) {
            handleSelect(filtered[highlightIndex].id)
          }
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setSearchText('')
          setHighlightIndex(-1)
          break
      }
    },
    [isOpen, filtered, highlightIndex, handleOpen, handleSelect]
  )

  const displayValue = isOpen ? searchText : selectedItem ? formatItem(selectedItem) : ''

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        disabled={disabled}
        className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
        placeholder={placeholder}
        value={displayValue}
        onFocus={handleOpen}
        onChange={(e) => {
          setSearchText(e.target.value)
          setHighlightIndex(-1)
        }}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-[240px] w-full overflow-y-auto rounded border border-border bg-card shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No matches</div>
          ) : (
            visibleItems.map((item) => {
              const actualIndex = visibleStart + visibleItems.indexOf(item)
              const isHighlighted = actualIndex === highlightIndex
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`cursor-pointer px-2 py-1.5 text-sm ${
                    isHighlighted ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(item.id)
                  }}
                  onMouseEnter={() => setHighlightIndex(actualIndex)}
                >
                  {formatItem(item)}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
