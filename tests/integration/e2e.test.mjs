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
const scaffoldScriptPath = path.join(
  repositoryRoot,
  'agentsmd-hierarchy',
  'scripts',
  'scaffold-agents.mjs',
);

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

function combinedOutput(result) {
  return `${result.stdout}${result.stderr}`;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('CLI end-to-end workflows', () => {
  it('fix scaffolds the AGENTS chain and check passes for the generated files', async () => {
    const repoRoot = await createFixtureRepo({
      'README.md': 'hello\n',
      'src/components/index.js': 'export const answer = 42;\n',
    });

    const fixResult = runNode([cliPath, 'fix', '.'], {
      cwd: repoRoot,
    });

    expect(fixResult.status).toBe(0);
    expect(combinedOutput(fixResult)).toContain('Created AGENTS.md');
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

    const fixResult = runNode([cliPath, 'fix', '.'], {
      cwd: repoRoot,
    });
    expect(fixResult.status).toBe(0);

    const strictCheckResult = runNode(
      [cliPath, 'check', '.', '--strict-placeholders'],
      {
        cwd: repoRoot,
      },
    );

    expect(strictCheckResult.status).toBe(1);
    expect(combinedOutput(strictCheckResult)).toContain(
      'placeholder text remains',
    );
    expect(strictCheckResult.stderr).toContain('AGENTS.md validation failed:');
  });

  it('sync behaves as a fix alias and scaffold requires an explicit directory in non-interactive mode', async () => {
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

    const scaffoldRepo = await createFixtureRepo({
      'README.md': 'hello\n',
      'src/features/payments/handler.js':
        'export default function handler() {}\n',
    });

    const scaffoldResult = runNode(
      [cliPath, 'scaffold', 'src/features/payments'],
      {
        cwd: scaffoldRepo,
      },
    );

    expect(scaffoldResult.status).toBe(0);
    await expect(
      fs.pathExists(
        path.join(scaffoldRepo, 'src', 'features', 'payments', 'AGENTS.md'),
      ),
    ).resolves.toBe(true);

    const missingDirectoryResult = runNode([cliPath, 'scaffold'], {
      cwd: scaffoldRepo,
    });

    expect(missingDirectoryResult.status).toBe(1);
    expect(missingDirectoryResult.stderr).toContain(
      'missing required argument',
    );
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

  it('sync-agents and scaffold-agents create the expected AGENTS files', async () => {
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

    const scaffoldRepo = await createFixtureRepo({
      'README.md': 'hello\n',
      'docs/reference/api.md': '# API\n',
    });

    const scaffoldResult = runNode([scaffoldScriptPath, 'docs/reference'], {
      cwd: scaffoldRepo,
    });

    expect(scaffoldResult.status).toBe(0);
    await expect(
      fs.pathExists(path.join(scaffoldRepo, 'docs', 'reference', 'AGENTS.md')),
    ).resolves.toBe(true);
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
