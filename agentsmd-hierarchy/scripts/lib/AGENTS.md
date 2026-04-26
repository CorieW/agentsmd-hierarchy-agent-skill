# agentsmd-hierarchy/scripts/lib

Shared implementation modules for the bundled CLI, including structured logging, install planning, command registration, and AGENTS validation.

## Directories

- None.

## Files

- `cli-logger.mjs`: Color-aware structured logger used by commands and tests.
- `errors.mjs`: Shared command error types and guards for consistent CLI failure handling.
- `install-core.mjs`: Install planning and execution logic for Codex, Claude, Cursor, and Codex plugin bundle exports.
- `program.mjs`: Commander program definition that wires subcommands, shared flags, and error handling together.
- `validate-agents-core.mjs`: Core inventory, sync, and validation engine for hierarchical `AGENTS.md` files.

## Rules

- Keep modules reusable from both CLI entrypoints and tests by accepting injected runtime state where practical.
- Preserve stable option handling, debug log structure, and user-facing error messages because tests assert them.
- Prefer adding shared behavior here rather than expanding the published bin wrappers.
