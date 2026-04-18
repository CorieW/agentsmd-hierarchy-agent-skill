# .

Repository root for the AGENTS Hierarchy CLI package, published skill bundle, and local development helpers used to test installs and validation workflows.

## Directories

- `.codex/`: Repo-local Codex configuration and installed skill copies used during development.
- `.github/`: GitHub automation for CI, reusable actions, coverage reporting, and repository policy checks.
- `agentsmd-hierarchy/`: Canonical distributable skill bundle content, including prompts, references, and helper scripts.
- `bin/`: Published executable entrypoints for the npm package.
- `scripts/`: Repo-only development helpers that support local workflows.
- `tests/`: Automated coverage for CLI behavior and shared library modules.

## Files

- `.gitignore`: Ignore rules for installed dependencies, local test output, OS clutter, and packaged archives.
- `.prettierignore`: Prettier ignore rules for generated or local-only paths that should stay out of repo-wide formatting runs.
- `README.md`: Package landing page that explains installation targets, CLI usage, and the distributed skill bundle for end users.
- `eslint.config.mjs`: Flat ESLint configuration for the Node ESM source files and tests in this package.
- `package.json`: Package manifest for the CLI, published files, and test scripts.
- `prettier.config.mjs`: Shared Prettier configuration for repository formatting commands.

## Generated Files

- `package-lock.json`: npm lockfile for the package dependencies used by the CLI and test suite.
  Rules:
  - Refresh with npm tooling instead of hand-editing it.

## Rules

- Treat `agentsmd-hierarchy/` as the source of truth for the shipped skill bundle and keep root metadata aligned with it.
- Keep repo-only helpers in `scripts/` and user-facing runtime entrypoints in `bin/`.
- Refresh generated package artifacts with npm commands rather than manual edits.

## AGENTS Hierarchy

- Exclude `.changeset` from AGENTS scanning because Changesets treats Markdown files there as release note entries.
