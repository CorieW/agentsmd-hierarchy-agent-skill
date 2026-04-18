---
name: agentsmd-hierarchy
description: Navigate and maintain repositories that use hierarchical AGENTS.md files, where each directory AGENTS.md describes its immediate children, optional local rules, and cascading repo guidance. Use when Codex needs to understand a repo through AGENTS.md, follow AGENTS instructions before editing, or use repo CLI helpers to scaffold, sync, validate, or update AGENTS.md files after files or directories change.
---

# AGENTS Hierarchy

## Overview

Read `AGENTS.md` files as a layered map of the repository. Start at the repo root, walk down to the target path, use those files to decide what to open next, and keep the hierarchy current when the directory inventory changes.

## Read the Chain

1. Locate the repository root `AGENTS.md`.
2. Read each `AGENTS.md` from root to the target directory in order.
3. Apply parent guidance first, then let deeper `AGENTS.md` files narrow or override the rules for their own subtree.
4. Use directory summaries and file bullets to decide which source files to inspect.
5. When the target is a repo-local skill package, still read parent `AGENTS.md` files such as `.codex/AGENTS.md`; stop only because the skill package itself should not contain a nested `AGENTS.md`.

## Interpret the Format

- Treat each `AGENTS.md` as documentation for that directory's immediate children only.
- When present, read `## Rules` as the local policy for edits in that directory.
- Treat indented `Rules:` blocks under child bullets as the most specific guidance for that item.
- Use `## Generated Files` to spot artifacts that should usually be regenerated instead of hand-edited.
- Do not expect one `AGENTS.md` to fully describe grandchildren; walk deeper in the tree when needed.

## Respect Skill Package Exceptions

- Do not add `AGENTS.md` files inside repo-local skill packages under `.codex/skills/` unless the repository explicitly asks for that pattern.
- Use `SKILL.md`, `agents/openai.yaml`, and `references/` as the documentation surface for a skill package.
- Treat the repo root `AGENTS.md` as enough context to discover that the repo contains local skills.

## Update the Hierarchy

- Audit the directory's immediate tracked children before editing so `## Directories`, `## Files`, and `## Generated Files` reflect the current inventory.
- Prefer checking tracked paths with repository tooling such as `git ls-files` when available, then fall back to the filesystem when needed.
- Update the current directory `AGENTS.md` whenever immediate files or subdirectories are added, removed, renamed, or materially repurposed.
- Update the parent directory `AGENTS.md` when a child directory changes role or inventory.
- Keep descriptions brief, behavioral, and focused on why a file or directory exists.
- Keep file-specific rules inline on the relevant file bullet unless the repo explicitly wants the same rule duplicated in source comments.

## Scaffold Carefully

- Prefer the bundled AGENTS tool first when a directory needs its first `AGENTS.md`; use manual drafting only when the helper does not fit the task.
- Use the bundled script path for the current skill package, such as `node .codex/skills/agentsmd-hierarchy/scripts/validate-agents.mjs --sync <repo-relative-directory>`.
- Replace placeholders with real summaries before considering the directory documented.
- Recheck the immediate child inventory before finishing so `## Directories`, `## Files`, and `## Generated Files` stay complete.

## Use Repo Helpers

Treat the bundled CLI helpers in this skill package as part of the skill:

- Use [scripts/validate-agents.mjs](scripts/validate-agents.mjs) with `--check` to validate AGENTS structure, inventory correctness, and missing AGENTS.md files.
- Use [scripts/validate-agents.mjs](scripts/validate-agents.mjs) with `--sync` to scaffold missing AGENTS.md files and refresh inventory sections while preserving compatible descriptions and rules.
- Add `--debug` to these bundled scripts when you need extra visibility into repo-root resolution, inventory discovery, scope selection, or validation counts.
- Prefer these bundled scripts before recreating scaffold, sync, or validation logic manually.
- Use manual `AGENTS.md` edits to refine descriptions, rules, or edge cases around the script output, not to replace deterministic script work the helpers already cover.
- Let the bundled scripts read repo-specific inventory exclusions from the root `AGENTS.md` `## AGENTS Hierarchy` section when that section lists excluded paths.
- Run the bundled scripts from the repository root so they can treat the current working directory as the repo root by default.
- Do not assume the repository exposes package-manager wrappers such as `pnpm`, `npm`, or `yarn` scripts; use the bundled script path unless the user explicitly asks for a repo-local wrapper.
- Treat support modules in this directory, such as `scripts/cli-logger.mjs`, as internal implementation helpers for the CLIs rather than direct end-user commands.

## Preferred CLI Workflow

1. Read the AGENTS chain for the target path.
2. Use the bundled AGENTS tool as the skill's default deterministic workflow whenever it covers the task.
3. Use `node .codex/skills/agentsmd-hierarchy/scripts/validate-agents.mjs --sync <repo-relative-path>` after structural changes so missing AGENTS.md files are scaffolded and inventory sections match the current tree.
4. Make any manual `AGENTS.md` edits that are still needed for descriptions, rules, or special cases the script cannot infer.
5. Use `node .codex/skills/agentsmd-hierarchy/scripts/validate-agents.mjs --check <repo-relative-path-or-agents-file>` before finishing to verify the AGENTS structure, inventory, and required-file coverage deterministically.
6. Add `--debug` to check or sync runs when you need the helper script to explain what it discovered and why it made a decision.

## Load the Reference

Open [references/agents-convention.md](references/agents-convention.md) when you need the canonical section layout, update checklist, or generated-file guidance.

Open one of these example files when you want a concrete pattern to imitate:

- [references/example-simple-flat-directory.md](references/example-simple-flat-directory.md)
- [references/example-simple-test-helpers.md](references/example-simple-test-helpers.md)
- [references/example-complex-package-root.md](references/example-complex-package-root.md)
- [references/example-complex-source-directory.md](references/example-complex-source-directory.md)
- [references/example-custom-trailing-sections.md](references/example-custom-trailing-sections.md)
