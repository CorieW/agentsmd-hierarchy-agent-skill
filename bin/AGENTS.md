# bin

Published executable shims for the package, kept minimal so the shared library modules own the actual CLI behavior.

## Directories

- None.

## Files

- `agents-hierarchy.mjs`: npm bin entrypoint that launches the shared Commander-based CLI.

## Writing Rules

- Keep bin files as thin wrappers around shared modules under `agents-hierarchy/scripts/lib/`.
- Keep executable names and targets aligned with the `bin` map in `package.json`.
- Update this file when published entrypoints are added, removed, or repurposed.
