# scripts

Repository-only helper scripts for local development workflows that are not shipped as part of the published skill bundle.

## Directories

- None.

## Files

- `dev-install-codex-skill.mjs`: Copies the source skill bundle into `.codex/skills/agents-hierarchy` so the local Codex install stays in sync during development.

## Writing Rules

- Keep repo helpers safe to run repeatedly and anchored from the repository root.
- Prefer editing the canonical skill bundle under `agents-hierarchy/`; use this directory for local development workflows around that bundle.
- Update this file when repo helper scripts are added, removed, or repurposed.
