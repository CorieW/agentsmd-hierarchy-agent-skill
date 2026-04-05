# scripts

Repository-only helper scripts for local development workflows that are not shipped as part of the published skill bundle.

## Directories

- None.

## Files

- `dev-install-codex-skill.mjs`: Copies the source skill bundle into `.codex/skills/agentsmd-hierarchy` so the local Codex install stays in sync during development.

## Writing Rules

- Keep repo helpers safe to run repeatedly and anchored from the repository root.
- Prefer editing the canonical skill bundle under `agentsmd-hierarchy/`; use this directory for local development workflows around that bundle.
