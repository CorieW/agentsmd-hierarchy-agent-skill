#!/usr/bin/env node

import { runValidateAgentsCommand } from './lib/validate-agents-core.mjs';

const originalArgs = process.argv.slice(2);
const normalizedArgs = originalArgs.includes('--check')
  ? ['--check', ...originalArgs.filter((argument) => argument !== '--check')]
  : ['--fix', ...originalArgs];

const exitCode = await runValidateAgentsCommand(normalizedArgs);
process.exit(exitCode);
