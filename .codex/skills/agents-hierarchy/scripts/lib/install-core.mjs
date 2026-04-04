import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { confirm, input, select } from '@inquirer/prompts';
import fs from 'fs-extra';
import { createLogger } from './cli-logger.mjs';
import { CommandError, isCommandError } from './errors.mjs';

const PACKAGE_NAME = 'agents-hierarchy';
const RECEIPT_FILE_NAME = '.agents-hierarchy-install.json';
const CURSOR_COMMAND_RECEIPT_FILE_NAME =
  '.agents-hierarchy-command-install.json';

function getPackageRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

function getPackageMetadata() {
  const packageJsonPath = path.join(getPackageRoot(), 'package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

function getSkillSourceDirectory() {
  return path.join(getPackageRoot(), 'agents-hierarchy');
}

function canPrompt(stdout = process.stdout, stdin = process.stdin) {
  return Boolean(stdout.isTTY && stdin.isTTY);
}

function resolveHomeDirectory(env) {
  return env.HOME || env.USERPROFILE || os.homedir();
}

export function detectProjectRoot(cwd) {
  try {
    const output = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    return output || null;
  } catch {
    return null;
  }
}

function getSupportedModes(tool) {
  switch (tool) {
    case 'codex':
      return ['skill', 'plugin'];
    case 'claude':
      return ['skill'];
    case 'cursor':
      return ['command'];
    default:
      return [];
  }
}

function normalizeInstallPath(rawValue, cwd) {
  if (!rawValue) {
    return null;
  }

  return path.resolve(cwd, rawValue);
}

function getDefaultScope(projectRoot) {
  return projectRoot ? 'project' : 'personal';
}

function validateResolvedMode(tool, mode) {
  const supportedModes = getSupportedModes(tool);
  if (!supportedModes.includes(mode)) {
    throw new CommandError(
      `Mode "${mode}" is not supported for tool "${tool}".`
    );
  }
}

function getDefaultMode(tool) {
  return getSupportedModes(tool)[0] ?? null;
}

function ensureDeterministicInstallInputs(options, projectRoot) {
  if (options.prompt) {
    return;
  }

  if (!options.tool) {
    throw new CommandError('Pass --tool when using --no-prompt.');
  }

  if (!options.dest && !options.scope) {
    throw new CommandError('Pass --scope or --dest when using --no-prompt.');
  }

  if (options.scope === 'project' && !options.projectRoot && !projectRoot) {
    throw new CommandError(
      'Pass --project-root or run inside a git repository for project installs.'
    );
  }
}

async function resolveInteractiveChoice(options, runtime, projectRoot, logger) {
  const stdin = runtime.stdin ?? process.stdin;
  const stdout = runtime.stdout ?? process.stdout;

  if (!canPrompt(stdout, stdin)) {
    throw new CommandError(
      'Interactive install requires a TTY. Re-run with --no-prompt and explicit flags.'
    );
  }

  let tool = options.tool;
  if (!tool) {
    tool = await select({
      choices: [
        {
          name: 'Codex',
          value: 'codex',
        },
        {
          name: 'Claude Code',
          value: 'claude',
        },
        {
          name: 'Cursor',
          value: 'cursor',
        },
      ],
      message: 'Choose an install target:',
    });
  }

  let scope = options.scope;
  if (!scope && !options.dest) {
    const defaultScope = getDefaultScope(projectRoot);
    logger.debug('interactive_default_scope_resolved', {
      defaultScope,
      detectedProjectRoot: projectRoot,
    });
    scope = await select({
      choices: [
        {
          name: defaultScope === 'project' ? 'Project (recommended)' : 'Project',
          value: 'project',
        },
        {
          name:
            defaultScope === 'personal' ? 'Personal (recommended)' : 'Personal',
          value: 'personal',
        },
      ],
      default: defaultScope,
      message: 'Where should the install go?',
    });
  }

  let mode = options.mode;
  const supportedModes = getSupportedModes(tool);
  if (!mode) {
    if (supportedModes.length === 1) {
      mode = supportedModes[0];
    } else {
      mode = await select({
        choices: supportedModes.map(candidate => ({
          name:
            candidate === 'skill'
              ? 'Skill bundle'
              : candidate === 'plugin'
                ? 'Codex plugin bundle'
                : 'Cursor command',
          value: candidate,
        })),
        default: supportedModes[0],
        message: 'Choose an install mode:',
      });
    }
  }

  let dest = options.dest;
  if (tool === 'codex' && mode === 'plugin' && !dest) {
    dest = await input({
      message:
        'Enter the destination directory for the Codex plugin bundle:',
      validate(value) {
        return value.trim()
          ? true
          : 'Enter a destination directory for the plugin bundle.';
      },
    });
  }

  return {
    ...options,
    dest,
    mode,
    scope,
    tool,
  };
}

function resolveProjectInstallRoot({
  cwd,
  detectedProjectRoot,
  explicitProjectRoot,
  prompt,
  scope,
}) {
  if (explicitProjectRoot) {
    return explicitProjectRoot;
  }

  if (scope !== 'project') {
    return null;
  }

  if (prompt) {
    return cwd;
  }

  return detectedProjectRoot;
}

function getReceiptPath(plan) {
  return plan.layout === 'file'
    ? path.join(path.dirname(plan.destination), CURSOR_COMMAND_RECEIPT_FILE_NAME)
    : path.join(plan.destination, RECEIPT_FILE_NAME);
}

async function readReceipt(receiptPath) {
  if (!(await fs.pathExists(receiptPath))) {
    return null;
  }

  try {
    return JSON.parse(await fs.readFile(receiptPath, 'utf8'));
  } catch {
    return null;
  }
}

async function resolveManagedState(plan) {
  const receiptPath = getReceiptPath(plan);
  const receipt = await readReceipt(receiptPath);
  return {
    receipt,
    receiptPath,
    managedByPackage: receipt?.packageName === PACKAGE_NAME,
  };
}

function buildSkillDestination(tool, scope, homeDirectory, projectRoot) {
  const parentDirectory =
    scope === 'personal'
      ? path.join(homeDirectory, tool === 'codex' ? '.codex' : '.claude', 'skills')
      : path.join(
          projectRoot,
          tool === 'codex' ? '.codex' : '.claude',
          'skills'
        );

  return path.join(parentDirectory, PACKAGE_NAME);
}

function buildCursorDestination(scope, homeDirectory, projectRoot) {
  const commandDirectory =
    scope === 'personal'
      ? path.join(homeDirectory, '.cursor', 'commands')
      : path.join(projectRoot, '.cursor', 'commands');

  return path.join(commandDirectory, `${PACKAGE_NAME}.md`);
}

function buildInstallDestination({
  dest,
  homeDirectory,
  mode,
  projectRoot,
  scope,
  tool,
  cwd,
}) {
  if (dest) {
    return normalizeInstallPath(dest, cwd);
  }

  if (mode === 'plugin') {
    throw new CommandError(
      'Codex plugin export requires --dest or an interactive destination selection.'
    );
  }

  if (!scope) {
    throw new CommandError('Install scope could not be resolved.');
  }

  if (scope === 'project' && !projectRoot) {
    throw new CommandError(
      'Project installs require --project-root or a detectable git repository.'
    );
  }

  if (mode === 'skill') {
    return buildSkillDestination(tool, scope, homeDirectory, projectRoot);
  }

  if (mode === 'command') {
    return buildCursorDestination(scope, homeDirectory, projectRoot);
  }

  throw new CommandError('Unable to resolve install destination.');
}

export function renderCursorCommandFile() {
  return [
    '# AGENTS Hierarchy',
    '',
    'Use the `agents-hierarchy` CLI to inspect or refresh layered `AGENTS.md` files.',
    '',
    'Preferred commands:',
    '- `agents-hierarchy check <path>` to validate AGENTS coverage.',
    '- `agents-hierarchy fix <path>` to scaffold or refresh AGENTS.md files.',
    '- `agents-hierarchy scaffold <dir>` when a new directory needs its first AGENTS.md.',
    '- Add `--debug` on any command when trace output would help.',
    '',
    'If the CLI is not on `PATH`, fall back to `npx -y agents-hierarchy <subcommand> ...`.',
  ].join('\n');
}

function buildPluginManifest(packageMetadata) {
  return {
    description:
      'Installable AGENTS Hierarchy plugin bundle for Codex with the packaged skill and CLI helpers.',
    interface: {
      capabilities: ['Interactive', 'Write'],
      category: 'Productivity',
      defaultPrompt: [
        'Read the AGENTS chain for this repository and fix stale AGENTS.md files.',
        'Validate the AGENTS hierarchy under a changed package with debug output.',
        'Scaffold a missing AGENTS.md for a newly added source directory.',
      ],
      developerName: packageMetadata.author,
      displayName: 'AGENTS Hierarchy',
      longDescription:
        'Packages the AGENTS Hierarchy skill and helper scripts so Codex can validate, scaffold, and maintain layered AGENTS.md files.',
      shortDescription:
        'Installable AGENTS Hierarchy skill bundle and helper scripts.',
    },
    keywords: ['agents', 'codex', 'skills', 'cli'],
    license: packageMetadata.license,
    name: packageMetadata.name,
    skills: './skills/',
    version: packageMetadata.version,
  };
}

export async function resolveInstallPlan(rawOptions = {}, runtime = {}) {
  const cwd = runtime.cwd ?? process.cwd();
  const env = runtime.env ?? process.env;
  const explicitProjectRoot = rawOptions.projectRoot
    ? normalizeInstallPath(rawOptions.projectRoot, cwd)
    : null;
  const logStdout = rawOptions.json
    ? runtime.stderr ?? process.stderr
    : runtime.stdout ?? process.stdout;
  const logger = createLogger('install', {
    debugEnabled: Boolean(rawOptions.debug),
    stderr: runtime.stderr ?? process.stderr,
    stdout: logStdout,
  });
  const detectedProjectRoot =
    explicitProjectRoot ?? detectProjectRoot(cwd);
  const options = {
    debug: Boolean(rawOptions.debug),
    dest: rawOptions.dest ?? null,
    dryRun: Boolean(rawOptions.dryRun),
    force: Boolean(rawOptions.force),
    json: Boolean(rawOptions.json),
    mode: rawOptions.mode ?? null,
    projectRoot: explicitProjectRoot,
    prompt: rawOptions.prompt !== false,
    scope: rawOptions.scope ?? null,
    tool: rawOptions.tool ?? null,
  };

  logger.debug('install_input_normalized', {
    detectedProjectRoot,
    options,
  });

  ensureDeterministicInstallInputs(options, detectedProjectRoot);

  const interactiveOptions =
    options.prompt && (!options.tool || (!options.scope && !options.dest))
      ? await resolveInteractiveChoice(options, runtime, detectedProjectRoot, logger)
      : options.prompt && options.tool && !options.mode
        ? await resolveInteractiveChoice(options, runtime, detectedProjectRoot, logger)
        : options;

  const tool = interactiveOptions.tool;
  if (!tool) {
    throw new CommandError('Install target tool could not be resolved.');
  }

  const mode = interactiveOptions.mode ?? getDefaultMode(tool);
  validateResolvedMode(tool, mode);

  const scope = interactiveOptions.dest
    ? interactiveOptions.scope
    : interactiveOptions.scope ?? getDefaultScope(detectedProjectRoot);
  const projectRoot = resolveProjectInstallRoot({
    cwd,
    detectedProjectRoot,
    explicitProjectRoot: interactiveOptions.projectRoot,
    prompt: interactiveOptions.prompt,
    scope,
  });
  const homeDirectory = resolveHomeDirectory(env);
  const destination = buildInstallDestination({
    cwd,
    dest: interactiveOptions.dest,
    homeDirectory,
    mode,
    projectRoot,
    scope,
    tool,
  });
  const packageMetadata = getPackageMetadata();
  const plan = {
    destination,
    dryRun: interactiveOptions.dryRun,
    force: interactiveOptions.force,
    homeDirectory,
    json: interactiveOptions.json,
    layout: mode === 'command' ? 'file' : 'directory',
    mode,
    packageName: packageMetadata.name,
    packageVersion: packageMetadata.version,
    projectRoot,
    prompt: interactiveOptions.prompt,
    scope,
    tool,
  };

  logger.debug('install_plan_resolved', plan);
  return plan;
}

function summarizePlan(plan, managedState, operations) {
  return {
    destination: plan.destination,
    dryRun: plan.dryRun,
    managedDestination: managedState.managedByPackage,
    mode: plan.mode,
    operations,
    packageName: plan.packageName,
    packageVersion: plan.packageVersion,
    projectRoot: plan.projectRoot,
    receiptPath: managedState.receiptPath,
    scope: plan.scope,
    tool: plan.tool,
  };
}

async function assertInstallableDestination(plan, managedState) {
  const destinationExists = await fs.pathExists(plan.destination);
  if (!destinationExists) {
    return;
  }

  if (managedState.managedByPackage || plan.force) {
    return;
  }

  throw new CommandError(
    `Destination already exists and is not managed by ${PACKAGE_NAME}: ${plan.destination}. Re-run with --force to replace it.`
  );
}

async function clearDestination(plan) {
  if (!(await fs.pathExists(plan.destination))) {
    return;
  }

  if (plan.layout === 'file') {
    await fs.remove(plan.destination);
    return;
  }

  await fs.remove(plan.destination);
}

async function writeReceipt(managedState, plan) {
  const receipt = {
    installedAt: new Date().toISOString(),
    mode: plan.mode,
    packageName: plan.packageName,
    packageVersion: plan.packageVersion,
    scope: plan.scope,
    tool: plan.tool,
  };

  await fs.outputJson(managedState.receiptPath, receipt, { spaces: 2 });
}

async function installSkillBundle(plan, managedState, logger) {
  const sourceDirectory = getSkillSourceDirectory();
  const operations = [
    {
      from: sourceDirectory,
      to: plan.destination,
      type: 'copy-directory',
    },
  ];

  if (plan.dryRun) {
    return operations;
  }

  await clearDestination(plan);
  await fs.copy(sourceDirectory, plan.destination, { overwrite: true });
  await writeReceipt(managedState, plan);
  logger.success(`Installed skill bundle to ${logger.style(plan.destination, 'path')}.`);
  return operations;
}

async function installCursorCommand(plan, managedState, logger) {
  const operations = [
    {
      to: plan.destination,
      type: 'write-file',
    },
  ];

  if (plan.dryRun) {
    return operations;
  }

  await fs.ensureDir(path.dirname(plan.destination));
  await fs.writeFile(plan.destination, `${renderCursorCommandFile()}\n`, 'utf8');
  await writeReceipt(managedState, plan);
  logger.success(`Installed Cursor command to ${logger.style(plan.destination, 'path')}.`);
  return operations;
}

async function installCodexPlugin(plan, managedState, logger) {
  const pluginManifestPath = path.join(
    plan.destination,
    '.codex-plugin',
    'plugin.json'
  );
  const pluginSkillDestination = path.join(
    plan.destination,
    'skills',
    PACKAGE_NAME
  );
  const packageMetadata = getPackageMetadata();
  const operations = [
    {
      to: pluginManifestPath,
      type: 'write-plugin-manifest',
    },
    {
      from: getSkillSourceDirectory(),
      to: pluginSkillDestination,
      type: 'copy-directory',
    },
  ];

  if (plan.dryRun) {
    return operations;
  }

  await clearDestination(plan);
  await fs.ensureDir(path.dirname(pluginManifestPath));
  await fs.outputJson(pluginManifestPath, buildPluginManifest(packageMetadata), {
    spaces: 2,
  });
  await fs.copy(getSkillSourceDirectory(), pluginSkillDestination, {
    overwrite: true,
  });
  await writeReceipt(managedState, plan);
  logger.success(
    `Exported Codex plugin bundle to ${logger.style(plan.destination, 'path')}.`
  );
  logger.note(
    'If you use a local Codex marketplace, register the exported plugin path there manually.'
  );
  return operations;
}

export async function runInstallCommand(rawOptions = {}, runtime = {}) {
  const stdout = runtime.stdout ?? process.stdout;
  const stderr = runtime.stderr ?? process.stderr;
  const logStdout = rawOptions.json ? stderr : stdout;
  const logger = createLogger('install', {
    debugEnabled: Boolean(rawOptions.debug),
    stderr,
    stdout: logStdout,
  });

  try {
    const plan = await resolveInstallPlan(rawOptions, runtime);
    const managedState = await resolveManagedState(plan);
    logger.debug('managed_state_resolved', managedState);
    await assertInstallableDestination(plan, managedState);

    const destinationExists = await fs.pathExists(plan.destination);
    const operations = [];

    logger.debug('install_operation_started', {
      destinationExists,
      destination: plan.destination,
      layout: plan.layout,
      mode: plan.mode,
      scope: plan.scope,
      tool: plan.tool,
    });

    if (plan.mode === 'skill') {
      operations.push(
        ...(await installSkillBundle(plan, managedState, logger))
      );
    } else if (plan.mode === 'command') {
      operations.push(
        ...(await installCursorCommand(plan, managedState, logger))
      );
    } else if (plan.mode === 'plugin') {
      operations.push(
        ...(await installCodexPlugin(plan, managedState, logger))
      );
    } else {
      throw new CommandError(`Unsupported install mode: ${plan.mode}`);
    }

    const summary = summarizePlan(plan, managedState, operations);
    if (plan.json) {
      stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    } else if (plan.dryRun) {
      logger.note(`Dry run only. Would install to ${logger.style(plan.destination, 'path')}.`);
    }

    logger.debug('install_operation_completed', summary);
    return 0;
  } catch (error) {
    if (isCommandError(error)) {
      logger.error(error.message);
      return error.exitCode;
    }

    throw error;
  }
}
