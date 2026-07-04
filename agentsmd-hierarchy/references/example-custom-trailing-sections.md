# Example: Migrated Custom Sections

Use this example when old custom trailing sections need to become ordinary v3 rule bullets.

```md
# packages/front/src/features/billing

## Rules

- Keep presentational billing pieces in feature-local component modules.
- Keep payment-provider calls behind adapter helpers so route and hook code stays portable.
- Prefer server-derived billing state over duplicating entitlement logic in the client.
```
