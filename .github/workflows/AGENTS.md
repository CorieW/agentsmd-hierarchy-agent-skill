# .github/workflows

Workflow entrypoints for CI, release policy checks, and repository policy checks.

## Directories

- None.

## Files

- `ci.yml`: Main CI workflow, including formatting, linting, tests, and AGENTS hierarchy validation.
- `publish-npm.yml`: Changesets-driven release workflow that validates `main`, opens version PRs, and publishes the package to npm with OIDC trusted publishing.
- `require-changeset.yml`: Pull request policy check that requires a changeset when published package files change unless explicitly skipped.
