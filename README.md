# AGENTS Hierarchy

> A sharp little CLI and installable skill bundle for keeping layered `AGENTS.md` docs accurate, readable, and in sync with your repo.

`agents-hierarchy` packages two things together:

- A CLI for checking, scaffolding, and refreshing hierarchical `AGENTS.md` files
- An installable skill bundle you can drop into Codex, Claude Code, Cursor, or a Codex plugin directory

## Why This Exists

Large repos get messy fast. `AGENTS.md` files work best when they behave like a map: each directory explains its immediate children, local writing rules, and how guidance cascades down the tree.

This package helps you keep that map healthy without hand-maintaining everything:

- Validate stale or malformed `AGENTS.md` files
- Scaffold missing docs for new directories
- Refresh inventory sections after the tree changes
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
npx -y agents-hierarchy install
```

That launches an interactive installer and lets you choose the target tool and scope.

If you prefer deterministic installs:

```bash
npx -y agents-hierarchy install --tool codex --scope personal --no-prompt
```

If you want the command available on your `PATH`:

```bash
npm install -g agents-hierarchy
```

## Install Options

### Personal install

```bash
npx -y agents-hierarchy install --tool codex --scope personal --no-prompt
```

```bash
npx -y agents-hierarchy install --tool claude --scope personal --no-prompt
```

```bash
npx -y agents-hierarchy install --tool cursor --scope personal --no-prompt
```

### Project install

Run this from inside a git repo, or pass `--project-root`.

```bash
npx -y agents-hierarchy install --tool codex --scope project --no-prompt
```

```bash
npx -y agents-hierarchy install --tool claude --scope project --no-prompt
```

```bash
npx -y agents-hierarchy install --tool cursor --scope project --no-prompt
```

### Export a Codex plugin bundle

```bash
npx -y agents-hierarchy install \
  --tool codex \
  --mode plugin \
  --dest ./plugins/agents-hierarchy \
  --no-prompt
```

## CLI Commands

Once installed globally, or via `npx`, the main workflow looks like this:

```bash
agents-hierarchy check .
agents-hierarchy fix .
agents-hierarchy scaffold src/components
```

### `check [path]`

Validate `AGENTS.md` files without changing them.

```bash
agents-hierarchy check packages/app
agents-hierarchy check . --strict-placeholders
```

### `fix [path]`

Refresh missing or stale `AGENTS.md` files.

```bash
agents-hierarchy fix .
agents-hierarchy fix tests
```

### `sync [path]`

Compatibility alias for `fix`.

```bash
agents-hierarchy sync .
```

### `scaffold <dir>`

Create the first `AGENTS.md` for a repo-relative directory.

```bash
agents-hierarchy scaffold src/features/payments
```

### `install`

Install the packaged skill bundle into a supported tool.

```bash
agents-hierarchy install --tool codex --scope project --no-prompt
```

Helpful flags:

- `--debug` for structured troubleshooting output
- `--dry-run` to preview changes
- `--json` to emit install summaries as JSON
- `--force` to replace unmanaged destinations

## What Gets Installed

Depending on the target, this package installs:

- A full skill bundle under `.codex/skills/agents-hierarchy/`
- A full skill bundle under `.claude/skills/agents-hierarchy/`
- A Cursor command file under `.cursor/commands/agents-hierarchy.md`
- A Codex plugin bundle at the destination you choose

The shipped skill teaches agents to:

- Read the `AGENTS.md` chain from repo root to target path
- Treat each file as documentation for immediate children only
- Use bundled helpers to validate and scaffold docs deterministically
- Keep parent and child `AGENTS.md` files aligned as the tree evolves

## Local Development

This repo ships the published package contents and the tests that back them.

```bash
npm install
npm test
```

The published npm package includes:

- `bin/` for the executable entrypoint
- `agents-hierarchy/` for the distributable skill bundle and helper scripts

## Requirements

- Node.js `>=20`

## License

MIT
