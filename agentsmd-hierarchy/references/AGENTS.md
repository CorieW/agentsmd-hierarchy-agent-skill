# agentsmd-hierarchy/references

Reference material that backs the skill instructions, including the canonical AGENTS convention and copy-pastable example layouts.

## Directories

- None.

## Files

- `agents-convention.md`: Canonical section layout, update checklist, and validation guidance for directory-level `AGENTS.md` files.
- `example-complex-package-root.md`: Example AGENTS file for a package root with child directories, config files, and generated artifacts.
- `example-complex-source-directory.md`: Example AGENTS file for a source subtree with generated files and file-specific rules.
- `example-custom-trailing-sections.md`: Example AGENTS file for a directory that adds repo-specific sections after the standard layout.
- `example-root-with-ignored-paths.md`: Example root AGENTS file that uses the ignore section for scanner exclusions.
- `example-simple-flat-directory.md`: Example AGENTS file for a small directory that only contains files.
- `example-simple-test-helpers.md`: Example AGENTS file for a compact helper-oriented test directory.

## Rules

- Keep the convention document aligned with the behavior enforced by the bundled validator.
- Keep example files small, valid Markdown, and clearly matched to the directory shape named in the filename.
