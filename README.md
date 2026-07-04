# AGENTS Hierarchy

> A compact CLI and installable skill bundle for keeping layered `AGENTS.md` rules files current.

`agentsmd-hierarchy` packages two things together:

- A CLI for validating, normalizing, and pruning rules-only `AGENTS.md` files
- An installable skill bundle you can drop into Codex, Claude Code, Cursor, or a Codex plugin directory

## Why This Exists

Large repos still need local editing guidance, but v3 keeps `AGENTS.md` focused on rules instead of directory inventory. Each `AGENTS.md` should exist only when a directory has rules that apply to that subtree.

Use comments at the top of individual source files for single-file rules. The CLI expects that pattern, but it does not scan or enforce those comments.

This package helps keep rules files healthy:

- Validate malformed or obsolete `AGENTS.md` files
- Normalize legacy rules files to the v3 layout
- Prune AGENTS files that no longer contain real Rules
- Install the skill where your agent tooling can actually use it

## Works With

| Tool        | Install Shape                 |
| ----------- | ----------------------------- |
| Codex       | Skill bundle or plugin bundle |
| Claude Code | Skill bundle                  |
| Cursor      | Command file                  |

## Quick Start

If you just want to install it and go:

```bash
npx -y agentsmd-hierarchy install
```

That launches an interactive installer and lets you choose the target tool and scope.

If you prefer deterministic installs:

```bash
npx -y agentsmd-hierarchy install --tool codex --scope personal --no-prompt
```

If you want the command available on your `PATH`:

```bash
npm install -g agentsmd-hierarchy
```

## Install Options

### Personal install

```bash
npx -y agentsmd-hierarchy install --tool codex --scope personal --no-prompt
```

```bash
npx -y agentsmd-hierarchy install --tool claude --scope personal --no-prompt
```

```bash
npx -y agentsmd-hierarchy install --tool cursor --scope personal --no-prompt
```

### Project install

Run this from inside a git repo, or pass `--project-root`.

```bash
npx -y agentsmd-hierarchy install --tool codex --scope project --no-prompt
```

```bash
npx -y agentsmd-hierarchy install --tool claude --scope project --no-prompt
```

```bash
npx -y agentsmd-hierarchy install --tool cursor --scope project --no-prompt
```

### Export a Codex plugin bundle

```bash
npx -y agentsmd-hierarchy install \
  --tool codex \
  --mode plugin \
  --dest ./plugins/agentsmd-hierarchy \
  --no-prompt
```

## CLI Commands

Once installed globally, or via `npx`, the main workflow looks like this:

```bash
agentsmd-hierarchy check .
agentsmd-hierarchy sync .
agentsmd-hierarchy sync src/components
```

### `check [path]`

Validate existing `AGENTS.md` files without changing them. Directory scopes include existing ancestor AGENTS files plus existing AGENTS files under the target directory. Passing an `AGENTS.md` file validates only that file.

```bash
agentsmd-hierarchy check packages/app
agentsmd-hierarchy check packages/app/AGENTS.md
```

### `sync [path]`

Normalize existing rules-bearing `AGENTS.md` files and delete rules-empty files. This command does not create new AGENTS files.

```bash
agentsmd-hierarchy sync .
agentsmd-hierarchy sync src/features/payments
```

### `install`

Install the packaged skill bundle into a supported tool.

```bash
agentsmd-hierarchy install --tool codex --scope project --no-prompt
```

Helpful flags:

- `--debug` for structured troubleshooting output
- `--dry-run` to preview install changes
- `--json` to emit install summaries as JSON
- `--force` to replace unmanaged install destinations

## v3 AGENTS Format

The accepted file format is intentionally small:

```md
# path/to/directory

## Rules

- Keep directory-level guidance here.
```

Rules must be a non-empty bullet list. Inventory sections such as `## Directories`, `## Files`, `## Generated Files`, and `## Ignore Files and Directories` are obsolete in v3 and fail validation.

## What Gets Installed

Depending on the target, this package installs:

- A full skill bundle under `.codex/skills/agentsmd-hierarchy/`
- A full skill bundle under `.claude/skills/agentsmd-hierarchy/`
- A Cursor command file under `.cursor/commands/agentsmd-hierarchy.md`
- A Codex plugin bundle at the destination you choose

The shipped skill teaches agents to:

- Read the `AGENTS.md` rules chain from repo root to target path
- Treat `AGENTS.md` files as directory-level Rules only
- Put single-file rules in comments at the top of the relevant source file
- Use bundled helpers to validate, normalize, and prune rules files deterministically

## Local Development

This repo ships the published package contents and the tests that back them.

```bash
npm install
npm test
```

The published npm package includes:

- `bin/` for the executable entrypoint
- `agentsmd-hierarchy/` for the distributable skill bundle and helper scripts

## Releases

This repo uses Changesets for versioning and npm publishing.

Release steps:

1. Run `npm run changeset` for each user-facing change and commit the resulting file under `.changeset/`.
2. Merge those changesets to `main`.
3. In GitHub, open `Actions` and run the `Release` workflow manually.
4. Wait for the workflow to open or update the release PR with the version bump and changelog changes.
5. Review and merge that release PR into `main`.
6. In GitHub, run the `Release` workflow manually again from `main`.
7. Wait for the workflow to publish the package to npm.

During publish, the workflow also creates the matching GitHub tag and GitHub Release automatically, so npm releases and GitHub releases stay aligned.

## Requirements

- Node.js `>=20`

## Contributing

Contribution PRs are welcome.

For user-facing changes, please include a Changeset by running `npm run changeset` and committing the generated file under `.changeset/` alongside your update.

## License

MIT
