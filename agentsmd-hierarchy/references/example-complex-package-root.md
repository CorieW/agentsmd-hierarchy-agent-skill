# Complex Example: Package Root

Use this example when a package root mixes config files, child directories, and tracked generated artifacts.

```md
# packages/front

Frontend workspace for routes, components, static assets, and test tooling.

## Directories

- `e2e/`: Playwright suites for real user journeys.
- `public/`: Static files served directly by the app.
- `src/`: Application code for routes, components, and shared libraries.

## Files

- `.env.example`: Example frontend environment variables.
  Rules:
  - Keep it aligned with runtime env usage.
- `package.json`: Frontend package manifest and scripts.
  Rules:
  - Keep scripts aligned with Vite and Playwright config.
- `playwright.config.ts`: Playwright configuration for browser coverage.
- `vite.config.ts`: Vite dev and build configuration.

## Generated Files

- `package-lock.json`: npm lockfile kept for tool compatibility.
  Rules:
  - Refresh with npm tooling instead of hand-editing.

## Rules

- Keep package-level tooling files at the root and product code under `src/`.
- Push feature-specific behavior into `src/` rather than package-level config files.
```
