import { describe, expect, it } from 'vitest';
import { createProgram } from '../../agentsmd-hierarchy/scripts/lib/program.mjs';

function getCommand(program, name) {
  const command = program.commands.find(
    (candidate) => candidate.name() === name,
  );
  if (!command) {
    throw new Error(`Missing command: ${name}`);
  }

  return command;
}

describe('createProgram', () => {
  it('registers the expected subcommands', () => {
    const program = createProgram();
    expect(program.commands.map((command) => command.name())).toEqual([
      'check',
      'sync',
      'install',
    ]);
  });

  it('adds --debug to every subcommand', () => {
    const program = createProgram();

    for (const command of program.commands) {
      expect(command.options.some((option) => option.long === '--debug')).toBe(
        true,
      );
    }
  });

  it('keeps --strict-placeholders on the check and sync commands', () => {
    const checkCommand = getCommand(createProgram(), 'check');
    const syncCommand = getCommand(createProgram(), 'sync');

    expect(
      checkCommand.options.some(
        (option) => option.long === '--strict-placeholders',
      ),
    ).toBe(true);
    expect(
      syncCommand.options.some(
        (option) => option.long === '--strict-placeholders',
      ),
    ).toBe(true);
  });

  it('exposes the install contract flags', () => {
    const installCommand = getCommand(createProgram(), 'install');
    const longFlags = installCommand.options.map((option) => option.long);

    expect(longFlags).toEqual(
      expect.arrayContaining([
        '--debug',
        '--tool',
        '--scope',
        '--mode',
        '--project-root',
        '--dest',
        '--force',
        '--dry-run',
        '--json',
        '--no-prompt',
      ]),
    );
  });
});
