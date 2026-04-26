# Example: Root with Ignored Paths

Use this example when a repository root needs to keep local or tool-owned paths out of AGENTS inventory scanning.

```md
# .

Repository root for an application workspace with source code, docs, and local tool output.

## Directories

- `docs/`: Product and engineering documentation.
- `src/`: Application source code.

## Files

- `README.md`: Repository overview and setup notes.
- `package.json`: Package manifest and workspace scripts.

## Ignore Files and Directories

- `.changeset/`: Changesets release note entries managed outside AGENTS scanning.
- `.cache/`: Local tool cache output that should not be documented.
- `debug.log`: Local debug output that should stay out of AGENTS inventory.

## Rules

- Keep persistent project guidance in AGENTS files and local-only artifacts in ignored paths.
- Document ignored paths here only when they are intentionally visible in the working tree.
```
