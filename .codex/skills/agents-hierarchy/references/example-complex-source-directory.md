# Complex Example: Source Directory with Generated Artifacts

Use this example when a source directory has child directories, authored files, generated files, and a few file-specific rules.

```md
# packages/front/src

Frontend application source for route definitions, UI components, and bootstrapping.

## Directories

- `components/`: Shared UI grouped by feature or abstraction level.
- `lib/`: Reusable app logic, API helpers, and route utilities.
- `routes/`: File-based route modules.

## Files

- `router.tsx`: Router factory and router registration.
- `start.ts`: App bootstrap and server middleware wiring.
- `styles.css`: Global styles and design tokens.
  Rules:
  - Keep shared tokens centralized here instead of duplicating them in components.

## Generated Files

- `routeTree.gen.ts`: Generated route tree.
  Rules:
  - Regenerate it through routing tooling instead of hand-editing.

## Writing Rules

- Separate bootstrap, shared logic, components, and routes by responsibility.
- Treat generated router output as read-only.
```
