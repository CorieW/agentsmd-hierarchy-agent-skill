#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const sourceDirectory = path.join(repositoryRoot, 'agents-hierarchy');
const destinationDirectory = path.join(
  repositoryRoot,
  '.codex',
  'skills',
  'agents-hierarchy',
);

await fs.remove(destinationDirectory);
await fs.copy(sourceDirectory, destinationDirectory, { overwrite: true });
process.stdout.write(
  `Installed ${sourceDirectory} to ${destinationDirectory}.\n`,
);
