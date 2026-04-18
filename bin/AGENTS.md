# bin

Published executable shims for the package, kept minimal so the shared library modules own the actual CLI behavior.

## Directories

- None.

## Files

- `agentsmd-hierarchy.mjs`: npm bin entrypoint that launches the shared Commander-based CLI.

## Rules

- Keep bin files as thin wrappers around shared modules under `agentsmd-hierarchy/scripts/lib/`.
- Keep executable names and targets aligned with the `bin` map in `package.json`.
