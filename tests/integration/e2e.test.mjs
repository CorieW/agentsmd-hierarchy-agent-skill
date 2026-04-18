import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs-extra';

const temporaryDirectories = [];
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const cliPath = path.join(repositoryRoot, 'bin', 'agentsmd-hierarchy.mjs');
const validateScriptPath = path.join(
  repositoryRoot,
  'agentsmd-hierarchy',
  'scripts',
  'validate-agents.mjs',
);
const syncScriptPath = path.join(
  repositoryRoot,
  'agentsmd-hierarchy',
  'scripts',
  'sync-agents.mjs',
);
const referenceExamples = [
  {
    name: 'simple flat directory',
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-simple-flat-directory.md',
    ),
    supportingFiles: {
      'scripts/rename-project.js': 'export function renameProject() {}\n',
      'scripts/verify-preview.mjs':
        'export async function verifyPreview() {}\n',
    },
    targetDirectory: 'scripts',
  },
  {
    name: 'simple test helpers directory',
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-simple-test-helpers.md',
    ),
    supportingFiles: {
      'packages/back/tests/helpers/integration.ts':
        'export function createIntegrationHelper() {}\n',
    },
    targetDirectory: 'packages/back/tests/helpers',
  },
  {
    name: 'complex package root',
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-complex-package-root.md',
    ),
    supportingFiles: {
      'packages/front/.env.example': 'API_URL=https://example.test\n',
      'packages/front/e2e/smoke.spec.ts':
        "import { test } from '@playwright/test';\n",
      'packages/front/package-lock.json': '{\n  "name": "front"\n}\n',
      'packages/front/package.json': '{\n  "name": "front"\n}\n',
      'packages/front/playwright.config.ts': 'export default {};\n',
      'packages/front/public/logo.svg': '<svg></svg>\n',
      'packages/front/src/index.ts': 'export const ready = true;\n',
      'packages/front/vite.config.ts': 'export default {};\n',
    },
    targetDirectory: 'packages/front',
  },
  {
    name: 'complex source directory',
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-complex-source-directory.md',
    ),
    supportingFiles: {
      'packages/front/src/components/button.tsx':
        'export function Button() { return null; }\n',
      'packages/front/src/lib/api.ts': 'export const api = {};\n',
      'packages/front/src/router.tsx': 'export const router = {};\n',
      'packages/front/src/routes/index.tsx':
        'export function Route() { return null; }\n',
      'packages/front/src/routeTree.gen.ts': 'export const routeTree = {};\n',
      'packages/front/src/start.ts': 'export function start() {}\n',
      'packages/front/src/styles.css': ':root {}\n',
    },
    targetDirectory: 'packages/front/src',
  },
  {
    name: 'directory with custom trailing sections',
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-custom-trailing-sections.md',
    ),
    supportingFiles: {
      'packages/front/src/features/billing/components/card.tsx':
        'export function BillingCard() { return null; }\n',
      'packages/front/src/features/billing/constants.ts':
        'export const BILLING_COPY = {};\n',
      'packages/front/src/features/billing/index.ts':
        "export * from './useBilling';\n",
      'packages/front/src/features/billing/lib/client.ts':
        'export const billingClient = {};\n',
      'packages/front/src/features/billing/routes/index.tsx':
        'export function BillingRoute() { return null; }\n',
      'packages/front/src/features/billing/useBilling.ts':
        'export function useBilling() { return {}; }\n',
    },
    targetDirectory: 'packages/front/src/features/billing',
  },
];

function extractMarkdownExample(markdownContent) {
  const match = markdownContent.match(/```md\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error('Reference example is missing a fenced ```md block.');
  }

  return `${match[1]}\n`;
}

async function loadReferenceExampleContent(referencePath) {
  return extractMarkdownExample(await readFile(referencePath, 'utf8'));
}

async function createReferenceExampleRepo(
  example,
  { includeAgents = true, legacyRulesHeading = false } = {},
) {
  const files = { ...example.supportingFiles };

  if (includeAgents) {
    let agentsContent = await loadReferenceExampleContent(
      example.referencePath,
    );
    if (legacyRulesHeading) {
      agentsContent = agentsContent.replace('## Rules', '## Writing Rules');
    }
    files[`${example.targetDirectory}/AGENTS.md`] = agentsContent;
  }

  return createFixtureRepo(files);
}

async function makeTempDirectory() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'agentsmd-hierarchy-'),
  );
  temporaryDirectories.push(directory);
  return directory;
}

async function createFixtureRepo(files) {
  const rootDirectory = await makeTempDirectory();

  await Promise.all(
    Object.entries(files).map(([relativePath, content]) =>
      fs.outputFile(path.join(rootDirectory, relativePath), content, 'utf8'),
    ),
  );

  return rootDirectory;
}

function runNode(arguments_, options = {}) {
  return spawnSync(process.execPath, arguments_, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function runCommand(command, arguments_, options = {}) {
  return spawnSync(command, arguments_, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function combinedOutput(result) {
  return `${result.stdout}${result.stderr}`;
}

function initializeGitRepository(cwd) {
  expect(runCommand('git', ['init'], { cwd }).status).toBe(0);
  expect(
    runCommand('git', ['config', 'user.name', 'Codex Test'], { cwd }).status,
  ).toBe(0);
  expect(
    runCommand('git', ['config', 'user.email', 'codex@example.com'], { cwd })
      .status,
  ).toBe(0);
  expect(runCommand('git', ['add', '.'], { cwd }).status).toBe(0);
  expect(
    runCommand('git', ['commit', '-m', 'Initial commit'], { cwd }).status,
  ).toBe(0);
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('CLI end-to-end workflows', () => {
  it('sync scaffolds the AGENTS chain and check passes for the generated files', async () => {
    const repoRoot = await createFixtureRepo({
      'README.md': 'hello\n',
      'src/components/index.js': 'export const answer = 42;\n',
    });

    const syncResult = runNode([cliPath, 'sync', '.'], {
      cwd: repoRoot,
    });

    expect(syncResult.status).toBe(0);
    expect(combinedOutput(syncResult)).toContain('Created AGENTS.md');
    await expect(fs.pathExists(path.join(repoRoot, 'AGENTS.md'))).resolves.toBe(
      true,
    );
    await expect(
      fs.pathExists(path.join(repoRoot, 'src', 'AGENTS.md')),
    ).resolves.toBe(true);
    await expect(
      fs.pathExists(path.join(repoRoot, 'src', 'components', 'AGENTS.md')),
    ).resolves.toBe(true);

    const rootAgents = await readFile(path.join(repoRoot, 'AGENTS.md'), 'utf8');
    expect(rootAgents).toContain('- `src/`: TODO describe this subdirectory.');
    expect(rootAgents).toContain('- `README.md`: TODO describe this file.');
    expect(rootAgents).not.toContain('## Rules');

    const checkResult = runNode(
      [cliPath, 'check', 'src/components/AGENTS.md'],
      {
        cwd: repoRoot,
      },
    );

    expect(checkResult.status).toBe(0);
    expect(checkResult.stderr).toBe('');
    expect(checkResult.stdout).toContain(
      'src/components/AGENTS.md passed validation.',
    );
  });

  it('check --strict-placeholders fails when scaffolded placeholder text remains', async () => {
    const repoRoot = await createFixtureRepo({
      'README.md': 'hello\n',
    });

    const syncResult = runNode(
      [cliPath, 'sync', '.', '--strict-placeholders'],
      {
        cwd: repoRoot,
      },
    );
    expect(syncResult.status).toBe(1);

    const strictCheckResult = runNode(
      [cliPath, 'check', '.', '--strict-placeholders'],
      {
        cwd: repoRoot,
      },
    );
    expect(syncResult.stderr).toContain('AGENTS.md validation failed:');
    expect(syncResult.status).toBe(1);
    expect(strictCheckResult.status).toBe(1);
    expect(combinedOutput(strictCheckResult)).toContain(
      'placeholder text remains',
    );
    expect(strictCheckResult.stderr).toContain('AGENTS.md validation failed:');
  });

  it('sync refreshes AGENTS files for nested scopes', async () => {
    const syncRepo = await createFixtureRepo({
      'README.md': 'hello\n',
      'src/features/payments/handler.js':
        'export default function handler() {}\n',
    });

    const syncResult = runNode([cliPath, 'sync', 'src'], {
      cwd: syncRepo,
    });

    expect(syncResult.status).toBe(0);
    expect(combinedOutput(syncResult)).toContain('Synced AGENTS.md files.');
    await expect(
      fs.pathExists(path.join(syncRepo, 'src', 'features', 'AGENTS.md')),
    ).resolves.toBe(true);

    const nestedScopeRepo = await createFixtureRepo({
      'README.md': 'hello\n',
      'docs/reference/api.md': '# API\n',
    });

    const nestedScopeResult = runNode([cliPath, 'sync', 'docs/reference'], {
      cwd: nestedScopeRepo,
    });

    expect(nestedScopeResult.status).toBe(0);
    await expect(
      fs.pathExists(
        path.join(nestedScopeRepo, 'docs', 'reference', 'AGENTS.md'),
      ),
    ).resolves.toBe(true);
  });

  it('check accepts AGENTS.md files that omit the Rules section', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': `# .

Repository root for a fixture repo with a single docs directory.

## Directories

- \`docs/\`: Documentation entrypoints for the fixture repo.

## Files

- \`README.md\`: Top-level fixture readme.
`,
      'README.md': 'hello\n',
      'docs/AGENTS.md': `# docs

Documentation entrypoints for the fixture repo.

## Directories

- None.

## Files

- \`guide.md\`: Primary documentation page.
`,
      'docs/guide.md': '# Guide\n',
    });

    const checkResult = runNode([cliPath, 'check', '.'], {
      cwd: repoRoot,
    });

    expect(checkResult.status).toBe(0);
    expect(checkResult.stderr).toBe('');
    expect(checkResult.stdout).toContain('AGENTS.md validation passed.');
  });
});

describe('Bundled helper script end-to-end workflows', () => {
  it('validate-agents reports stale inventory from the packaged script entrypoint', async () => {
    const repoRoot = await createFixtureRepo({
      'README.md': 'hello\n',
    });

    const result = runNode([validateScriptPath, '--check'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('AGENTS.md files are out of date');
    expect(result.stderr).toContain('- AGENTS.md');
  });

  it('sync-agents drops tracked files deleted from the working tree when git inventory is available', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': `# .

Repository root for a fixture repo with a tracked README file.

## Directories

- None.

## Files

- \`README.md\`: Top-level fixture readme.
`,
      'README.md': 'hello\n',
    });

    initializeGitRepository(repoRoot);
    await fs.remove(path.join(repoRoot, 'README.md'));

    const result = runNode([syncScriptPath, '.'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    await expect(
      readFile(path.join(repoRoot, 'AGENTS.md'), 'utf8'),
    ).resolves.toContain('## Files\n\n- None.\n');
  });

  it('sync-agents creates the expected AGENTS files for targeted directories', async () => {
    const syncRepo = await createFixtureRepo({
      'README.md': 'hello\n',
      'src/lib/index.js': 'export const ready = true;\n',
    });

    const syncResult = runNode([syncScriptPath, 'src'], {
      cwd: syncRepo,
    });

    expect(syncResult.status).toBe(0);
    await expect(
      fs.pathExists(path.join(syncRepo, 'src', 'lib', 'AGENTS.md')),
    ).resolves.toBe(true);

    const nestedScopeRepo = await createFixtureRepo({
      'README.md': 'hello\n',
      'docs/reference/api.md': '# API\n',
    });

    const nestedScopeResult = runNode([syncScriptPath, 'docs/reference'], {
      cwd: nestedScopeRepo,
    });

    expect(nestedScopeResult.status).toBe(0);
    await expect(
      fs.pathExists(
        path.join(nestedScopeRepo, 'docs', 'reference', 'AGENTS.md'),
      ),
    ).resolves.toBe(true);
  });

  it('validate-agents sync preserves trailing sections when Rules is omitted', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': `# .

Repository root for a fixture repo that keeps custom trailing metadata.

## Directories

- None.

## Files

- \`README.md\`: Top-level fixture readme.

## AGENTS Hierarchy

- Exclude \`.cache\` from AGENTS scanning.
`,
      'README.md': 'hello\n',
    });

    const result = runNode([validateScriptPath, '--sync', '.'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    await expect(
      readFile(path.join(repoRoot, 'AGENTS.md'), 'utf8'),
    ).resolves.toContain('## AGENTS Hierarchy');
  });

  it.each(referenceExamples)(
    'validate-agents checks the $name reference example',
    async (example) => {
      const repoRoot = await createReferenceExampleRepo(example);

      const result = runNode(
        [validateScriptPath, '--check', `${example.targetDirectory}/AGENTS.md`],
        {
          cwd: repoRoot,
        },
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain(
        `${example.targetDirectory}/AGENTS.md passed validation.`,
      );
    },
  );

  it.each(referenceExamples)(
    'sync-agents keeps the $name reference example in sync',
    async (example) => {
      const repoRoot = await createReferenceExampleRepo(example);
      const originalContent = await readFile(
        path.join(repoRoot, example.targetDirectory, 'AGENTS.md'),
        'utf8',
      );

      const result = runNode(
        [syncScriptPath, `${example.targetDirectory}/AGENTS.md`],
        {
          cwd: repoRoot,
        },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(
        `${example.targetDirectory}/AGENTS.md is already in sync.`,
      );
      await expect(
        readFile(
          path.join(repoRoot, example.targetDirectory, 'AGENTS.md'),
          'utf8',
        ),
      ).resolves.toBe(originalContent);
    },
  );

  it.each(referenceExamples)(
    'sync-agents creates a valid AGENTS chain for the $name example shape',
    async (example) => {
      const repoRoot = await createReferenceExampleRepo(example, {
        includeAgents: false,
      });

      const syncResult = runNode([syncScriptPath, example.targetDirectory], {
        cwd: repoRoot,
      });

      expect(syncResult.status).toBe(0);
      await expect(
        fs.pathExists(
          path.join(repoRoot, example.targetDirectory, 'AGENTS.md'),
        ),
      ).resolves.toBe(true);

      const validateResult = runNode(
        [validateScriptPath, '--check', `${example.targetDirectory}/AGENTS.md`],
        {
          cwd: repoRoot,
        },
      );

      expect(validateResult.status).toBe(0);
      expect(validateResult.stdout).toContain(
        `${example.targetDirectory}/AGENTS.md passed validation.`,
      );
    },
  );

  it('sync-agents migrates a reference example from Writing Rules to Rules', async () => {
    const example = referenceExamples[1];
    const repoRoot = await createReferenceExampleRepo(example, {
      legacyRulesHeading: true,
    });

    const result = runNode(
      [syncScriptPath, `${example.targetDirectory}/AGENTS.md`],
      {
        cwd: repoRoot,
      },
    );

    expect(result.status).toBe(0);
    await expect(
      readFile(
        path.join(repoRoot, example.targetDirectory, 'AGENTS.md'),
        'utf8',
      ),
    ).resolves.toContain('## Rules');
    await expect(
      readFile(
        path.join(repoRoot, example.targetDirectory, 'AGENTS.md'),
        'utf8',
      ),
    ).resolves.not.toContain('## Writing Rules');
  });
});

describe('CLI install end-to-end workflows', () => {
  it.each([
    {
      args: [
        'install',
        '--tool',
        'codex',
        '--scope',
        'personal',
        '--no-prompt',
      ],
      expectedPath: ['.codex', 'skills', 'agentsmd-hierarchy', 'SKILL.md'],
      label: 'installs the Codex skill bundle',
      useHomeAsCwd: true,
    },
    {
      args: [
        'install',
        '--tool',
        'claude',
        '--scope',
        'project',
        '--project-root',
        '__PROJECT_ROOT__',
        '--no-prompt',
      ],
      expectedPath: [
        '.claude',
        'skills',
        'agentsmd-hierarchy',
        'scripts',
        'validate-agents.mjs',
      ],
      label: 'installs the Claude skill bundle',
      useHomeAsCwd: false,
    },
    {
      args: [
        'install',
        '--tool',
        'cursor',
        '--scope',
        'personal',
        '--no-prompt',
      ],
      expectedPath: ['.cursor', 'commands', 'agentsmd-hierarchy.md'],
      label: 'installs the Cursor command bundle',
      useHomeAsCwd: true,
    },
  ])(
    '$label through the public CLI',
    async ({ args, expectedPath, useHomeAsCwd }) => {
      const rootDirectory = await makeTempDirectory();
      const projectRoot = await makeTempDirectory();
      const cwd = useHomeAsCwd ? rootDirectory : repositoryRoot;
      const resolvedArgs = args.map((value) =>
        value === '__PROJECT_ROOT__' ? projectRoot : value,
      );

      const result = runNode([cliPath, ...resolvedArgs], {
        cwd,
        env: {
          HOME: rootDirectory,
        },
      });

      expect(result.status).toBe(0);
      await expect(
        fs.pathExists(
          path.join(
            useHomeAsCwd ? rootDirectory : projectRoot,
            ...expectedPath,
          ),
        ),
      ).resolves.toBe(true);
    },
  );

  it('exports a Codex plugin bundle and prints a dry-run JSON summary without writing files', async () => {
    const rootDirectory = await makeTempDirectory();
    const pluginDestination = path.join(rootDirectory, 'plugins', 'agents');
    const dryRunDestination = path.join(rootDirectory, 'dry-run-plugin');

    const exportResult = runNode(
      [
        cliPath,
        'install',
        '--tool',
        'codex',
        '--scope',
        'personal',
        '--mode',
        'plugin',
        '--dest',
        pluginDestination,
        '--no-prompt',
      ],
      {
        cwd: repositoryRoot,
        env: {
          HOME: rootDirectory,
        },
      },
    );

    expect(exportResult.status).toBe(0);
    await expect(
      fs.pathExists(
        path.join(pluginDestination, '.codex-plugin', 'plugin.json'),
      ),
    ).resolves.toBe(true);
    await expect(
      fs.pathExists(
        path.join(
          pluginDestination,
          'skills',
          'agentsmd-hierarchy',
          'SKILL.md',
        ),
      ),
    ).resolves.toBe(true);

    const dryRunResult = runNode(
      [
        cliPath,
        'install',
        '--tool',
        'codex',
        '--scope',
        'personal',
        '--mode',
        'plugin',
        '--dest',
        dryRunDestination,
        '--dry-run',
        '--json',
        '--no-prompt',
      ],
      {
        cwd: repositoryRoot,
        env: {
          HOME: rootDirectory,
        },
      },
    );

    expect(dryRunResult.status).toBe(0);
    expect(JSON.parse(dryRunResult.stdout)).toMatchObject({
      destination: dryRunDestination,
      mode: 'plugin',
      tool: 'codex',
    });
    await expect(fs.pathExists(dryRunDestination)).resolves.toBe(false);
  });

  it('refuses to overwrite unmanaged destinations unless --force is provided', async () => {
    const rootDirectory = await makeTempDirectory();
    const destination = path.join(
      rootDirectory,
      '.codex',
      'skills',
      'agentsmd-hierarchy',
    );
    await fs.outputFile(
      path.join(destination, 'README.md'),
      'user-managed file\n',
      'utf8',
    );

    const blockedResult = runNode(
      [
        cliPath,
        'install',
        '--tool',
        'codex',
        '--scope',
        'personal',
        '--no-prompt',
      ],
      {
        cwd: rootDirectory,
        env: {
          HOME: rootDirectory,
        },
      },
    );

    expect(blockedResult.status).toBe(1);
    expect(blockedResult.stderr).toContain('Destination already exists');

    const forcedResult = runNode(
      [
        cliPath,
        'install',
        '--tool',
        'codex',
        '--scope',
        'personal',
        '--force',
        '--no-prompt',
      ],
      {
        cwd: rootDirectory,
        env: {
          HOME: rootDirectory,
        },
      },
    );

    expect(forcedResult.status).toBe(0);
    await expect(
      fs.pathExists(path.join(destination, 'SKILL.md')),
    ).resolves.toBe(true);
  });
});
