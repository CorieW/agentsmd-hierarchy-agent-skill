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
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-simple-flat-directory.md',
    ),
    targetDirectory: 'scripts',
  },
  {
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-simple-test-helpers.md',
    ),
    targetDirectory: 'packages/back/tests/helpers',
  },
  {
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-complex-package-root.md',
    ),
    targetDirectory: 'packages/front',
  },
  {
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-complex-source-directory.md',
    ),
    targetDirectory: 'packages/front/src',
  },
  {
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-custom-trailing-sections.md',
    ),
    targetDirectory: 'packages/front/src/features/billing',
  },
  {
    referencePath: path.join(
      repositoryRoot,
      'agentsmd-hierarchy',
      'references',
      'example-root-with-ignored-paths.md',
    ),
    targetDirectory: '.',
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

function validAgents(directoryPath, rules = ['Keep edits focused.']) {
  return `# ${directoryPath}\n\n## Rules\n\n${rules.map((rule) => `- ${rule}`).join('\n')}\n`;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('CLI end-to-end workflows', () => {
  it('check passes when a repo has no AGENTS files', async () => {
    const repoRoot = await createFixtureRepo({
      'README.md': 'hello\n',
      'src/index.js': 'export const ready = true;\n',
    });

    const result = runNode([cliPath, 'check', '.'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('No AGENTS.md files found for this scope.');
    expect(result.stdout).toContain('AGENTS.md validation passed.');
  });

  it('sync creates no AGENTS files when none exist', async () => {
    const repoRoot = await createFixtureRepo({
      'README.md': 'hello\n',
      'src/components/index.js': 'export const answer = 42;\n',
    });

    const result = runNode([cliPath, 'sync', '.'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    await expect(fs.pathExists(path.join(repoRoot, 'AGENTS.md'))).resolves.toBe(
      false,
    );
    await expect(
      fs.pathExists(path.join(repoRoot, 'src', 'AGENTS.md')),
    ).resolves.toBe(false);
    expect(result.stdout).toContain('AGENTS.md files were already in sync.');
  });

  it('check accepts title plus non-empty Rules', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': validAgents('.', [
        'Keep repo-wide automation behavior documented here.',
      ]),
      'src/AGENTS.md': validAgents('src', [
        'Keep source modules small and explicit.',
      ]),
      'src/index.js': 'export const ready = true;\n',
    });

    const result = runNode([cliPath, 'check', '.'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('AGENTS.md passed validation.');
    expect(result.stdout).toContain('src/AGENTS.md passed validation.');
  });

  it.each([
    {
      label: 'v2 inventory sections',
      content: `# .\n\n## Directories\n\n- None.\n\n## Files\n\n- \`README.md\`: Readme.\n`,
      expected: 'remove obsolete "## Directories" section',
    },
    {
      label: 'overview text',
      content: `# .\n\nRepository overview text.\n\n## Rules\n\n- Keep edits focused.\n`,
      expected: 'overview text is not allowed before "## Rules"',
    },
    {
      label: 'empty Rules',
      content: `# .\n\n## Rules\n\n`,
      expected: '"## Rules" must contain one or more rule bullets',
    },
    {
      label: '- None. Rules',
      content: `# .\n\n## Rules\n\n- None.\n`,
      expected: '"## Rules" must contain real rule bullets',
    },
    {
      label: 'legacy Writing Rules',
      content: `# .\n\n## Writing Rules\n\n- Keep edits focused.\n`,
      expected: 'use "## Rules", not "## Writing Rules"',
    },
    {
      label: 'custom trailing sections',
      content: `# .\n\n## Rules\n\n- Keep edits focused.\n\n## Coding Strategy\n\n- Prefer small modules.\n`,
      expected: 'unsupported section in v3 AGENTS.md: "## Coding Strategy"',
    },
  ])('check rejects $label', async ({ content, expected }) => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': content,
      'README.md': 'hello\n',
    });

    const result = runNode([cliPath, 'check', 'AGENTS.md'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('AGENTS.md validation failed:');
    expect(result.stderr).toContain(expected);
  });

  it('sync normalizes rules-bearing files and prunes rules-empty files', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': `# .\n\nRepository overview.\n\n## Directories\n\n- \`src/\`: Source.\n\n## Files\n\n- \`README.md\`: Readme.\n\n## Rules\n\n- Keep root rules.\n`,
      'docs/AGENTS.md': `# docs\n\nDocumentation inventory only.\n\n## Directories\n\n- None.\n\n## Files\n\n- \`guide.md\`: Guide.\n`,
      'docs/guide.md': '# Guide\n',
      'src/AGENTS.md': `# src\n\n## Writing Rules\n\n- Keep source rules.\n`,
      'src/index.js': 'export const ready = true;\n',
      'README.md': 'hello\n',
    });

    const result = runNode([cliPath, 'sync', '.'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('Deleted docs/AGENTS.md');
    expect(result.stderr).toContain('Updated AGENTS.md');
    expect(result.stderr).toContain('Updated src/AGENTS.md');
    await expect(
      fs.pathExists(path.join(repoRoot, 'docs', 'AGENTS.md')),
    ).resolves.toBe(false);
    await expect(
      readFile(path.join(repoRoot, 'AGENTS.md'), 'utf8'),
    ).resolves.toBe(validAgents('.', ['Keep root rules.']));
    await expect(
      readFile(path.join(repoRoot, 'src', 'AGENTS.md'), 'utf8'),
    ).resolves.toBe(validAgents('src', ['Keep source rules.']));
    expect(result.stdout).toContain(
      'Synced AGENTS.md files. Deleted 1, updated 2.',
    );

    const checkResult = runNode([cliPath, 'check', '.'], {
      cwd: repoRoot,
    });
    expect(checkResult.status).toBe(0);
  });

  it('directory scope validates ancestor chain and scoped descendants', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': validAgents('.', ['Keep root rules.']),
      'src/AGENTS.md': validAgents('src', ['Keep source rules.']),
      'src/feature/AGENTS.md': validAgents('src/feature', [
        'Keep feature rules.',
      ]),
      'src/feature/deep/AGENTS.md': validAgents('src/feature/deep', [
        'Keep deep feature rules.',
      ]),
      'other/AGENTS.md': `# other\n\nOverview.\n\n## Rules\n\n- Broken sibling should be ignored.\n`,
      'src/feature/deep/index.js': 'export const ready = true;\n',
      'other/index.js': 'export const ignored = true;\n',
    });

    const result = runNode([cliPath, 'check', 'src/feature'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('AGENTS.md passed validation.');
    expect(result.stdout).toContain('src/AGENTS.md passed validation.');
    expect(result.stdout).toContain('src/feature/AGENTS.md passed validation.');
    expect(result.stdout).toContain(
      'src/feature/deep/AGENTS.md passed validation.',
    );
    expect(result.stdout).not.toContain('other/AGENTS.md');
  });

  it('directory scope fails when an ancestor AGENTS file is invalid', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': validAgents('.', ['Keep root rules.']),
      'src/AGENTS.md': `# src\n\nOverview.\n\n## Rules\n\n- Keep source rules.\n`,
      'src/feature/AGENTS.md': validAgents('src/feature', [
        'Keep feature rules.',
      ]),
      'src/feature/index.js': 'export const ready = true;\n',
    });

    const result = runNode([cliPath, 'check', 'src/feature'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('src/AGENTS.md');
    expect(result.stderr).toContain(
      'overview text is not allowed before "## Rules"',
    );
  });

  it('AGENTS file scope handles only the requested file', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': `# .\n\nOverview.\n\n## Rules\n\n- Broken root should be ignored.\n`,
      'src/AGENTS.md': validAgents('src', ['Keep source rules.']),
      'src/index.js': 'export const ready = true;\n',
    });

    const result = runNode([cliPath, 'check', 'src/AGENTS.md'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('src/AGENTS.md passed validation.');
    expect(result.stdout).not.toContain('AGENTS.md has');
  });
});

describe('Bundled helper script end-to-end workflows', () => {
  it('validate-agents reports stale v2 files from the packaged script entrypoint', async () => {
    const repoRoot = await createFixtureRepo({
      'AGENTS.md': `# .\n\nRepository overview.\n\n## Directories\n\n- None.\n\n## Files\n\n- \`README.md\`: Readme.\n`,
      'README.md': 'hello\n',
    });

    const result = runNode([validateScriptPath, '--check'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Would delete AGENTS.md');
    expect(result.stderr).toContain('AGENTS.md files are out of date');
    expect(result.stderr).toContain('- AGENTS.md');
  });

  it('sync-agents does not create AGENTS files for targeted directories', async () => {
    const repoRoot = await createFixtureRepo({
      'README.md': 'hello\n',
      'src/lib/index.js': 'export const ready = true;\n',
    });

    const result = runNode([syncScriptPath, 'src'], {
      cwd: repoRoot,
    });

    expect(result.status).toBe(0);
    await expect(
      fs.pathExists(path.join(repoRoot, 'src', 'AGENTS.md')),
    ).resolves.toBe(false);
    await expect(
      fs.pathExists(path.join(repoRoot, 'src', 'lib', 'AGENTS.md')),
    ).resolves.toBe(false);
  });

  it.each(referenceExamples)(
    'validate-agents checks the reference example for $targetDirectory',
    async (example) => {
      const repoRoot = await createFixtureRepo({
        [`${example.targetDirectory === '.' ? '' : `${example.targetDirectory}/`}AGENTS.md`]:
          await loadReferenceExampleContent(example.referencePath),
      });

      const result = runNode(
        [validateScriptPath, '--check', `${example.targetDirectory}/AGENTS.md`],
        {
          cwd: repoRoot,
        },
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain(
        `${example.targetDirectory === '.' ? 'AGENTS.md' : `${example.targetDirectory}/AGENTS.md`} passed validation.`,
      );
    },
  );

  it.each(referenceExamples)(
    'sync-agents keeps the reference example for $targetDirectory in sync',
    async (example) => {
      const agentsPath =
        example.targetDirectory === '.'
          ? 'AGENTS.md'
          : `${example.targetDirectory}/AGENTS.md`;
      const repoRoot = await createFixtureRepo({
        [agentsPath]: await loadReferenceExampleContent(example.referencePath),
      });
      const originalContent = await readFile(
        path.join(repoRoot, agentsPath),
        'utf8',
      );

      const result = runNode([syncScriptPath, agentsPath], {
        cwd: repoRoot,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`${agentsPath} is already in sync.`);
      await expect(
        readFile(path.join(repoRoot, agentsPath), 'utf8'),
      ).resolves.toBe(originalContent);
    },
  );
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
