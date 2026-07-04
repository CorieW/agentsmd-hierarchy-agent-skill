# tests/integration

## Rules

- Exercise public commands and install flows through spawned processes or near-real runtimes instead of mocking the entire stack.
- Assert stdout, stderr, exit codes, and filesystem side effects that users actually depend on.
