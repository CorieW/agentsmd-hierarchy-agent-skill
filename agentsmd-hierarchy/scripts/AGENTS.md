# agentsmd-hierarchy/scripts

Bundled CLI entrypoints that support the skill's sync and validation workflow.

## Directories

- `lib/`: Shared implementation for logging, install flows, command registration, and AGENTS validation logic.

## Files

- `cli-logger.mjs`: Convenience re-export for the shared CLI logger implementation.
- `sync-agents.mjs`: Sync CLI wrapper that refreshes AGENTS files.
- `validate-agents.mjs`: Direct CLI entrypoint for AGENTS validation and sync workflows.

## Rules

- Keep executable entrypoints thin and move reusable logic into `lib/`.
- Preserve repo-relative path handling and `--debug` passthrough across command wrappers.
