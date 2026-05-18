/**
 * Shared registry of in-flight node-animation timers and rAF handles
 * (entrance flash, paste flash). Tracking them here lets the canvas cancel
 * pending callbacks on unmount so detached-element closures are released
 * immediately instead of lingering for the full animation window.
 */
export const pendingAnimationTimers = new Set<ReturnType<typeof setTimeout>>();
export const pendingAnimationFrames = new Set<number>();

export function clearPendingAnimationTimers(): void {
  for (const id of pendingAnimationFrames) cancelAnimationFrame(id);
  pendingAnimationFrames.clear();
  for (const id of pendingAnimationTimers) clearTimeout(id);
  pendingAnimationTimers.clear();
}
