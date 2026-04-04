import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

const temporaryDirectories = [];
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

async function makeTempDirectory() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'agents-hierarchy-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('CLI integration', () => {
  it('prints JSON to stdout and debug logs to stderr for install --json --debug', async () => {
    const homeDirectory = await makeTempDirectory();
    const result = spawnSync(
      process.execPath,
      [
        'bin/agents-hierarchy.mjs',
        'install',
        '--tool',
        'codex',
        '--scope',
        'personal',
        '--no-prompt',
        '--dry-run',
        '--json',
        '--debug',
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: homeDirectory,
        },
      },
    );

    expect(result.status).toBe(0);
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(result.stderr).toContain('DEBUG');
  });

  it('forwards --debug through the check command', async () => {
    const repoRoot = await makeTempDirectory();
    await writeFile(path.join(repoRoot, 'README.md'), 'hello\n', 'utf8');

    const result = spawnSync(
      process.execPath,
      [
        path.join(repositoryRoot, 'bin/agents-hierarchy.mjs'),
        'check',
        '--debug',
      ],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        env: process.env,
      },
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('DEBUG');
    expect(result.stderr).toContain('AGENTS.md files are out of date');
  });
});
