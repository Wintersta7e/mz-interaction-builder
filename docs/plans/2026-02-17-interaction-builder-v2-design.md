# MZ Interaction Builder v2 — Design Document

**Date:** 2026-02-17
**Status:** Approved
**Scope:** 6-phase enhancement covering speed, visuals, navigation, organization, performance, and testing.

## Context

The Interaction Builder is a working visual node-graph editor for RPG Maker MZ dialogue trees. Version 1 (completed Feb 2026) delivers core functionality: 5 node types, export pipeline, undo/redo, copy/paste, validation, auto-save. See `InitialPlan.md` for v1 scope.

This design addresses the next evolution: missing workflow features, dated visuals, performance bottlenecks (tracked in `code-review.md` as PERF-001/002/003 and QUALITY-001), and the lack of in-app testing.

### Research Sources

Visual design patterns drawn from: n8n, Rivet, Langflow, ComfyUI, BuildShip, FigJam, Yarn Spinner, Twine, articy:draft, Chat Mapper, Dialogue System for Unity. React Flow v12 implementation techniques validated against @xyflow/react documentation and Chromium/Electron SVG capabilities.

---

## Phase 1: SPEED — Faster Node Creation and Editing

### 1A. Canvas Context Menu

Right-click on canvas opens a radial/list menu to add nodes without the palette.

- **Trigger:** Right-click on empty canvas space
- **Options:** Start, Choice Menu, Action, Condition, End (with icons and accent colors)
- **Behavior:** Node created at click position. Menu dismissed on selection or click-outside/Escape
- **Right-click on node:** Shows node-specific actions — Delete, Duplicate, Mute (Phase 5), Bookmark (Phase 3), Preview from Here (Phase 6)
- **Right-click on edge:** Delete Edge, Add Node on Edge (splits edge, inserts new node between source and target)

### 1B. Quick-Add Hotkeys (1–5)

Number keys create nodes at the center of the current viewport.

| Key | Node |
|-----|------|
| 1 | Start |
| 2 | Choice Menu |
| 3 | Action |
| 4 | Condition |
| 5 | End |

Only active when canvas is focused and no text input has focus. Node placed at viewport center.

### 1C. Multi-Select and Bulk Operations

- **Selection:** `Shift+Click` to add/remove from selection, drag-select rectangle (enable React Flow's `selectNodesOnDrag`)
- **Bulk copy/paste:** `Ctrl+C` copies all selected nodes + internal edges. `Ctrl+V` pastes as a group offset by (20, 20). New IDs generated, internal edge references remapped.
- **Bulk delete:** `Delete` key removes all selected nodes + their connected edges
- **Bulk move:** Drag any node in the selection to move all selected nodes together (React Flow handles this natively with multi-select enabled)
- **Implementation:** Replace single `clipboardRef` with `InteractionNode[]` + `InteractionEdge[]` clipboard. Update Canvas.tsx copy/paste handlers.

### 1D. Node Templates

Save and reuse common node configurations.

- **Save template:** Right-click a node (or multi-selection) → "Save as Template"
- **Template storage:** JSON array in localStorage, keyed by template name
- **Load template:** Context menu → "Templates" submenu, or a Templates section in the node palette
- **Scope:** Single-node templates (e.g., "Add Affection +5" action) and multi-node templates (e.g., a standard greeting flow: Menu → 3 choices → actions)

---

## Phase 2: READABILITY — Premium Visual Upgrade

### 2A. Dark Theme Overhaul

| Element | Current | New |
|---------|---------|-----|
| Background | `hsl(240 10% 3.9%)` (pure gray) | `hsl(230 25% 7%)` (blue-tinted dark) |
| Card/Surface | `hsl(240 10% 3.9%)` | `hsl(230 20% 11%)` |
| Border | `hsl(240 3.7% 15.9%)` | `hsl(230 15% 18%)` |
| Font | Segoe UI | Inter (400/500/600) + JetBrains Mono for script fields |
| Border Radius | `0.5rem` (8px) | `0.75rem` (12px) |
| Canvas Grid | Line grid (default) | Dot grid with `hsl(230 15% 15%)` dots |

### 2B. Node Visual Upgrade

- **Header:** Thin 3-4px accent strip at top (replaces full solid header bar)
- **Body:** `hsl(230 20% 11%)` with subtle glassmorphism (`backdrop-filter: blur(8px)`)
- **Border:** 1px solid at 30% opacity of accent color (replaces hard 2px border)
- **Shadow resting:** `0 4px 12px hsl(0 0% 0% / 0.3)`
- **Shadow hover:** `0 8px 24px hsl(0 0% 0% / 0.4)` with subtle translateY(-1px) lift
- **Selection:** Two-layer box-shadow — crisp 2px ring + 15px soft bloom in accent color (replaces Tailwind `ring-2`)
- **Handles:** Glow on hover with `scale(1.4)` + `box-shadow: 0 0 8px hsl(accent / 0.5)`

**Node accent colors:**

| Node | Color | Hex |
|------|-------|-----|
| Start | Emerald | `#34d399` |
| Menu | Violet | `#a78bfa` |
| Action | Sky Blue | `#38bdf8` |
| Condition | Amber | `#fbbf24` |
| End | Rose | `#fb7185` |

### 2C. Edge System

**Color by type:**
- Default: `hsl(230 5% 65% / 0.5)` muted
- Choice edges (from menu): gradient from violet → target node color
- Condition True: `#34d399` (emerald)
- Condition False: `#fb7185` (rose)

**Gradient stroke:** SVG `<linearGradient>` with `gradientUnits="userSpaceOnUse"`, flowing from source node accent to target node accent.

**Animation:** Flowing dash (`stroke-dasharray: 6 4`, CSS keyframe on `stroke-dashoffset` at 0.6s). GPU-composited, safe for all edges.

**States:**
- Hover: 80% opacity + 3px width + subtle `drop-shadow` glow
- Selected: Full opacity + accent glow filter + 3px width

**Edge labels:** Pill badges via `EdgeLabelRenderer` — "True"/"False" for condition edges, choice text for menu edges. 0.6 opacity at rest, 1.0 on hover.

**Connection line:** Dashed animated in primary blue with `drop-shadow` glow, colored from source node's accent.

**Custom edge components:** New `edges/` directory alongside `nodes/`. Registered via `edgeTypes` prop on `<ReactFlow>`. Edge type assigned in `onConnect` based on source node type and handle ID.

**Performance notes:**
- SVG filters only on hovered/selected edges
- Dash animations on all edges (CSS-only, GPU-composited)
- Gradient `<defs>` scale to 100+ edges in Chromium

### 2D. Enhanced MiniMap

- Glassmorphism: `background: hsl(230 20% 11% / 0.6)` + `backdrop-filter: blur(12px) saturate(150%)`
- 1px border at 30% opacity, 12px border radius
- Node colors mapped to accent colors via `nodeColor` prop
- `nodeBorderRadius={4}` for softened rectangles
- Viewport indicator: primary color border at 30% opacity
- `pannable` + `zoomable` enabled
- Size: 180×120px with 12px margin

### 2E. Inline Node Previews

| Node | Preview Content |
|------|----------------|
| Menu | First 2-3 choice texts (truncated), choice count badge |
| Action | Action type icon + short summary (e.g., "Set Variable: Gold +10") |
| Condition | Condition summary (e.g., "Switch 5 == ON") |
| Start | Label only |
| End | Label only |

Text: 11px Inter, `hsl(230 10% 65%)`, max 2-3 lines with ellipsis.

### 2F. Comment/Note Node

Non-functional annotation node for documenting the graph.

- **Visual:** Translucent card with dashed border, no handles, excluded from export/validation
- **Color:** `hsl(45 30% 60% / 0.15)` background, `hsl(45 30% 60%)` dashed border
- **Content:** Title + multiline text area
- **Resizable:** Draggable corner handle
- **Excluded from:** Export, validation, traversal, auto-layout

---

## Phase 3: NAVIGATION — Finding and Traversing Large Graphs

### 3A. Search / Find (Ctrl+F)

Floating search bar at top-center of canvas (overlay with glassmorphism).

**Searches:** Node labels, choice text, script content, variable/switch names, comment text.

**Behavior:**
- "3 of 7 matches" counter with up/down arrows
- Current match: pan + zoom to node, highlight pulse
- Other matches: dimmer highlight ring
- Fuzzy/substring matching
- `Ctrl+F` opens, `Enter`/`Shift+Enter` cycles, `Escape` closes

### 3B. Edge Path Highlighting

- Select node → all upstream paths from Start highlighted (BFS/DFS traversal)
- `Alt` + select → downstream paths highlighted
- Non-highlighted elements dim to 20-30% opacity
- CSS class toggle on React Flow container + per-element override

### 3C. Bookmarks

- `B` or right-click → "Bookmark this node"
- Small star icon in bookmarked node's corner
- Collapsible bookmark panel in bottom-left with clickable names
- Click bookmark → pan and zoom to node
- Stored as node ID array in document (persisted in `.mzinteraction` file)

### 3D. Zoom-to-Fit

- **Fit All** (`Ctrl+0`): Zoom to show all nodes
- **Fit Selection** (`Ctrl+1`): Zoom to selected nodes only
- **Fit to Start** (`Home`): Pan to Start node, reset zoom to 100%
- Uses React Flow `fitView()` and `fitBounds()` APIs

### 3E. Breadcrumb Trail

Small bar below toolbar showing shortest path from Start to selected node.

Format: `Start → Menu: "Talk to Sara" → Choice: "Ask about school" → Action: "Add Affection"`

- Each breadcrumb clickable (pans to node)
- Truncates at 5+ nodes (first 2 + "..." + last 2)
- Disappears when no node selected
- Computed via BFS on selection change

---

## Phase 4: ORGANIZING — Layout and Structure

### 4A. Auto-Layout (Dagre)

One-click automatic node arrangement using the `dagre` package.

**Settings (popover):**

| Option | Default |
|--------|---------|
| Direction | Left-to-Right |
| Node spacing | 80px |
| Rank spacing | 200px |
| Align | Center |

- Toolbar button + `Ctrl+Shift+L`
- Animated 300ms transition to new positions
- History entry created before layout (undoable)
- Start node forced leftmost, End nodes rightmost
- Comment nodes excluded from layout

### 4B. Alignment & Distribution

Floating toolbar on 2+ node selection (Figma-style):
- Align: Left / Center / Right / Top / Middle / Bottom
- Distribute: Horizontally / Vertically
- Shortcuts: `Alt+L/C/R/T/M/B`
- Single history entry per operation

### 4C. Snap-to-Grid

- Toggle: `Ctrl+G` or toolbar button
- 20px grid snap
- Dot grid brightens when active
- Persisted in UI store
- Uses React Flow's `snapToGrid` / `snapGrid` props

### 4D. Group/Frame Nodes

Visual containers for organizing related nodes.

- Translucent rounded rectangle with title bar
- Background: `hsl(230 20% 11% / 0.3)`, dashed border
- 6 preset colors (blue, green, purple, amber, rose, gray)
- Resizable via corner/edge drag handles
- Child nodes move with group
- Collapsible (title bar + count badge only)
- Excluded from export
- Lowest z-index (behind all nodes)
- Uses React Flow's native parent-child node relationships

### 4E. Smart Alignment Guides

- Drag a node → thin blue dashed lines appear when aligned with other nodes
- Checks top/center/bottom and left/center/right alignment
- 5px magnetic snap threshold
- Only compares against viewport-visible nodes (performance safe at 100+)

---

## Phase 5: POLISH — Performance and Quality-of-Life

### 5A. Input Debouncing (PERF-003)

Custom `useDebouncedSync(storeValue, commitFn, delay)` hook.

- Local state updates instantly (no typing lag)
- Commits to Zustand store after 300ms idle
- Commits immediately on blur
- History entry only on commit
- Applied to all text/script fields in PropertiesPanel

### 5B. Virtualized Dropdowns (PERF-002)

Custom `SearchableSelect` component replacing all `<select>` elements for switches/variables.

- Text input for type-to-search by name or ID
- Virtualized list (~20 visible items) via `react-window` or CSS `content-visibility`
- Keyboard navigation (arrows + Enter)
- "ID: Name" format (e.g., "0042: Player Gold")
- Grouped by range (1-100, 101-200, etc.)

### 5C. Selective Re-renders (PERF-001)

Layered optimization:

1. **Zustand selectors:** Each node subscribes to its own data only
2. **React.memo:** All 5 node components + custom equality on `data` prop
3. **Edge memoization:** Custom `areEqual` for edge components
4. **Debounced canvas sync:** Store → React Flow sync batched

Target: O(1) re-renders for single-node edits, responsive at 200+ nodes.

### 5D. Type Safety (QUALITY-001)

Remove `any` casts in Canvas.tsx:
- `onNodesChange`/`onEdgesChange` → React Flow's `NodeChange[]`/`EdgeChange[]`
- `getDefaultNodeData()` → proper union return type
- `onConnect` → typed `InteractionEdge` construction
- Clipboard ref → `InteractionNode[] | null`

### 5E. Mute/Bypass Node

- Right-click → "Mute" or press `M` with node selected
- Visual: 30% opacity, dashed border, strikethrough title, muted badge
- Muted nodes skipped during export (edges pass through)
- Toggle: `M` again to unmute
- Data: `muted: boolean` on all node data interfaces

### 5F. Edge Reconnection

- Hover near edge endpoint → detach handle appears
- Drag to new handle → edge reconnects
- Drop on empty → edge deleted (undoable)
- Uses React Flow v12's native `onReconnect` / `onReconnectStart` / `onReconnectEnd` props

---

## Phase 6: TESTING — Dialogue Preview and Playback

### 6A. Dialogue Preview Player

Slide-out panel styled like an RPG Maker dialogue window.

**Playback flow:**
1. Start node → begin
2. Action nodes → summary line, auto-advance (1s or click)
3. Menu nodes → clickable choice buttons (hidden/disabled conditions applied)
4. Condition nodes → auto-evaluate against simulated state, show result
5. Show Text actions → typewriter effect, advance on click
6. End node → "End of Interaction" + restart button

**Canvas integration:** Current node gets pulsing highlight ring, non-current elements dim.

**Controls:** Play / Step / Restart / Speed slider / Close. `Space` to advance, `1-9` for choices, `R` to restart.

### 6B. Simulated Variable State

Variable inspector panel alongside preview:
- Lists all referenced variables/switches (auto-detected from graph)
- Editable values (number inputs for variables, toggles for switches)
- "Reset All" button
- Live updates as preview runs
- Defaults: variables = 0, switches = OFF

**Script evaluation:** Sandboxed evaluator mocking `$gameVariables`, `$gameSwitches`, `$gameSelfSwitches` using simulated state. No RPG Maker runtime needed.

### 6C. Execution Log

Scrollable step-by-step log:
```
[1] Start → "Talk to Sara"
[2] Menu → Showed 3 choices (1 hidden)
[3] Choice → "Ask about school"
[4] Action → Set Variable 12 (Affection) += 5 → now 15
[5] Condition → Variable 12 >= 10 → TRUE
[6] End
```

- Entries clickable (highlights node on canvas)
- Color-coded by node type
- "Copy Log" button for text export

### 6D. Path Coverage Report

Coverage overlay after preview runs:
- Visited nodes: green checkmark badge
- Unvisited nodes: amber tint + "Not tested" badge
- Coverage percentage: "12/18 nodes visited (67%)"
- Unvisited choice edges: amber dot
- Accumulates across multiple runs
- Session-only data (not saved to file)

### 6E. Quick Test from Node

- Right-click any node → "Preview from here"
- Starts playback at that node (skips everything before)
- Uses last simulated variable state or defaults
- Preview player accepts `startNodeId` parameter

---

## Keyboard Shortcut Summary

| Shortcut | Action | Phase |
|----------|--------|-------|
| `1-5` | Quick-add node by type | 1 |
| `Ctrl+F` | Search/Find | 3 |
| `B` | Bookmark selected node | 3 |
| `M` | Mute/unmute selected node | 5 |
| `Ctrl+0` | Fit all nodes | 3 |
| `Ctrl+1` | Fit selection | 3 |
| `Home` | Fit to Start node | 3 |
| `Ctrl+G` | Toggle snap-to-grid | 4 |
| `Ctrl+Shift+L` | Auto-layout | 4 |
| `Alt+L/C/R` | Align left/center/right | 4 |
| `Alt+T/M/B` | Align top/middle/bottom | 4 |
| `Space` | Advance preview | 6 |
| `R` | Restart preview | 6 |

---

## File Format Changes

The `.mzinteraction` document gains:
- `bookmarks: string[]` — bookmarked node IDs
- Node data: `muted?: boolean` on all node types
- New node type: `comment` with `CommentNodeData`
- New node type: `group` with `GroupNodeData`
- Version bump to `"2.0.0"` with migration logic for v1 files

---

## Dependencies

| Package | Purpose | Phase |
|---------|---------|-------|
| `dagre` | Auto-layout algorithm | 4 |
| `react-window` | Virtualized dropdown lists | 5 |
| `@fontsource/inter` | Inter font (or CDN) | 2 |
| `@fontsource/jetbrains-mono` | Monospace font (or CDN) | 2 |

No other new dependencies. All edge/node/animation features use React Flow v12 built-in APIs + CSS.

---

## Implementation Priority

Recommended build order (respects dependencies between phases):

1. **Phase 5A-5D** (Performance fixes) — unblocks smooth development of everything else
2. **Phase 2A-2B** (Theme + node visuals) — foundation for all other visual work
3. **Phase 2C-2D** (Edges + minimap) — depends on new theme colors
4. **Phase 1C** (Multi-select) — unblocks alignment tools and bulk operations
5. **Phase 1A-1B** (Context menu + hotkeys) — quick wins
6. **Phase 3A-3E** (Navigation features)
7. **Phase 4A-4E** (Organization features)
8. **Phase 2E-2F** (Inline previews + comment nodes)
9. **Phase 1D** (Templates)
10. **Phase 5E-5F** (Mute + edge reconnect)
11. **Phase 6A-6E** (Preview system — largest single feature, built last)
