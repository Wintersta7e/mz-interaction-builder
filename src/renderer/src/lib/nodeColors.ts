import type { InteractionNodeType } from "../types";

/** Accent colors for each node type — single source of truth. */
export const NODE_ACCENT_COLORS: Record<InteractionNodeType, string> = {
  start: "#34d399",
  menu: "#a78bfa",
  action: "#38bdf8",
  condition: "#fbbf24",
  end: "#fb7185",
  group: "#60a5fa",
  comment: "#f59e0b",
};
