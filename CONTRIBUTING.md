# Contributing to MZ Interaction Builder

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/Wintersta7e/mz-interaction-builder.git
cd mz-interaction-builder

# Install dependencies (use --no-bin-links on WSL)
npm install --no-bin-links

# Start development server with HMR
npm run dev
```

## Project Structure

```
src/
├── main/              # Electron main process
│   └── ipc/           # File, dialog, project IPC handlers
├── preload/           # contextBridge (window.api)
└── renderer/src/      # React application
    ├── components/    # Canvas, panels, toolbar, context menu
    ├── edges/         # Custom edge component
    ├── nodes/         # BaseNode + 5 node types
    ├── hooks/         # Custom React hooks
    ├── stores/        # Zustand state management
    ├── lib/           # Export pipeline, graph traversal, search, utilities
    ├── styles/        # CSS variables and global styles
    └── types/         # TypeScript interfaces
```

## Quality Checks

All checks must pass before submitting a PR:

```bash
npm run typecheck   # TypeScript (node + web configs)
npm run lint        # ESLint
npm test            # Vitest unit tests
npm run build       # Full production build
```

CI runs these automatically on every pull request.

## Submitting Changes

1. Fork the repository
2. Create a feature branch from `main` (`git checkout -b feature/my-feature`)
3. Make your changes
4. Ensure all quality checks pass
5. Submit a pull request against `main`

### Commit Messages

Use concise, descriptive commit messages:

- `feat: add node duplication shortcut`
- `fix: edge not rendering when zoomed out`
- `perf: memoize node components`
- `refactor: extract search logic into hook`
- `test: add graph traversal edge cases`
- `docs: update keyboard shortcuts table`

### Code Style

- TypeScript strict mode — no `any` casts
- Functional React components with hooks
- Zustand for state management (targeted selectors, no full-store subscriptions)
- Tailwind CSS for styling (use CSS variables for theme colors)

## Adding a New Node Type

1. Add to `InteractionNodeType` union in `types/index.ts`
2. Create data interface extending `BaseNodeData`
3. Create component in `nodes/` with Handle positioning
4. Register in `nodes/index.ts` nodeTypes object
5. Add to `NodePalette.tsx` drag items
6. Add default data in `Canvas.tsx` `getDefaultNodeData()`
7. Add property editor section in `PropertiesPanel.tsx`
8. Add export logic in `lib/export/index.ts`
9. Add tests for the new node type

## Reporting Issues

Use the [issue templates](https://github.com/Wintersta7e/mz-interaction-builder/issues/new/choose) for bug reports and feature requests.
