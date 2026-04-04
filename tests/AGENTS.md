# tests

Automated test suites for the CLI package, split between end-to-end command coverage and focused unit coverage for shared modules.

## Directories

- `integration/`: Black-box tests that exercise real command flows, install behavior, and filesystem side effects.
- `unit/`: Focused tests for shared library helpers and command registration.

## Files

- None.

## Writing Rules

- Keep public workflow coverage in `integration/` and implementation-focused checks in `unit/`.
- Favor temporary directories and deterministic runtime setup over assumptions about the developer machine.
- Update this file when suite structure or test responsibilities change.
