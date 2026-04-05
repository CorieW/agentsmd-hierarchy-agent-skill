# agentsmd-hierarchy

Distributable skill bundle for AGENTS Hierarchy, combining the main skill instructions with agent metadata, reference docs, and bundled helper scripts.

## Directories

- `agents/`: Agent integration metadata for tool registries.
- `references/`: Convention docs and example AGENTS files that support the skill instructions.
- `scripts/`: Bundled helper CLIs and shared implementation used by the skill workflow.
  Rules:
  - Keep command entrypoints small and move reusable behavior into `scripts/lib/`.

## Files

- `SKILL.md`: Primary skill instructions that describe the AGENTS hierarchy workflow and preferred bundled commands.

## Writing Rules

- Keep `SKILL.md`, `agents/openai.yaml`, and the bundled scripts aligned so the documented workflow matches actual behavior.
- Put reusable CLI logic under `scripts/lib/` and reserve top-level script files for thin entrypoints or prompt helpers.
- Keep references focused on conventions and examples that the skill explicitly points users to.
- Update this file when an immediate child changes role or new bundle content is added.
