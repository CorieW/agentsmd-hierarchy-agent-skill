# .codex

Codex-specific development state for this repository, primarily used to keep a repo-local installed copy of the skill available for testing.

## Directories

- `skills/`: Repo-local Codex skill installs used to exercise the bundle from inside this project.
  Rules:
  - Edit the canonical skill source under `agents-hierarchy/` and copy it here with `node scripts/dev-install-codex-skill.mjs` when the local install should be refreshed.
  - Do not add nested `AGENTS.md` files inside repo-local skill packages in this subtree.

## Files

- None.

## Writing Rules

- Treat this directory as tool-facing configuration and installed output, not the primary source for the published bundle.
- Keep Codex-specific inventory focused on immediate children only.
- Update this file when Codex config directories are added, removed, or repurposed.
