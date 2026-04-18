#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import {
  RULES_SECTION_HEADING,
  runValidateAgentsCommand,
} from './lib/validate-agents-core.mjs';

export async function runSyncAgentsCommand(rawArgs = [], runtime = {}) {
  const normalizedArgs = rawArgs.includes('--check')
    ? ['--check', ...rawArgs.filter((argument) => argument !== '--check')]
    : ['--sync', ...rawArgs];

  return runValidateAgentsCommand(normalizedArgs, {
    ...runtime,
    preferredRulesSectionHeading:
      normalizedArgs[0] === '--sync' ? RULES_SECTION_HEADING : null,
  });
}

async function main() {
  const exitCode = await runSyncAgentsCommand(process.argv.slice(2));
  process.exit(exitCode);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
