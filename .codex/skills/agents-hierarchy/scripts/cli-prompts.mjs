import { input, select } from '@inquirer/prompts';

function canPrompt() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export async function resolveOptionalScope({
  allSelected,
  allSelectionLabel,
  normalizePath,
  optionPath,
  positionalPath,
  promptMessage,
  singleSelectionLabel,
}) {
  const explicitValues = [
    allSelected ? '__ALL__' : null,
    optionPath,
    positionalPath,
  ].filter(Boolean);

  if (explicitValues.length > 1) {
    throw new Error('Pass only one of a positional path, --path, or --all.');
  }

  if (allSelected) {
    return normalizePath('.');
  }

  if (optionPath) {
    return normalizePath(optionPath);
  }

  if (positionalPath) {
    return normalizePath(positionalPath);
  }

  if (!canPrompt()) {
    return normalizePath('.');
  }

  const selectionMode = await select({
    choices: [
      {
        name: allSelectionLabel,
        value: 'all',
      },
      {
        name: singleSelectionLabel,
        value: 'single',
      },
    ],
    message: promptMessage,
  });

  if (selectionMode === 'all') {
    return normalizePath('.');
  }

  const selectedPath = await input({
    message:
      'Enter a repo-relative directory or AGENTS.md file path (for example: packages/front or packages/front/AGENTS.md):',
    validate(value) {
      return value.trim() ? true : 'Enter a repo-relative path.';
    },
  });

  return normalizePath(selectedPath.trim());
}

export async function resolveRequiredDirectory({
  normalizeDirectory,
  optionDirectory,
  positionalDirectory,
}) {
  const explicitValues = [optionDirectory, positionalDirectory].filter(Boolean);

  if (explicitValues.length > 1) {
    throw new Error('Pass either a positional directory or --path, not both.');
  }

  if (optionDirectory) {
    return normalizeDirectory(optionDirectory);
  }

  if (positionalDirectory) {
    return normalizeDirectory(positionalDirectory);
  }

  if (!canPrompt()) {
    throw new Error(
      'Usage: node .codex/skills/agents-hierarchy/scripts/scaffold-agents.mjs <repo-relative-directory>'
    );
  }

  const selectedDirectory = await input({
    message:
      'Enter the repo-relative directory to scaffold (for example: packages/front/src):',
    validate(value) {
      return value.trim() ? true : 'Enter a repo-relative directory.';
    },
  });

  return normalizeDirectory(selectedDirectory.trim());
}
