# agentsmd-hierarchy/scripts/lib

## Rules

- Keep modules reusable from both CLI entrypoints and tests by accepting injected runtime state where practical.
- Preserve stable option handling, debug log structure, and user-facing error messages because tests assert them.
- Prefer adding shared behavior here rather than expanding the published bin wrappers.
