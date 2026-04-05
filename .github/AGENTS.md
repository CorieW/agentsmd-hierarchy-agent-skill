# .github

GitHub-specific automation configuration for dependency updates, CI workflows, and repository policy checks.

## Directories

- `workflows/`: GitHub Actions workflow entrypoints for validation, coverage, and policy enforcement.

## Files

- `dependabot.yml`: Dependabot update policy for repository dependencies.

## Writing Rules

- Keep shared GitHub automation intent documented here as workflow inventory changes.
- Prefer reusable workflow structure and clear workflow names because these files surface directly in the GitHub UI.
