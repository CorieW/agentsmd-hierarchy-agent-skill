# AGENTS Convention

## Required Layout

Use this format for each directory-level `AGENTS.md`:

1. `# <repo-relative-directory>`
2. `## Rules`
3. One or more rule bullets

Example:

```md
# packages/front/src

## Rules

- Keep route modules thin and move shared state into feature helpers.
```

Do not include overview paragraphs, directory listings, file listings, generated-file sections, ignore sections, or custom trailing sections.

## Rules

- Add an `AGENTS.md` only when a directory has guidance that applies to the whole directory or subtree.
- Delete an `AGENTS.md` when it has no real rule bullets left.
- Keep rule bullets concise, actionable, and focused on editing behavior.
- Put single-file guidance in comments at the top of the relevant source file instead of in AGENTS.
- Use `## Rules`; legacy `## Writing Rules` is accepted only as sync migration input.

## Cascading Behavior

- Read existing `AGENTS.md` files from root to leaf.
- Apply parent Rules first.
- Let child Rules add local detail or override the parent for their subtree.
- Do not treat a missing `AGENTS.md` as missing documentation.

## Skill Package Exception

- Do not add `AGENTS.md` inside repo-local skill packages under `.codex/skills/` unless the repository explicitly asks for that.
- Use `SKILL.md`, `agents/openai.yaml`, and `references/` to document skills instead.
- It is fine for a repo root `AGENTS.md` to mention `.codex/` or local skills at a high level without creating nested skill-package AGENTS files.

## Update Checklist

Update a directory `AGENTS.md` when:

- Directory-level Rules are added, changed, or removed.
- A rule no longer applies and the file should be pruned.
- Legacy v2 sections need to be normalized away.

Do not update `AGENTS.md` just because files or directories were added, removed, renamed, or repurposed.

## Sync Guidance

- Use the skill's bundled `scripts/sync-agents.mjs` helper or `scripts/validate-agents.mjs --sync` to normalize existing rules-bearing files and prune rules-empty files.
- Do not expect sync to create new AGENTS files.
- Create a new AGENTS file manually only when new directory-level Rules are needed.
- Sync rewrites legacy `## Writing Rules` to `## Rules` and removes obsolete v2 inventory content when real Rules exist.

## Validation Guidance

- Use the skill's bundled `scripts/validate-agents.mjs` helper or the repo's matching helper when it exists to check title, section layout, non-empty Rules, and skill-package exclusions.
- Directory scope validates existing ancestor AGENTS files plus existing AGENTS files under the target directory.
- Passing an `AGENTS.md` file validates only that file.
- A scope with no AGENTS files is valid.

## Example Files

- For a small flat directory, open [example-simple-flat-directory.md](example-simple-flat-directory.md).
- For a small helper directory, open [example-simple-test-helpers.md](example-simple-test-helpers.md).
- For a package root with broad editing rules, open [example-complex-package-root.md](example-complex-package-root.md).
- For a source directory with local coding rules, open [example-complex-source-directory.md](example-complex-source-directory.md).
- For migrating old custom sections into Rules, open [example-custom-trailing-sections.md](example-custom-trailing-sections.md).
- For a repository root that used to document ignored paths, open [example-root-with-ignored-paths.md](example-root-with-ignored-paths.md).
