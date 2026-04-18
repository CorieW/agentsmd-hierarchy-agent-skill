# .github/workflows

Workflow entrypoints for CI, release policy checks, AGENTS validation, and repository policy checks.

## Directories

- None.

## Files

- `ci.yml`: Main CI workflow.
- `publish-npm.yml`: Changesets-driven release workflow that validates `main`, opens version PRs, and publishes the package to npm.
- `require-changeset.yml`: Pull request policy check that requires a changeset when published package files change unless explicitly skipped.
- `validate-agents.yml`: AGENTS hierarchy validation workflow for AGENTS and validator changes.
