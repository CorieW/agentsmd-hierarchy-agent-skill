import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import {
  renderCursorCommandFile,
  resolveInstallPlan,
} from '../../agentsmd-hierarchy/scripts/lib/install-core.mjs';

const temporaryDirectories = [];

async function makeTempDirectory() {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), 'agentsmd-hierarchy-'),
  );
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

describe('resolveInstallPlan', () => {
  it('resolves a personal Codex skill destination', async () => {
    const homeDirectory = await makeTempDirectory();
    const plan = await resolveInstallPlan(
      {
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

    expect(plan.destination).toBe(
      path.join(homeDirectory, '.codex', 'skills', 'agentsmd-hierarchy'),
    );
    expect(plan.mode).toBe('skill');
  });

  it('resolves a project Cursor command destination', async () => {
    const projectRoot = await makeTempDirectory();
    const plan = await resolveInstallPlan(
      {
        prompt: false,
        projectRoot,
        scope: 'project',
        tool: 'cursor',
      },
      {
        cwd: projectRoot,
        env: process.env,
      },
    );

    expect(plan.destination).toBe(
      path.join(projectRoot, '.cursor', 'commands', 'agentsmd-hierarchy.md'),
    );
    expect(plan.mode).toBe('command');
  });

  it('uses the current working directory for interactive project installs', async () => {
    const cwd = await makeTempDirectory();
    const plan = await resolveInstallPlan(
      {
        mode: 'skill',
        prompt: true,
        scope: 'project',
        tool: 'codex',
      },
      {
        cwd,
        env: process.env,
      },
    );

    expect(plan.destination).toBe(
      path.join(cwd, '.codex', 'skills', 'agentsmd-hierarchy'),
    );
    expect(plan.projectRoot).toBe(cwd);
  });

  it('requires an explicit destination for Codex plugin export', async () => {
    const homeDirectory = await makeTempDirectory();

    await expect(
      resolveInstallPlan(
        {
          mode: 'plugin',
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
      ),
    ).rejects.toThrow('requires --dest');
  });
});

describe('renderCursorCommandFile', () => {
  it('mentions the supported command flow and debug mode', () => {
    const content = renderCursorCommandFile();

    expect(content).toContain('agentsmd-hierarchy check <path>');
    expect(content).toContain('agentsmd-hierarchy sync <path>');
    expect(content).toContain('--debug');
  });
});
