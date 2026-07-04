---
'agentsmd-hierarchy': major
---

- Convert AGENTS hierarchy maintenance to the v3 rules-only model.
- Validate existing rules-only `AGENTS.md` files instead of requiring directory or file inventory sections.
- Make `sync` normalize legacy rules-bearing files and prune AGENTS files without real Rules.
- Stop creating or refreshing `## Directories`, `## Files`, `## Generated Files`, and ignored-path inventory sections.
- Remove placeholder-description validation and the `--strict-placeholders` CLI option.
