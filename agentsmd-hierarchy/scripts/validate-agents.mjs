#!/usr/bin/env node

import { runValidateAgentsCommand } from './lib/validate-agents-core.mjs';

const exitCode = await runValidateAgentsCommand(process.argv.slice(2));
process.exit(exitCode);
