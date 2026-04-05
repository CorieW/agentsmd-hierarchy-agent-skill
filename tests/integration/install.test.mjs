import os from 'node:os';
import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import { runInstallCommand } from '../../agentsmd-hierarchy/scripts/lib/install-core.mjs';

const temporaryDirectories = [];
const RECEIPT_FILE_NAME = '.agentsmd-hierarchy-install.json';

function createBufferStream() {
  const chunks = [];
  return {
    get output() {
      return chunks.join('');
    },
    isTTY: false,
    write(chunk) {
      chunks.push(String(chunk));
    },
  };
}

async function makeTempDirectory() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'agentsmd-hierarchy-'),
  );
  temporaryDirectories.push(directory);
  return directory;
}

async function runInstall(rawOptions, runtime = {}) {
  const stdout = createBufferStream();
  const stderr = createBufferStream();
  const exitCode = await runInstallCommand(rawOptions, {
    ...runtime,
    stderr,
    stdout,
  });

  return {
    exitCode,
    stderr: stderr.output,
    stdout: stdout.output,
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe('runInstallCommand', () => {
  it.each([false, true])(
    'installs the Codex skill bundle in personal scope (debug=%s)',
    async (debug) => {
      const homeDirectory = await makeTempDirectory();
      const result = await runInstall(
        {
          debug,
          prompt: false,
          scope: 'personal',
          tool: 'codex',
        },
        {
          cwd: homeDirectory,
          env: {
            ...process.env,
            HOME: homeDirectory,
          },
        },
      );

      expect(result.exitCode).toBe(0);
      await expect(
        fs.pathExists(
          path.join(
            homeDirectory,
            '.codex',
            'skills',
            'agentsmd-hierarchy',
            'SKILL.md',
          ),
        ),
      ).resolves.toBe(true);
    },
  );

  it.each([false, true])(
    'installs the Codex skill bundle in project scope (debug=%s)',
    async (debug) => {
      const projectRoot = await makeTempDirectory();
      const result = await runInstall(
        {
          debug,
          projectRoot,
          prompt: false,
          scope: 'project',
          tool: 'codex',
        },
        {
          cwd: projectRoot,
          env: process.env,
        },
      );

      expect(result.exitCode).toBe(0);
      await expect(
        fs.pathExists(
          path.join(
            projectRoot,
            '.codex',
            'skills',
            'agentsmd-hierarchy',
            RECEIPT_FILE_NAME,
          ),
        ),
      ).resolves.toBe(true);
    },
  );

  it.each([false, true])(
    'installs the Claude skill bundle in personal scope (debug=%s)',
    async (debug) => {
      const homeDirectory = await makeTempDirectory();
      const result = await runInstall(
        {
          debug,
          prompt: false,
          scope: 'personal',
          tool: 'claude',
        },
        {
          cwd: homeDirectory,
          env: {
            ...process.env,
            HOME: homeDirectory,
          },
        },
      );

      expect(result.exitCode).toBe(0);
      await expect(
        fs.pathExists(
          path.join(
            homeDirectory,
            '.claude',
            'skills',
            'agentsmd-hierarchy',
            'scripts',
            'validate-agents.mjs',
          ),
        ),
      ).resolves.toBe(true);
    },
  );

  it.each([false, true])(
    'installs the Claude skill bundle in project scope (debug=%s)',
    async (debug) => {
      const projectRoot = await makeTempDirectory();
      const result = await runInstall(
        {
          debug,
          projectRoot,
          prompt: false,
          scope: 'project',
          tool: 'claude',
        },
        {
          cwd: projectRoot,
          env: process.env,
        },
      );

      expect(result.exitCode).toBe(0);
      await expect(
        fs.pathExists(
          path.join(
            projectRoot,
            '.claude',
            'skills',
            'agentsmd-hierarchy',
            'SKILL.md',
          ),
        ),
      ).resolves.toBe(true);
    },
  );

  it.each([false, true])(
    'installs the Cursor command in personal scope (debug=%s)',
    async (debug) => {
      const homeDirectory = await makeTempDirectory();
      const result = await runInstall(
        {
          debug,
          prompt: false,
          scope: 'personal',
          tool: 'cursor',
        },
        {
          cwd: homeDirectory,
          env: {
            ...process.env,
            HOME: homeDirectory,
          },
        },
      );

      expect(result.exitCode).toBe(0);
      const commandPath = path.join(
        homeDirectory,
        '.cursor',
        'commands',
        'agentsmd-hierarchy.md',
      );
      expect(await readFile(commandPath, 'utf8')).toContain('--debug');
    },
  );

  it.each([false, true])(
    'installs the Cursor command in project scope (debug=%s)',
    async (debug) => {
      const projectRoot = await makeTempDirectory();
      const result = await runInstall(
        {
          debug,
          projectRoot,
          prompt: false,
          scope: 'project',
          tool: 'cursor',
        },
        {
          cwd: projectRoot,
          env: process.env,
        },
      );

      expect(result.exitCode).toBe(0);
      await expect(
        fs.pathExists(
          path.join(
            projectRoot,
            '.cursor',
            'commands',
            'agentsmd-hierarchy.md',
          ),
        ),
      ).resolves.toBe(true);
    },
  );

  it('exports a Codex plugin bundle to an explicit destination', async () => {
    const rootDirectory = await makeTempDirectory();
    const pluginDestination = path.join(
      rootDirectory,
      'plugins',
      'agentsmd-hierarchy',
    );
    const result = await runInstall(
      {
        dest: pluginDestination,
        mode: 'plugin',
        prompt: false,
        scope: 'personal',
        tool: 'codex',
      },
      {
        cwd: rootDirectory,
        env: {
          ...process.env,
          HOME: rootDirectory,
        },
      },
    );

    expect(result.exitCode).toBe(0);
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
  });
});
