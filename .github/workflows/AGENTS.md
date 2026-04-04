# .github/workflows

Workflow entrypoints for CI, pull request coverage comments, AGENTS validation, and repository policy checks.

## Directories

- None.

## Files

- `ci.yml`: Main CI workflow.
- `validate-agents.yml`: AGENTS hierarchy validation workflow for AGENTS and validator changes.

## Writing Rules

- Keep workflow names and triggers clear because they surface in the GitHub UI.
- Prefer shared setup via reusable actions instead of copy-pasted environment wiring.
