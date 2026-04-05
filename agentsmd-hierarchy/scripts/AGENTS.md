# agentsmd-hierarchy/scripts

Bundled CLI entrypoints and prompt helpers that support the skill's scaffold, sync, and validation workflow.

## Directories

- `lib/`: Shared implementation for logging, install flows, command registration, and AGENTS validation logic.

## Files

- `cli-logger.mjs`: Convenience re-export for the shared CLI logger implementation.
- `cli-prompts.mjs`: Shared prompt and path-resolution helpers for interactive command flows.
- `scaffold-agents.mjs`: CLI wrapper that scaffolds AGENTS files for a required repo-relative directory by delegating to the validator in fix mode.
- `sync-agents.mjs`: Compatibility CLI wrapper that defaults to sync behavior via validator fix mode.
- `validate-agents.mjs`: Direct CLI entrypoint for AGENTS validation and fix workflows.

## Writing Rules

- Keep executable entrypoints thin and move reusable logic into `lib/`.
- Preserve repo-relative path handling and `--debug` passthrough across command wrappers.
- Keep interactive prompts centralized in `cli-prompts.mjs` instead of duplicating prompt logic in entrypoints.
- Update this file when commands or shared script responsibilities change.
