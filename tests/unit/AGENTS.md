# tests/unit

Unit coverage for shared library modules where the behavior can be validated directly without going through the full CLI or filesystem flow.

## Directories

- None.

## Files

- `install-core.test.mjs`: Verifies install-plan resolution and Cursor command rendering helpers from the shared install module.
- `program.test.mjs`: Verifies command registration and option contracts exposed by the Commander program.

## Rules

- Keep tests focused on exported helpers and command contracts with small deterministic inputs.
- Avoid duplicating end-to-end scenarios that are already covered by `tests/integration/`.
