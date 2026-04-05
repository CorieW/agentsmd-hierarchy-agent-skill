import { Command, CommanderError, Option } from 'commander';
import { createLogger } from './cli-logger.mjs';
import { isCommandError } from './errors.mjs';
import { runInstallCommand } from './install-core.mjs';
import { runValidateAgentsCommand } from './validate-agents-core.mjs';

function addSharedDebugOption(command) {
  return command.option(
    '--debug',
    'Enable structured debug logs for testing and troubleshooting.',
  );
}

function addValidateOptions(command) {
  return addSharedDebugOption(command).option(
    '--strict-placeholders',
    'Treat placeholder descriptions as validation errors.',
  );
}

async function handleCommandError(error) {
  if (error instanceof CommanderError) {
    if (error.code === 'commander.helpDisplayed') {
      return 0;
    }

    if (error.message) {
      process.stderr.write(`${error.message}\n`);
    }
    return error.exitCode || 1;
  }

  if (isCommandError(error)) {
    const logger = createLogger('agentsmd-hierarchy');
    logger.error(error.message);
    return error.exitCode;
  }

  throw error;
}

export function createProgram(runtime = {}) {
  const program = new Command();
  const sharedRuntime = {
    cwd: runtime.cwd,
    env: runtime.env,
    stderr: runtime.stderr,
    stdin: runtime.stdin,
    stdout: runtime.stdout,
  };

  program
    .name('agentsmd-hierarchy')
    .description(
      'Validate, scaffold, and install the AGENTS Hierarchy skill bundle.',
    )
    .showHelpAfterError()
    .exitOverride();

  addValidateOptions(
    program
      .command('check [path]')
      .description('Validate AGENTS.md files without changing them.'),
  ).action(async (targetPath, options) => {
    const argv = ['--check'];
    if (targetPath) {
      argv.push(targetPath);
    }
    if (options.strictPlaceholders) {
      argv.push('--strict-placeholders');
    }
    if (options.debug) {
      argv.push('--debug');
    }
    const exitCode = await runValidateAgentsCommand(argv, sharedRuntime);
    if (exitCode !== 0) {
      throw new CommanderError(exitCode, 'agentsmd-hierarchy.check.failed', '');
    }
  });

  addValidateOptions(
    program
      .command('fix [path]')
      .description('Refresh missing or stale AGENTS.md files.'),
  ).action(async (targetPath, options) => {
    const argv = ['--fix'];
    if (targetPath) {
      argv.push(targetPath);
    }
    if (options.strictPlaceholders) {
      argv.push('--strict-placeholders');
    }
    if (options.debug) {
      argv.push('--debug');
    }
    const exitCode = await runValidateAgentsCommand(argv, sharedRuntime);
    if (exitCode !== 0) {
      throw new CommanderError(exitCode, 'agentsmd-hierarchy.fix.failed', '');
    }
  });

  addSharedDebugOption(
    program.command('sync [path]').description('Compatibility alias for fix.'),
  ).action(async (targetPath, options) => {
    const argv = ['--fix'];
    if (targetPath) {
      argv.push(targetPath);
    }
    if (options.debug) {
      argv.push('--debug');
    }
    const exitCode = await runValidateAgentsCommand(argv, sharedRuntime);
    if (exitCode !== 0) {
      throw new CommanderError(exitCode, 'agentsmd-hierarchy.sync.failed', '');
    }
  });

  addSharedDebugOption(
    program
      .command('scaffold <dir>')
      .description(
        'Scaffold AGENTS.md files for a required repo-relative directory.',
      ),
  ).action(async (directory, options) => {
    const argv = ['--fix', directory];
    if (options.debug) {
      argv.push('--debug');
    }
    const exitCode = await runValidateAgentsCommand(argv, sharedRuntime);
    if (exitCode !== 0) {
      throw new CommanderError(
        exitCode,
        'agentsmd-hierarchy.scaffold.failed',
        '',
      );
    }
  });

  addSharedDebugOption(
    program
      .command('install')
      .description(
        'Install the skill bundle into Codex, Claude, Cursor, or a Codex plugin directory.',
      ),
  )
    .addOption(
      new Option('--tool <tool>').choices(['codex', 'claude', 'cursor']),
    )
    .addOption(new Option('--scope <scope>').choices(['personal', 'project']))
    .addOption(
      new Option('--mode <mode>').choices(['skill', 'plugin', 'command']),
    )
    .option(
      '--project-root <path>',
      'Project root to use for project-scoped installs.',
    )
    .option('--dest <path>', 'Explicit install destination path.')
    .option('--force', 'Overwrite unmanaged destinations.')
    .option('--dry-run', 'Preview the install without writing files.')
    .option('--json', 'Emit the install summary as JSON.')
    .option(
      '--no-prompt',
      'Disable interactive prompts and require deterministic inputs.',
    )
    .action(async (options) => {
      const exitCode = await runInstallCommand(options, sharedRuntime);
      if (exitCode !== 0) {
        throw new CommanderError(
          exitCode,
          'agentsmd-hierarchy.install.failed',
          '',
        );
      }
    });

  return program;
}

export async function runCli(argv = process.argv.slice(2), runtime = {}) {
  const program = createProgram(runtime);

  try {
    await program.parseAsync(argv, { from: 'user' });
    return 0;
  } catch (error) {
    return handleCommandError(error);
  }
}
