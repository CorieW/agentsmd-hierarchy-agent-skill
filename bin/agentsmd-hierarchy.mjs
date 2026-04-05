#!/usr/bin/env node

import { runCli } from '../agentsmd-hierarchy/scripts/lib/program.mjs';

const exitCode = await runCli(process.argv.slice(2));
process.exit(exitCode);
