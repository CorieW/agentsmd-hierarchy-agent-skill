# Simple Example: Test Helpers Directory

Use this example when a directory is small, focused, and mostly holds helper code for one part of the repo.

```md
# packages/back/tests/helpers

Shared helpers used by backend test suites.

## Directories

- None.

## Files

- `integration.ts`: Creates reusable setup helpers for backend integration tests.

## Writing Rules

- Keep helpers generic enough to serve multiple suites.
- Do not hide important assertions inside helper utilities.
```
