# Changelog

## [2.0.1] - 2026-02-20

### Fixed
- Release now builds as portable exe with custom app icon and file association icon
- Switched from NSIS installer to portable-only format
- Old releases auto-cleaned (keeps latest 3)

## [2.0.0] - 2026-02-19

### Added

#### Visual Overhaul (Phase 2)
- Dark theme — blue-tinted palette with Inter and JetBrains Mono fonts
- Node visual upgrade — accent color strips, glassmorphism panels, glow selection
- Color-coded edge system — SVG gradients, animated dashes on hover, pill labels
- Enhanced minimap with accent-colored nodes and styled controls
- Inline node previews — Action, Condition, and Menu nodes show content summaries on canvas
- Comment/Note node — non-functional annotation with dashed amber border, resizable

#### Workflow (Phase 1)
- Canvas context menu — right-click to add nodes at cursor position
- Quick-add hotkeys — press 1-7 to create node types at viewport center
- Multi-select — drag rectangle selection, bulk delete, bulk copy/paste with edge remapping

#### Navigation (Phase 3)
- Search panel — Ctrl+F with match cycling and highlight pulse
- Path highlighting — Alt+Click upstream, Shift+Alt+Click downstream
- Bookmarks — B hotkey, star indicator, collapsible panel
- Breadcrumb trail — shortest path from Start to selected node
- Zoom-to-fit — Ctrl+0 Fit All, Ctrl+1 Fit Selection, Home Fit to Start

#### Organizing (Phase 4)
- Auto-layout engine — dagre-based LR/TB layout with configurable spacing
- Alignment tools — 6 align modes + 2 distribute operations, floating toolbar, Alt+shortcuts
- Snap-to-grid toggle — Ctrl+G hotkey, dynamic grid dots overlay
- Group/frame nodes — visual containers with 6 color presets, resizable
- Smart alignment guides — 5px snap threshold, SVG overlay during drag

#### Performance (Phase 5)
- SearchableSelect component with virtualized dropdowns for large lists
- Input debouncing via `useDebouncedSync` hook
- Node component memoization with custom equality checks

#### Infrastructure
- GitHub Actions CI (typecheck + lint + test + build)
- GitHub Actions Release (auto-publish Windows installer on `v*` tags)
- Dependabot for weekly dependency updates
- 85 unit tests across 8 test files (Vitest + React Testing Library)
- Comprehensive user guide (`docs/USER_GUIDE.md`)

### Changed
- 7 node types (added Group and Comment) — up from 5
- Removed all `any` type casts — fully typed Canvas, edges, and store selectors
- Edge animation restricted to hover-only for performance
- SVG gradients use `objectBoundingBox` units for correct scaling
- Zustand selectors use `useCallback` with targeted subscriptions
- Upgraded to Electron 40, React 19, Vite 7, Zustand 5, @xyflow/react 12

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
