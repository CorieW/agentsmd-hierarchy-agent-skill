# AGENTS Convention

## Required Layout

Use this format for each directory-level `AGENTS.md`:

1. `# <repo-relative-directory>`
2. A brief overview paragraph
3. `## Directories`
4. `## Files`
5. Optional `## Generated Files`
6. Optional `## Rules`

Document only the directory's immediate children. Do not list grandchildren in the current file.

Repo-specific sections may appear after the standard layout when needed. Keep those custom sections after `## Rules` so the core structure stays predictable.

## Section Rules

### Directories

- Format each entry as `- \`name/\`: description`.
- When a child directory needs special handling, add an indented `Rules:` label below the bullet and list one or more rule bullets beneath it.
- Describe the child directory's purpose, not every file inside it.
- List only immediate child directories.

### Files

- Format each entry as `- \`name.ext\`: description`.
- When a file needs special handling, add an indented `Rules:` label below the bullet and list one or more rule bullets beneath it.
- Exclude the local `AGENTS.md`.

### Generated Files

- Use this section for tracked generated artifacts such as lockfiles, `*.gen.*` files, or packaged archives.
- State how the artifact should usually be refreshed.
- Keep generated-file rule bullets short and actionable.

### Rules

- Add this section only when the directory needs extra local editing guidance beyond what parent `AGENTS.md` files already cover.
- If you include it, keep the bullets concise and focused on how to edit files in the directory.
- Avoid self-referential reminders about updating the `AGENTS.md`; use the bullets for concrete local editing guidance.

## Cascading Behavior

- Read `AGENTS.md` files from root to leaf.
- Apply parent rules first.
- Let child `AGENTS.md` files add local detail or override the parent for their own subtree.
- Let child-bullet `Rules:` blocks win for that specific file or directory.

## Skill Package Exception

- Do not add `AGENTS.md` inside repo-local skill packages under `.codex/skills/` unless the repository explicitly asks for that.
- Use `SKILL.md`, `agents/openai.yaml`, and `references/` to document skills instead.
- It is fine for a repo root `AGENTS.md` to mention `.codex/` or local skills at a high level without creating nested skill-package `AGENTS.md` files.

## Update Checklist

Before editing, verify the directory's immediate tracked children so the file matches the current inventory. Prefer repository-aware listings such as `git ls-files` when available, then fall back to the filesystem for untracked local work.

Update a directory `AGENTS.md` when:

- A tracked file is added, removed, renamed, or materially repurposed.
- A subdirectory is added, removed, renamed, or materially repurposed.
- Local rules change.
- A file becomes generated or stops being generated.

Update the parent `AGENTS.md` too when the identity of a child directory changes.

## Creation Guidance

- Use the skill's bundled `scripts/sync-agents.mjs` helper or `scripts/validate-agents.mjs --sync`, or the repo's matching helper when it exists, to create a first draft.
- Prefer the helper over hand-writing a first draft when the helper covers the task.
- Treat generated output as a draft, not finished documentation.
- Replace placeholder text before finishing the task.

## Sync Guidance

- Use the skill's bundled `scripts/sync-agents.mjs` helper or the repo's matching helper when it exists to refresh `## Directories`, `## Files`, and `## Generated Files` from the current repo inventory.
- Prefer the helper over manually rebuilding inventory sections when the helper covers the task.
- Let sync and validation helpers read repo-specific excluded inventory paths from the root `AGENTS.md` `## AGENTS Hierarchy` section when that section lists exclusions.
- Let sync helpers preserve existing descriptions and rules sections when possible while normalizing legacy `## Writing Rules` headings to `## Rules`.

## Validation Guidance

- Use the skill's bundled `scripts/validate-agents.mjs` helper or the repo's matching helper when it exists to check title, overview, section layout, entry formatting, optional rules sections, and AGENTS package exclusions.
- Prefer the validator over ad hoc manual checking so the skill ends with deterministic structure validation.
- Placeholder descriptions may remain when the task allows them; use stricter placeholder validation only when the repo or task requires finished descriptions.

## Example Files

- For a small flat directory, open [example-simple-flat-directory.md](example-simple-flat-directory.md).
- For a small helper directory, open [example-simple-test-helpers.md](example-simple-test-helpers.md).
- For a package root with config, source, and generated files, open [example-complex-package-root.md](example-complex-package-root.md).
- For a source directory with generated artifacts and file-specific rules, open [example-complex-source-directory.md](example-complex-source-directory.md).
- For a directory that needs custom sections after the standard layout, open [example-custom-trailing-sections.md](example-custom-trailing-sections.md).
