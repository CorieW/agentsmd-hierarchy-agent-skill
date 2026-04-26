# Example: Directory with Custom Trailing Sections

Use this example when a directory needs the standard AGENTS layout plus extra repo-specific sections after `## Rules`.

```md
# packages/front/src/features/billing

Frontend billing feature code for subscription state, checkout flows, and invoice UX.

## Directories

- `components/`: Billing-specific UI building blocks.
- `lib/`: Shared billing helpers and payment-provider adapters.
- `routes/`: Billing route modules and route-local loaders.

## Files

- `constants.ts`: Shared billing constants and copy keys.
- `index.ts`: Public exports for the billing feature.
- `useBilling.ts`: Hook that coordinates billing data and UI state.

## Rules

- Keep presentational pieces in `components/` and integration logic in `lib/`.
- Route modules should compose feature exports rather than duplicating billing state logic.

## Coding Strategy

- Keep payment-provider calls behind adapter helpers under `lib/` so route and hook code stays portable.
- Prefer server-derived billing state over duplicating entitlement logic in the client.
```
