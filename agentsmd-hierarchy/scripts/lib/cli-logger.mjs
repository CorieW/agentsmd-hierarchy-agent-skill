const ANSI = {
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
};

function shouldUseColor(stdout, stderr) {
  if ('NO_COLOR' in process.env) {
    return false;
  }

  if (process.env.FORCE_COLOR === '0') {
    return false;
  }

  if (
    process.env.FORCE_COLOR &&
    process.env.FORCE_COLOR !== '0' &&
    process.env.FORCE_COLOR !== ''
  ) {
    return true;
  }

  return Boolean(stdout.isTTY || stderr.isTTY);
}

function applyAnsi(text, stdout, stderr, ...codes) {
  if (!shouldUseColor(stdout, stderr) || codes.length === 0) {
    return text;
  }

  return `${codes.join('')}${text}${ANSI.reset}`;
}

function getLevelStyle(level) {
  switch (level) {
    case 'DEBUG':
      return [ANSI.dim];
    case 'INFO':
      return [ANSI.blue, ANSI.bold];
    case 'STEP':
      return [ANSI.cyan, ANSI.bold];
    case 'DONE':
      return [ANSI.green, ANSI.bold];
    case 'WARN':
      return [ANSI.yellow, ANSI.bold];
    case 'FAIL':
      return [ANSI.red, ANSI.bold];
    case 'NOTE':
      return [ANSI.dim];
    default:
      return [];
  }
}

function sortDebugDetails(value) {
  if (Array.isArray(value)) {
    return value.map(sortDebugDetails);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortDebugDetails(value[key]);
        return result;
      }, {});
  }

  return value;
}

function formatDebugMessage(eventOrMessage, details) {
  if (details === undefined) {
    return String(eventOrMessage);
  }

  return `${eventOrMessage} ${JSON.stringify(sortDebugDetails(details))}`;
}

export function createLogger(name, options = {}) {
  const {
    debugEnabled = false,
    stderr = process.stderr,
    stdout = process.stdout,
  } = options;
  const prefix = applyAnsi(`[${name}]`, stdout, stderr, ANSI.cyan, ANSI.bold);

  function write(stream, level, message) {
    const styledLevel = applyAnsi(
      level,
      stdout,
      stderr,
      ...getLevelStyle(level),
    );
    stream.write(`${prefix} ${styledLevel} ${message}\n`);
  }

  return {
    style(text, tone) {
      switch (tone) {
        case 'path':
          return applyAnsi(text, stdout, stderr, ANSI.cyan);
        case 'success':
          return applyAnsi(text, stdout, stderr, ANSI.green);
        case 'warning':
          return applyAnsi(text, stdout, stderr, ANSI.yellow);
        case 'error':
          return applyAnsi(text, stdout, stderr, ANSI.red);
        case 'muted':
          return applyAnsi(text, stdout, stderr, ANSI.dim);
        case 'strong':
          return applyAnsi(text, stdout, stderr, ANSI.bold);
        default:
          return text;
      }
    },
    info(message) {
      write(stdout, 'INFO', message);
    },
    debug(eventOrMessage, details) {
      if (!debugEnabled) {
        return;
      }

      write(stdout, 'DEBUG', formatDebugMessage(eventOrMessage, details));
    },
    step(message) {
      write(stdout, 'STEP', message);
    },
    success(message) {
      write(stdout, 'DONE', message);
    },
    warn(message) {
      write(stderr, 'WARN', message);
    },
    error(message) {
      write(stderr, 'FAIL', message);
    },
    note(message) {
      write(stdout, 'NOTE', message);
    },
  };
}
