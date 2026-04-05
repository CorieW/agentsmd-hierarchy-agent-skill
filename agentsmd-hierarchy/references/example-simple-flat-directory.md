# Simple Example: Flat Utility Directory

Use this example when a directory has only files and no child directories.

```md
# scripts

Helper scripts for local repo maintenance.

## Directories

- None.

## Files

- `rename-project.js`: Renames the project across package manifests and docs.
- `verify-preview.mjs`: Checks that the preview app responds on expected routes.

## Writing Rules

- Keep scripts deterministic and safe to run from automation.
- Keep script names tied to the repo task they automate.
```
