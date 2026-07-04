---
name: agentsmd-hierarchy
description: Navigate repositories that use rules-only hierarchical AGENTS.md files, where each AGENTS.md contains only directory-level Rules for its subtree. Use when Codex needs to read cascading AGENTS guidance, follow local rules before editing, or use repo CLI helpers to validate, normalize, or prune AGENTS.md files.
---

# AGENTS Hierarchy

## Overview

Read `AGENTS.md` files as a layered rule chain. Start at the repo root, walk down to the target path, apply parent rules first, and let deeper rules narrow or override guidance for their subtree.

## Read the Chain

1. Locate the repository root `AGENTS.md` if one exists.
2. Read each existing `AGENTS.md` from root to the target directory in order.
3. Apply parent rules first, then let deeper `AGENTS.md` files add local detail or override parent guidance.
4. Do not expect AGENTS files to describe directory or file inventory.
5. When the target is inside a repo-local skill package, still read parent `AGENTS.md` files such as `.codex/AGENTS.md`; stop before nested skill package AGENTS files because skill packages should use `SKILL.md` and references instead.

## Interpret the Format

- Treat each `AGENTS.md` as directory-level policy for that directory and its subtree.
- Accept only this layout: `# <repo-relative-directory>`, then `## Rules`, then one or more rule bullets.
- Treat `## Directories`, `## Files`, `## Generated Files`, `## Ignore Files and Directories`, overview paragraphs, and custom trailing sections as obsolete v2 content.
- Treat legacy `## Writing Rules` as migration input only; v3 files should use `## Rules`.
- Do not treat missing `AGENTS.md` files as a problem; a directory should have one only when it has directory-level rules.

## File-Specific Guidance

- Expect single-file rules to live in comments at the top of the relevant code file.
- Read top-of-file comments in files you edit, but do not enforce a particular comment format.
- Do not move single-file rules into `AGENTS.md`; keep `AGENTS.md` for directory-level rules.

## Update the Hierarchy

- Add or edit an `AGENTS.md` only when directory-level Rules are being added or changed.
- Remove an `AGENTS.md` when it has no real Rules left.
- Keep Rules concise, actionable, and focused on how to edit the subtree.
- Prefer top-of-file comments for guidance that applies to exactly one source file.

## Use Repo Helpers

Treat the bundled CLI helpers in this skill package as part of the skill:

- Use [scripts/validate-agents.mjs](scripts/validate-agents.mjs) with `--check` to validate existing rules-only AGENTS files.
- Use [scripts/validate-agents.mjs](scripts/validate-agents.mjs) with `--sync` to normalize rules-bearing files and prune rules-empty files.
- Add `--debug` when you need extra visibility into repo-root resolution, scope selection, or validation counts.
- Run helpers from the repository root so they can treat the current working directory as the repo root by default.
- Do not expect `--sync` to create AGENTS files; create rules files manually when new directory-level Rules are needed.
- Do not assume the repository exposes package-manager wrappers such as `pnpm`, `npm`, or `yarn` scripts; use the bundled script path unless the user explicitly asks for a repo-local wrapper.
- Treat support modules in this directory, such as `scripts/cli-logger.mjs`, as internal implementation helpers for the CLIs rather than direct end-user commands.

## Preferred CLI Workflow

1. Read the AGENTS chain for the target path.
2. Make source changes while respecting directory-level Rules and top-of-file comments.
3. When AGENTS files were touched or may be stale, run the installed skill helper, such as `node .codex/skills/agentsmd-hierarchy/scripts/validate-agents.mjs --sync <repo-relative-path>`, to normalize or prune existing files.
4. Use the matching installed helper path with `--check <repo-relative-path-or-agents-file>` before finishing when AGENTS validity matters.
5. Add `--debug` to check or sync runs when you need the helper script to explain what it discovered.

## Load the Reference

Open [references/agents-convention.md](references/agents-convention.md) when you need the canonical v3 layout or update checklist.

Open one of these example files when you want a concrete pattern to imitate:

- [references/example-simple-flat-directory.md](references/example-simple-flat-directory.md)
- [references/example-simple-test-helpers.md](references/example-simple-test-helpers.md)
- [references/example-complex-package-root.md](references/example-complex-package-root.md)
- [references/example-complex-source-directory.md](references/example-complex-source-directory.md)
- [references/example-custom-trailing-sections.md](references/example-custom-trailing-sections.md)
- [references/example-root-with-ignored-paths.md](references/example-root-with-ignored-paths.md)
