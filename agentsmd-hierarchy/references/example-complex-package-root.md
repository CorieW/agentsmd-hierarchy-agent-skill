# Example: Package Root

Use this example when a package root has rules that apply across config, source, public assets, and tests.

```md
# packages/front

## Rules

- Keep package-level scripts, config, and source changes aligned so local development and CI use the same entrypoints.
- Regenerate lockfiles with npm tooling instead of hand-editing them.
- Put file-specific setup notes in top-of-file comments inside the relevant config or source file.
```
