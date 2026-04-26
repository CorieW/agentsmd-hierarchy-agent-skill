# agentsmd-hierarchy

## 2.0.0

### Major Changes

- 851b07a: Remove the `scaffold` CLI command and the packaged `scaffold-agents.mjs` wrapper.
  Use `sync <path>` for both first-time AGENTS creation and ongoing refreshes.
- 851b07a: Rename the refresh command to `sync`, make `## Rules` the canonical local guidance section, and preserve custom trailing AGENTS sections during sync.

### Minor Changes

- 851b07a: Add `## Ignore Files and Directories` support so AGENTS roots can document repo-relative files and directories that validation and sync should skip.
