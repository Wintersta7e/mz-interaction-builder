import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook that provides local state for immediate UI updates with debounced
 * commits to an external store (e.g., Zustand).
 *
 * - `localValue` updates instantly on `setLocalValue` (no typing lag)
 * - After `delay` ms of idle, `commitFn(localValue)` writes to the store
 * - `flush()` commits immediately (use on blur/Enter)
 * - When `storeValue` changes externally (undo/redo, file load), local syncs to it
 * - Timer resets on each `setLocalValue` call (debounce, not throttle)
 * - Cleans up timer on unmount
 */
export function useDebouncedSync<T>(
  storeValue: T,
  commitFn: (value: T) => void,
  delay: number = 300
): {
  localValue: T
  setLocalValue: (value: T) => void
  flush: () => void
} {
  const [localValue, setLocalState] = useState<T>(storeValue)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingValueRef = useRef<T | null>(null)
  const commitFnRef = useRef(commitFn)

  // Keep commitFn ref current to avoid stale closures
  commitFnRef.current = commitFn

  // Sync local value when store value changes externally
  useEffect(() => {
    setLocalState(storeValue)
    // Clear any pending debounce when store updates externally
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
      pendingValueRef.current = null
    }
  }, [storeValue])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const setLocalValue = useCallback(
    (value: T) => {
      setLocalState(value)
      pendingValueRef.current = value

      // Clear existing timer
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }

      // Set new debounce timer
      timerRef.current = setTimeout(() => {
        try {
          commitFnRef.current(value)
        } catch (e) {
          console.error('useDebouncedSync: commit failed', e)
        }
        timerRef.current = null
        pendingValueRef.current = null
      }, delay)
    },
    [delay]
  )

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (pendingValueRef.current !== null) {
      commitFnRef.current(pendingValueRef.current)
      pendingValueRef.current = null
    }
  }, [])

  return { localValue, setLocalValue, flush }
}
