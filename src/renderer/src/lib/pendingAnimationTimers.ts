/**
 * Shared registry of in-flight node-animation timers (entrance flash, paste
 * flash). Tracking them here lets the canvas cancel pending timers on unmount
 * so detached-element closures are released immediately instead of lingering
 * for the full animation window.
 */
export const pendingAnimationTimers = new Set<ReturnType<typeof setTimeout>>();

export function clearPendingAnimationTimers(): void {
  for (const id of pendingAnimationTimers) clearTimeout(id);
  pendingAnimationTimers.clear();
}
