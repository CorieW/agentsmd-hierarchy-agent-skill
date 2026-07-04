# .

## Rules

- Treat `agentsmd-hierarchy/` as the source of truth for the shipped skill bundle and keep root metadata aligned with it.
- Keep repo-only helpers in `scripts/` and user-facing runtime entrypoints in `bin/`.
- Refresh generated package artifacts with npm commands rather than manual edits.
