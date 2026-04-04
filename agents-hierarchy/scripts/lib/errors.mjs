export class CommandError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'CommandError';
    this.exitCode = options.exitCode ?? 1;
    this.exposeHelp = options.exposeHelp ?? false;
  }
}

export function isCommandError(error) {
  return error instanceof CommandError;
}
