# MZ Interaction Builder — User Guide

A comprehensive guide to creating RPG Maker MZ character interactions using the visual node-graph editor.

---

## Table of Contents

- [Introduction](#introduction)
- [Interface Overview](#interface-overview)
- [Quick Start](#quick-start)
- [Node Types Reference](#node-types-reference)
  - [Start Node](#start-node)
  - [Choice Menu Node](#choice-menu-node)
  - [Action Node](#action-node)
  - [Condition Node](#condition-node)
  - [End Node](#end-node)
  - [Group Node](#group-node)
  - [Comment Node](#comment-node)
- [Working with the Canvas](#working-with-the-canvas)
- [Organizing Your Graph](#organizing-your-graph)
- [Navigation](#navigation)
- [Validation](#validation)
- [Exporting](#exporting)
- [Variable Presets](#variable-presets)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [File Format](#file-format)
- [Tips and Troubleshooting](#tips-and-troubleshooting)

---

## Introduction

MZ Interaction Builder is a visual node-graph editor for designing RPG Maker MZ character interactions. Instead of manually writing event commands, you build dialogue trees, branching choices, and game logic by connecting nodes on a canvas — then export directly to your RPG Maker project.

**Who is this for?**

- RPG Maker MZ developers who want a visual way to design complex interactions
- Dialogue writers who prefer seeing conversation flow as a graph
- Anyone building branching choice systems, NPC dialogues, or scripted sequences

**What can you build?**

- Simple linear dialogues (Start → Action → End)
- Branching choice menus with unlimited options
- Conditional logic based on switches, variables, or script expressions
- Looping conversations that return to earlier points
- Dynamic menus where choices appear or disappear based on game state
- Multi-step quest dialogues with variable tracking

---

## Interface Overview

<img src="../screenshots/ui-overview.png" alt="UI layout — node palette, canvas, and properties panel" width="600" />

The application uses a three-panel layout:

### Left Panel — Node Palette

A vertical list of the 7 available node types. Drag any node from this palette onto the canvas to add it to your graph. The palette also contains preset management for variable presets (see [Variable Presets](#variable-presets)).

### Center — Canvas

The main workspace. This is where you place nodes, draw connections, and arrange your interaction flow. The canvas supports panning, zooming, multi-selection, and right-click context menus.

**Above the canvas** you'll find the toolbar with buttons for:

- **File operations**: New, Open, Save
- **Edit operations**: Undo, Redo
- **Layout**: Auto-Layout (with direction/spacing settings), Snap-to-Grid toggle
- **View**: MiniMap toggle
- **Actions**: Validate, Export
- **Help**: Opens keyboard shortcuts and node reference (F1)

**Below the canvas** the status bar shows:

- Current file name and save state (dirty indicator)
- Node and edge count
- Zoom level

### Right Panel — Properties

When you select a node, this panel shows all editable properties for that node type. Changes are applied immediately to the canvas. When no node is selected, the panel shows document-level properties (name and description).

---

## Quick Start

Here's how to create a simple interaction in 5 steps:

### Step 1: Start with a Start Node

Every new document begins with a Start node already on the canvas. This is the entry point of your interaction — the first thing that happens when the player triggers the event.

### Step 2: Add a Choice Menu

Drag a **Choice Menu** node from the palette onto the canvas to the right of the Start node. Click it to select it, then in the Properties panel:

1. Click **"+ Add Choice"** to add choices
2. Type the text for each choice (e.g., "Ask about the quest", "Buy items", "Goodbye")

### Step 3: Connect Start to Menu

Hover over the green circle on the right edge of the Start node — this is the **output handle**. Click and drag from it to the purple circle on the left edge of the Menu node (the **input handle**). A colored connection line appears.

### Step 4: Add Actions and an End

For each choice, drag an **Action** node onto the canvas and connect the corresponding choice output (right side of the Menu node) to the Action's input. Then add **End** nodes after each Action.

For example:
- "Ask about the quest" → Action (Show Text: quest dialogue) → End
- "Buy items" → Action (Common Event: shop) → End
- "Goodbye" → End

### Step 5: Export

Click the **Export** button in the toolbar. You can either:

- **Copy as JSON** to paste into RPG Maker's event editor
- **Export to Map** to write directly into a map event

That's it! You've created a branching interaction.

---

## Node Types Reference

<img src="../screenshots/node-graph.png" alt="Node graph — Start, Choice Menu, Actions, and Comment node" width="680" />

Each node type has a distinct color and serves a specific purpose in your interaction flow.

### Start Node

| Property | Value |
|----------|-------|
| **Color** | Green |
| **Handles** | Output only (right side) |
| **Exported** | Yes |

The entry point for every interaction. When RPG Maker triggers the event, execution begins here and follows the output connection.

**Rules:**
- Every interaction needs exactly one Start node
- Having zero or multiple Start nodes produces a validation error

**Properties:**
- **Label** — Display name on the canvas (default: "Start")

---

### Choice Menu Node

| Property | Value |
|----------|-------|
| **Color** | Purple |
| **Handles** | Input (left), one output per choice (right) |
| **Exported** | Yes |

Displays a choice dialog to the player. Each choice gets its own output handle on the right side, allowing different branches per selection.

**Properties:**

- **Label** — Display name (default: "Choice Menu")
- **Choices** — An ordered list of options shown to the player
  - Click **"+ Add Choice"** to add a new choice
  - Use the arrow buttons to reorder choices
  - Click the trash icon to remove a choice
  - Each choice has a text field for the display text
- **Cancel Behavior** — What happens when the player presses cancel/B:
  - **Disallow** — Cancel button is ignored
  - **Branch** — Triggers a dedicated cancel branch
  - **Last Choice** — Selects the last choice in the list
- **Window Background** — RPG Maker window style:
  - **Window** (0) — Standard message window
  - **Dim** (1) — Semi-transparent dark background
  - **Transparent** (2) — No visible background
- **Window Position** — Where the choice box appears:
  - **Left** (0)
  - **Middle** (1)
  - **Right** (2)

**Choice Conditions:**

Each choice can optionally have:

- **Hide Condition** — When this condition is true, the choice is completely hidden from the menu. Indicated by an amber **H** badge on the node.
- **Disable Condition** — When this condition is true, the choice still appears but is grayed out and unselectable. Indicated by a red **D** badge on the node.

Both condition types support the same three modes: Switch, Variable, and Script (see [Condition Types](#condition-types) below).

When any choice has a hide or disable condition, the export switches to a [dynamic menu system](#conditional-choices-dynamic-menus).

---

### Action Node

| Property | Value |
|----------|-------|
| **Color** | Blue |
| **Handles** | Input (left), Output (right) |
| **Exported** | Yes |

Executes one or more game commands. An Action node can hold multiple actions that run in sequence. The node preview on the canvas shows up to 3 actions, with a "+N more" indicator for additional ones.

**Properties:**

- **Label** — Display name (default: "Action")
- **Actions** — An ordered list of commands. Click **"+ Add Action"** to add one.

**Action Types:**

#### Script
Execute arbitrary JavaScript code in RPG Maker.

- **Script** field — Multi-line text area for JavaScript code
- Preview shows the first 28 characters of the script

#### Set Variable
Change a game variable's value.

- **Variable** — Select from the project's variable list (or enter an ID manually)
- **Operation** — One of: `= (Set)`, `+= (Add)`, `-= (Subtract)`, `*= (Multiply)`, `/= (Divide)`, `%= (Modulo)`
- **Value** — The number to apply
- Preview: `Var #N += value`

#### Set Switch
Toggle a game switch.

- **Switch** — Select from the project's switch list (or enter an ID manually)
- **Value** — `ON`, `OFF`, or `Toggle`
- Preview: `Switch #N → ON/OFF`

#### Common Event
Call a common event by ID.

- **Common Event ID** — The numeric ID of the common event
- Preview: `Common Event #N`

#### Show Text
Display a message dialog to the player.

- **Face Name** — The face graphic filename (optional)
- **Face Index** — Which face in the sheet (0–7)
- **Background** — Window (0), Dim (1), or Transparent (2)
- **Position** — Top (0), Middle (1), or Bottom (2)
- **Message** — The text to display
- Preview: first 24 characters of the message in quotes

#### Plugin Command
Call a plugin command registered by an RPG Maker plugin.

- **Plugin Name** — The plugin's filename
- **Command Name** — The command to invoke
- **Arguments** — JSON object of command parameters (e.g., `{"arg1": "value1"}`)
- Preview: `pluginName:commandName`

---

### Condition Node

| Property | Value |
|----------|-------|
| **Color** | Amber |
| **Handles** | Input (left), True output (right, green), False output (right, red) |
| **Exported** | Yes |

Branches the flow based on a condition. The True branch follows one path, and the False branch follows another.

<a id="condition-types"></a>

**Condition Types:**

#### Switch Condition
Check whether a game switch is ON or OFF.

- **Switch** — Select from the project's switch list
- **Value** — `ON` or `OFF`

#### Variable Condition
Compare a game variable against a value using an operator.

- **Variable** — Select from the project's variable list
- **Operator** — `==`, `!=`, `>`, `<`, `>=`, `<=`
- **Compare Value** — The number to compare against

#### Script Condition
Evaluate a JavaScript expression that returns true or false.

- **Script** — JavaScript expression (e.g., `$gameVariables.value(1) > 0`)

---

### End Node

| Property | Value |
|----------|-------|
| **Color** | Red |
| **Handles** | Input only (left side) |
| **Exported** | Yes (stops graph traversal) |

Marks the end of a branch. When execution reaches an End node, the interaction stops. You can have multiple End nodes — one for each branch that terminates.

**Properties:**

- **Label** — Display name (default: "End")

---

### Group Node

| Property | Value |
|----------|-------|
| **Color** | Blue (default, 6 color options) |
| **Handles** | None |
| **Exported** | No (visual only) |

A visual container for organizing related nodes. Groups sit behind other nodes (lower z-index) and can be resized by dragging their edges. They are purely organizational — they do not affect export or connections.

**Properties:**

- **Label** — Display name (default: "Group")
- **Color** — Choose from 6 presets: Blue, Green, Purple, Amber, Rose, Gray

**Default size:** 400 x 300 pixels

Groups are excluded from auto-layout and validation connectivity checks.

---

### Comment Node

| Property | Value |
|----------|-------|
| **Color** | Amber (dashed border) |
| **Handles** | None |
| **Exported** | No (visual only) |

An annotation for documenting your graph. Use comments to leave notes, describe complex logic, or mark sections for future work. The node displays text directly on the canvas with a dashed amber border.

**Properties:**

- **Label** — Display name (default: "Note")
- **Note Text** — Multi-line text area for your notes (displayed on the node, clamped to 6 visible lines)

**Default size:** 200 x 100 pixels. Resizable (minimum 150 x 80).

Comments are excluded from auto-layout, export, and validation connectivity checks.

---

## Working with the Canvas

### Adding Nodes

There are three ways to add nodes:

1. **Drag from Palette** — Drag a node type from the left panel onto the canvas. The node appears where you drop it.
2. **Right-Click Context Menu** — Right-click on empty canvas space to open a context menu with all 7 node types. Click one to place it at the cursor position.
3. **Quick-Add Hotkeys** — Press keys `1` through `7` (without any modifier) to instantly create a node at the center of your current view:
   - `1` = Start, `2` = Menu, `3` = Action, `4` = Condition, `5` = End, `6` = Group, `7` = Comment

### Connecting Nodes

Connections (edges) define the flow of your interaction.

1. Hover over a node's **output handle** (circle on the right side)
2. Click and drag to another node's **input handle** (circle on the left side)
3. Release to create the connection

Connections are color-coded:
- **Green** gradient — True branch from a Condition node
- **Red** gradient — False branch from a Condition node
- **Purple** gradient — From a Choice Menu node
- **Other colors** — Gradient from source node's color to target node's color

### Selecting Nodes

- **Single select** — Click a node to select it and show its properties
- **Multi-select** — Click and drag on empty canvas space to draw a selection rectangle. All nodes that touch the rectangle are selected.
- **Deselect** — Click on empty canvas space

### Selecting Edges

- Click directly on a connection line to select it. Selected edges can be deleted with `Delete` or `Backspace`.

### Copy and Paste

- **Ctrl+C** copies all selected nodes and any edges between them
- **Ctrl+V** pastes the copied nodes offset by 20 pixels down and to the right
- Pasting repeatedly continues to offset, preventing overlap

### Deleting

- Select one or more nodes (or edges) and press **Delete** or **Backspace**
- This removes the selected items and any edges connected to deleted nodes
- Bookmarks on deleted nodes are automatically removed

### Moving Nodes

- Click and drag any node to reposition it
- With snap-to-grid enabled (**Ctrl+G**), nodes snap to a 16-pixel grid
- When dragging near other nodes, [alignment guides](#alignment-guides) appear to help you line things up

---

## Organizing Your Graph

### Auto-Layout

Automatically arrange all nodes in a clean layout using the dagre graph layout engine.

**How to use:**

1. Click the **Auto-Layout** button in the toolbar (or press **Ctrl+Shift+L**)
2. Optionally configure settings before applying:
   - **Direction**: Left-to-Right (LR) or Top-to-Bottom (TB)
   - **Node Spacing**: Distance between nodes in the same column/row (20–200, default: 80)
   - **Rank Spacing**: Distance between columns/rows (50–500, default: 200)

After layout, the view automatically fits all nodes with a smooth animation.

**Notes:**
- Group and Comment nodes are excluded from auto-layout and stay in place
- The layout uses actual measured node sizes for accurate positioning

### Alignment Tools

When 2 or more nodes are selected, a floating alignment toolbar appears above the selection.

**Align modes** (also available via `Alt` + key):

| Key | Mode | Effect |
|-----|------|--------|
| `Alt+L` | Align Left | Align left edges of all selected nodes |
| `Alt+C` | Align Center | Align horizontal centers |
| `Alt+R` | Align Right | Align right edges |
| `Alt+T` | Align Top | Align top edges |
| `Alt+M` | Align Middle | Align vertical centers |
| `Alt+B` | Align Bottom | Align bottom edges |

**Distribute modes** (available from the toolbar):

- **Distribute Horizontally** — Space nodes evenly left-to-right
- **Distribute Vertically** — Space nodes evenly top-to-bottom

### Snap-to-Grid

Toggle with **Ctrl+G**. When enabled, nodes snap to a 16-pixel grid as you drag them, making it easy to keep things aligned.

### Alignment Guides

When dragging a node, thin guide lines appear when the node's edges or center align with nearby nodes (within 5 pixels). This helps you visually align nodes without needing snap-to-grid.

---

## Navigation

### Search (Ctrl+F)

Press **Ctrl+F** to open the search panel at the top of the canvas.

- Type to search — matches node labels, choice text, action scripts/text, condition scripts, and comment text
- Search is case-insensitive
- Results show as **"N of M"** matches
- Press **Enter** to jump to the next match, **Shift+Enter** for the previous match
- The canvas smoothly pans and zooms to center each match
- Press **Escape** or click the X button to close search

### Bookmarks

Pin important nodes for quick navigation.

- **Add a bookmark**: Select a node and press **B**. A gold star appears on the node header.
- **Remove a bookmark**: Select the bookmarked node and press **B** again, or click the X on its bookmark entry.
- **Navigate to a bookmark**: Click its entry in the Bookmark panel (bottom-left corner of the canvas).
- The Bookmark panel appears automatically when you have at least one bookmark, showing each bookmarked node with its type icon and label.
- Bookmarks are saved with your `.mzinteraction` file.

### Breadcrumb Trail

When you select a node, a breadcrumb trail appears showing the shortest path from the Start node to the selected node. Click any node in the trail to navigate to it.

### Path Highlighting

Visually trace connections upstream or downstream from any node:

- **Alt+Click** a node — Highlights all nodes and edges upstream (leading to this node from Start)
- **Shift+Alt+Click** a node — Highlights all nodes and edges downstream (from this node to End)
- **Escape** — Clears all highlights

This is useful for understanding which paths lead to a particular node or seeing all possible outcomes from a choice.

### Zoom Controls

| Action | Effect |
|--------|--------|
| **Scroll wheel** | Zoom in/out (range: 25% to 200%) |
| **Ctrl+0** | Fit all nodes in view |
| **Ctrl+1** | Fit selected node(s) in view |
| **Home** | Jump to the Start node at 100% zoom |
| **MiniMap** | Toggle via toolbar — shows a small overview of the entire graph |

Panning: Right-click drag or middle-click drag to pan the canvas.

---

## Validation

<img src="../screenshots/validation.png" alt="Validation panel showing warnings" width="260" />

Click the **Validate** button in the toolbar to check your graph for issues. The validation panel lists all problems, grouped by severity.

### Validation Rules

| Severity | Rule | Message |
|----------|------|---------|
| **Error** | No Start node in the document | "No Start node found. Every interaction needs exactly one Start node." |
| **Error** | More than one Start node | "Multiple Start nodes found. Only one Start node is allowed." |
| Warning | A non-Start node has no incoming connections | "Node has no incoming connections (unreachable)." |
| Warning | A non-End node has no outgoing connections | "Node has no outgoing connections (dead end)." |
| Warning | A Menu choice has no output connection | "Choice N has no connection." |
| Warning | A Condition node has no True branch connection | "True branch has no connection." |
| Warning | A Condition node has no False branch connection | "False branch has no connection." |
| Warning | An Action node has no actions defined | "Action node has no actions defined." |

**Errors** prevent a valid export and should always be fixed. **Warnings** indicate potential issues but the graph can still be exported.

Click any issue in the list to jump to the affected node and select it for editing.

---

## Exporting

The toolbar's **Export** button opens the export dialog. There are two export modes:

### Copy as JSON

Generates RPG Maker MZ event commands and copies them to your clipboard.

1. Click **Export** in the toolbar
2. Review the generated commands in the preview
3. Click **"Copy to Clipboard"**
4. In RPG Maker MZ, open your event and paste the commands

### Export to Map

Writes the generated commands directly into a map event in your RPG Maker project.

1. Click **Export** in the toolbar
2. If you haven't loaded a project yet, click **"Select Project"** and choose your RPG Maker MZ project folder
3. Select the target **Map** from the dropdown
4. Select the target **Event** (the list updates based on the selected map)
5. Select the target **Page** (the list updates based on the selected event)
6. Click **"Export to Map"**
7. Reload the map in RPG Maker MZ to see the changes

**Note:** Loading an RPG Maker project also populates the switch and variable dropdowns throughout the app, making it easier to reference game data by name instead of ID.

### Conditional Choices (Dynamic Menus)

When any choice in a Menu node has a Hide or Disable condition, the export uses a script-based dynamic menu system instead of the standard Show Choices command.

**How it works:**

- **Hidden choices**: The menu is built at runtime. Choices whose hide condition evaluates to true are excluded entirely.
- **Disabled choices**: Choices whose disable condition evaluates to true are shown with gray text (`\C[8]` color code in RPG Maker) and cannot be selected.
- The system uses `$gameMessage.setChoices()` to construct the menu dynamically.

**Variable 99 Note:** Dynamic menus use RPG Maker Variable 99 as temporary storage for routing the player's choice to the correct branch. If your project already uses Variable 99 for something else, you'll need to change `TEMP_CHOICE_VAR` in the source code (`lib/export/index.ts`).

### Generated Event Codes

For reference, here are the RPG Maker event codes generated by each node type:

| Node/Action | Event Codes |
|-------------|-------------|
| Choice Menu | 102 (Show Choices), 402 (When [Choice]), 404 (Choice End) |
| Condition | 111 (Conditional Branch), 411 (Else), 412 (Branch End) |
| Action: Script | 355 (Script), 655 (Script continuation) |
| Action: Set Switch | 121 (Control Switches) |
| Action: Set Variable | 122 (Control Variables) |
| Action: Common Event | 117 (Common Event) |
| Action: Show Text | 101 (Show Text header), 401 (Text lines) |
| Action: Plugin Command | 357 (Plugin Command) |
| Loop support | 118 (Label), 119 (Jump to Label) |

**Convergence nodes** (nodes with multiple incoming connections) automatically use Labels and Jump to Label commands to ensure all paths reach them correctly without duplicating content.

---

## Variable Presets

Variable presets provide quick access to commonly used game variables and switches. They populate the dropdowns in Condition, Action, and Choice condition editors.

### Built-in Presets

#### Relationship System
Variables for managing character relationships.

| Name | Type | Getter/Setter |
|------|------|---------------|
| Get Affection | Variable | `Relationship.getAffection(charId)` |
| Get Corruption | Variable | `Relationship.getCorruption(charId)` |
| Get Stage | Variable | `Relationship.getStage(charId)` |
| Add Affection | Variable | `Relationship.addAffection(charId, amount)` |
| Add Corruption | Variable | `Relationship.addCorruption(charId, amount)` |
| Check Stage | Switch | `Relationship.checkStage(charId, stage)` |

#### Time System
Variables for time and energy management.

| Name | Type | RPG Maker ID | Getter |
|------|------|-------------|--------|
| Time Slot | Variable | 3 | `$gameVariables.value(3)` |
| Energy | Variable | 7 | `$gameVariables.value(7)` |
| Current Day | Variable | 1 | `$gameVariables.value(1)` |
| Weekday | Variable | 2 | `$gameVariables.value(2)` |
| Action Points | Variable | 16 | `$gameVariables.value(16)` |
| In School | Switch | 11 | `$gameSwitches.value(11)` |

#### Player Data
Variables for player stats and flags.

| Name | Type | RPG Maker ID | Getter |
|------|------|-------------|--------|
| Money | Variable | 6 | `$gameParty.gold()` |
| School Period | Variable | 15 | `$gameVariables.value(15)` |

### Custom Presets

You can create custom presets from the palette panel to organize your own frequently used variables. Custom presets are saved with each document.

---

## Keyboard Shortcuts

### File Operations

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file (prompts to save if unsaved changes exist) |
| `Ctrl+O` | Open `.mzinteraction` file |
| `Ctrl+S` | Save (shows Save As dialog on first save) |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Shift+Z` | Redo (alternative) |
| `F1` | Open help modal |

### Edit

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Copy selected nodes and their internal edges |
| `Ctrl+V` | Paste copied nodes (offset +20, +20) |
| `Delete` | Delete selected nodes/edges |
| `Backspace` | Delete selected nodes/edges |

### Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Open search panel |
| `Ctrl+0` | Fit all nodes in view |
| `Ctrl+1` | Fit selected node(s) in view |
| `Home` | Jump to Start node at 100% zoom |
| `B` | Toggle bookmark on selected node |
| `Escape` | Clear path highlights / close search |
| Scroll Wheel | Zoom in/out |

### Path Highlighting

| Shortcut | Action |
|----------|--------|
| `Alt+Click` | Highlight upstream path |
| `Shift+Alt+Click` | Highlight downstream path |

### Layout

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+L` | Auto-layout graph |
| `Ctrl+G` | Toggle snap-to-grid |
| `Alt+L` | Align left |
| `Alt+C` | Align center (horizontal) |
| `Alt+R` | Align right |
| `Alt+T` | Align top |
| `Alt+M` | Align middle (vertical) |
| `Alt+B` | Align bottom |

### Quick-Add Nodes

Press the number key (no modifiers) to place a node at the viewport center:

| Key | Node |
|-----|------|
| `1` | Start |
| `2` | Choice Menu |
| `3` | Action |
| `4` | Condition |
| `5` | End |
| `6` | Group |
| `7` | Comment |

### Mouse Controls

| Action | Effect |
|--------|--------|
| Drag from palette | Add node at drop position |
| Click node | Select for editing |
| Drag node | Move on canvas |
| Drag from handle | Create connection |
| Click empty canvas | Deselect all |
| Right-click canvas | Open context menu |
| Click edge | Select edge (for deletion) |
| Drag on empty canvas | Rectangle multi-select |
| Right-drag / Middle-drag | Pan canvas |

---

## File Format

Interactions are saved as `.mzinteraction` files — plain JSON with a `.mzinteraction` extension.

```json
{
  "version": "1.0.0",
  "name": "My Interaction",
  "description": "An optional description",
  "nodes": [
    {
      "id": "start-a1b2c3d4",
      "type": "start",
      "position": { "x": 100, "y": 200 },
      "data": { "type": "start", "label": "Start" }
    }
  ],
  "edges": [
    {
      "id": "edge-e5f6g7h8",
      "source": "start-a1b2c3d4",
      "target": "menu-i9j0k1l2",
      "sourceHandle": "default",
      "type": "interaction",
      "data": {
        "edgeStyle": "default",
        "sourceColor": "#34d399",
        "targetColor": "#a78bfa"
      }
    }
  ],
  "variables": [],
  "bookmarks": []
}
```

### Top-level Fields

| Field | Description |
|-------|-------------|
| `version` | Format version (currently `"1.0.0"`) |
| `name` | Document name (used as the default filename) |
| `description` | Optional description |
| `nodes` | Array of all nodes with position, type, and data |
| `edges` | Array of all connections between nodes |
| `variables` | Loaded variable presets |
| `bookmarks` | Array of bookmarked node IDs |
| `projectPath` | Path to the last linked RPG Maker project (optional) |

Files are human-readable JSON (2-space indented), so they can be version-controlled alongside your RPG Maker project.

---

## Tips and Troubleshooting

### General Workflow Tips

- **Load your RPG Maker project first** — This populates switch and variable dropdowns throughout the app, so you can reference game data by name instead of remembering IDs.
- **Save early, save often** — Auto-save kicks in every 30 seconds once you've saved the file at least once, but manual saves (Ctrl+S) are always a good habit.
- **Use the Home key** — If you get lost in a large graph, press Home to jump back to the Start node.
- **Validate before exporting** — Click the Validate button to catch issues like unreachable nodes or missing connections before you export.

### Creating Loops

Connect any node's output back to an earlier node's input to create a loop. This is useful for repeating menus (e.g., a shop menu that returns after each purchase). The export handles loops automatically using Label and Jump to Label commands.

### Organizing Large Graphs

- **Use Group nodes** to visually section your graph (e.g., "Quest Dialogue", "Shop", "Goodbye")
- **Use Comment nodes** to annotate complex sections or leave notes for yourself
- **Use Bookmarks** to pin key nodes you frequently need to navigate to
- **Auto-layout** (Ctrl+Shift+L) can untangle messy graphs — try both LR and TB directions

### Understanding Dynamic Menus

When you add a hide or disable condition to any choice in a Menu node, the entire menu switches to dynamic mode on export. This means:

- All choices in that menu are processed through a script, even ones without conditions
- Variable 99 is used as temporary storage — avoid using it elsewhere
- The generated script uses `$gameMessage.setChoices()` which bypasses the standard RPG Maker choice system

If you don't need conditional choices, leave the hide/disable conditions empty for simpler exported code.

### Performance

- The editor handles typical interaction graphs (up to ~100 nodes) smoothly
- For very large graphs (100+ nodes), consider breaking complex interactions into multiple files
- The MiniMap can be toggled off to improve rendering performance on large graphs

### Common Issues

| Issue | Solution |
|-------|----------|
| Switch/variable dropdowns are empty | Load your RPG Maker project first via the Export dialog or toolbar |
| "No Start node found" error | Add a Start node — every interaction needs exactly one |
| Node appears disconnected after paste | Connections between pasted nodes are preserved, but connections to non-pasted nodes are not — reconnect manually |
| Changes not appearing in RPG Maker | Reload the map in RPG Maker after exporting (close and reopen the map) |
| Auto-layout didn't move my Group/Comment | Groups and Comments are excluded from auto-layout by design — move them manually |
| File won't open | Ensure it's a valid `.mzinteraction` JSON file with `version`, `nodes`, and `edges` fields |
