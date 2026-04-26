# tests/integration

Integration coverage for user-visible command behavior, including spawned CLI execution and install workflows against temporary directories.

## Directories

- None.

## Files

- `cli.test.mjs`: Spawns the published CLI to verify debug logging, JSON output, and command wiring for validation flows.
- `e2e.test.mjs`: Exercises the public CLI and bundled script entrypoints end to end, including sync, validation, install, and overwrite-protection flows.
- `install.test.mjs`: Exercises install flows across supported tools and scopes, including plugin export and written receipt files.

## Rules

- Exercise public commands and install flows through spawned processes or near-real runtimes instead of mocking the entire stack.
- Assert stdout, stderr, exit codes, and filesystem side effects that users actually depend on.
