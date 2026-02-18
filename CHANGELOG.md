# Changelog

## [Unreleased]

### Added
- Dark theme overhaul — blue-tinted palette with Inter and JetBrains Mono fonts
- Node visual upgrade — accent color strips, glassmorphism panels, glow selection
- Color-coded edge system — SVG gradients, animated dashes on hover, pill labels
- Enhanced minimap with accent-colored nodes and styled controls
- Canvas context menu — right-click to add nodes at cursor position
- Quick-add hotkeys — press 1-5 to create node types at viewport center
- Multi-select — drag rectangle selection, bulk delete, bulk copy/paste with edge remapping
- Graph traversal library — BFS upstream, downstream, shortest path
- Search panel — Ctrl+F with match cycling and highlight pulse
- Path highlighting — Alt+Click upstream, Shift+Alt+Click downstream
- Bookmarks — B hotkey, star indicator, collapsible panel
- Breadcrumb trail — shortest path from Start to selected node
- Zoom-to-fit — Ctrl+0 Fit All, Ctrl+1 Fit Selection, Home Fit to Start
- SearchableSelect component with virtualized dropdowns for large lists
- Input debouncing via `useDebouncedSync` hook
- Node component memoization with custom equality checks
- `parseIntSafe` utility for safe integer parsing
- 42 unit tests across 5 test files (Vitest + React Testing Library)

### Changed
- Removed `any` type casts — fully typed Canvas, edges, and store selectors
- Edge animation restricted to hover-only for performance
- SVG gradients use `objectBoundingBox` units for correct scaling
- Zustand selectors use `useCallback` with targeted subscriptions

### Fixed
- Clipboard paste creating duplicate IDs when source still exists
- Drag operations recording undo history before drop completes
- Context menu overflowing viewport bounds
- Auto-save failure not surfacing user notification
- Project load warnings silently swallowed
- SearchableSelect index off-by-one with filtered results
- ConditionNode display showing raw data instead of formatted condition

## [1.0.0] - 2026-02-17

### Added
- Initial release
- Visual node-graph editor with drag-and-drop interface
- 5 node types: Start, Choice Menu, Action, Condition, End
- Choice menus with unlimited choices, hide/disable conditions
- Action node supporting Script, Set Variable, Set Switch, Common Event, Show Text, Plugin Command
- Condition node branching on Switch, Variable, or Script expression
- Export pipeline generating RPG Maker MZ event commands
- Dynamic menu export with `$gameMessage.setChoices()` for conditional choices
- Direct export to RPG Maker map events
- Copy as JSON for manual event pasting
- Variable presets for Relationship and Time systems
- RPG Maker project integration — load switches, variables, common events, maps
- Undo/redo with 20-entry history
- Copy/paste nodes with Ctrl+C/Ctrl+V
- Auto-save every 30 seconds
- Real-time validation warnings
- Help system (F1) with keyboard shortcuts and node reference
- `.mzinteraction` file format with bookmarks and variables
