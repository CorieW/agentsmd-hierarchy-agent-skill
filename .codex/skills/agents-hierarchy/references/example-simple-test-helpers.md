# Simple Example: Test Helpers

Use this example when a helper directory needs shared testing rules.

```md
# packages/back/tests/helpers

## Rules

- Keep helpers deterministic and avoid hidden dependencies on test order.
- Prefer factory helpers over shared mutable fixtures.
```
