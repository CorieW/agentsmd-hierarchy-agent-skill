#!/usr/bin/env node

import path from 'node:path';
import { resolveRequiredDirectory } from './cli-prompts.mjs';
import { createLogger } from './lib/cli-logger.mjs';
import { CommandError } from './lib/errors.mjs';
import { runValidateAgentsCommand } from './lib/validate-agents-core.mjs';

function normalizeDirectory(rawValue, cwd) {
  if (!rawValue) {
    throw new CommandError(
      'Usage: node .codex/skills/agents-hierarchy/scripts/scaffold-agents.mjs <repo-relative-directory>'
    );
  }

  if (path.isAbsolute(rawValue)) {
    throw new CommandError('Pass a repo-relative directory, not an absolute path.');
  }

  const normalizedValue = path.posix.normalize(rawValue.replaceAll('\\', '/'));
  if (normalizedValue === '.' || normalizedValue === '') {
    return '.';
  }

  if (normalizedValue === '..' || normalizedValue.startsWith('../')) {
    throw new CommandError('Path must stay inside the repository root.');
  }

  return normalizedValue;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const debug = rawArgs.includes('--debug');
  const positionalDirectory = rawArgs.find(argument => !argument.startsWith('--'));
  const logger = createLogger('scaffold-agents', {
    debugEnabled: debug,
  });

  try {
    const selectedDirectory = await resolveRequiredDirectory({
      normalizeDirectory: value => normalizeDirectory(value, process.cwd()),
      optionDirectory: null,
      positionalDirectory,
    });

    logger.debug('scaffold_target_resolved', {
      selectedDirectory,
    });

    const nextArgs = ['--fix', selectedDirectory];
    if (debug) {
      nextArgs.push('--debug');
    }

    const exitCode = await runValidateAgentsCommand(nextArgs);
    process.exit(exitCode);
  } catch (error) {
    if (error instanceof CommandError || error instanceof Error) {
      logger.error(error.message);
      process.exit(1);
    }

    throw error;
  }
}

await main();
