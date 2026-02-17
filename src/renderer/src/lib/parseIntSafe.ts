/**
 * Safe parseInt wrapper that returns undefined (or a fallback) instead of NaN.
 * Use this anywhere user input is parsed to a number before storing in state.
 */
export function parseIntSafe(value: string, fallback?: number): number | undefined {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? fallback : n
}
