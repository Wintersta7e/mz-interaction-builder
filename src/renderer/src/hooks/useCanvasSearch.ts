import { useEffect, type RefObject } from 'react'
import { useUIStore } from '../stores'
import { searchNodes } from '../lib/searchNodes'
import type { InteractionNode } from '../types'

/**
 * Manages search match computation (debounced) and DOM highlight effects.
 * Extracted from Canvas.tsx for separation of concerns.
 *
 * Returns { searchOpen } so Canvas can conditionally render SearchPanel.
 */
export function useCanvasSearch(
  wrapperRef: RefObject<HTMLDivElement | null>,
  nodes: InteractionNode[]
) {
  const searchOpen = useUIStore((s) => s.searchOpen)
  const searchTerm = useUIStore((s) => s.searchTerm)
  const searchMatches = useUIStore((s) => s.searchMatches)
  const searchCurrentIndex = useUIStore((s) => s.searchCurrentIndex)
  const setSearchResults = useUIStore((s) => s.setSearchResults)

  // Debounced search match computation (100ms)
  useEffect(() => {
    if (!searchOpen || !searchTerm.trim()) {
      setSearchResults([], 0)
      return
    }
    const timer = setTimeout(() => {
      const matches = searchNodes(nodes, searchTerm)
      setSearchResults(matches, matches.length > 0 ? 0 : -1)
    }, 100)
    return () => clearTimeout(timer)
  }, [searchTerm, searchOpen, nodes, setSearchResults])

  // Apply search highlight classes to DOM
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const cleanup = () => {
      wrapper
        .querySelectorAll('.search-highlight-current, .search-highlight-match')
        .forEach((el) => {
          el.classList.remove('search-highlight-current', 'search-highlight-match')
        })
    }

    cleanup()

    if (searchMatches.length === 0) return cleanup

    for (const nodeId of searchMatches) {
      const el = wrapper.querySelector(`[data-id="${nodeId}"]`)
      if (el) el.classList.add('search-highlight-match')
    }

    if (searchCurrentIndex >= 0 && searchCurrentIndex < searchMatches.length) {
      const currentId = searchMatches[searchCurrentIndex]
      const el = wrapper.querySelector(`[data-id="${currentId}"]`)
      if (el) {
        el.classList.remove('search-highlight-match')
        el.classList.add('search-highlight-current')
      }
    }

    return cleanup
  }, [searchMatches, searchCurrentIndex, wrapperRef])

  return { searchOpen }
}
