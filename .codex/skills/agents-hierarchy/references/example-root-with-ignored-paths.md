# Example: Repository Root

Use this example when a repository root needs broad rules. Ignored-path inventory sections are obsolete in v3; keep ignore behavior in tool config such as `.gitignore`.

```md
# .

## Rules

- Keep repository-wide automation changes aligned with package scripts and CI workflows.
- Document single-file exceptions in top-of-file comments inside the relevant file.
- Keep ignore behavior in dedicated tool configuration rather than AGENTS inventory sections.
```
