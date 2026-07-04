import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createLogger } from './cli-logger.mjs';
import { CommandError, isCommandError } from './errors.mjs';

const DEFAULT_EXCLUDED_SCAN_PATHS = ['.git', 'node_modules'];
const REMOVED_SECTION_HEADINGS = [
  'Directories',
  'Files',
  'Generated Files',
  'Ignore Files and Directories',
];
export const RULES_SECTION_HEADING = 'Rules';
export const LEGACY_RULES_SECTION_HEADING = 'Writing Rules';

function getRepoRoot(env, cwd) {
  if (env.REPO_ROOT) {
    return path.resolve(env.REPO_ROOT);
  }

  return cwd;
}

function isExcludedAgentsDirectory(directoryPath) {
  return (
    directoryPath === '.codex/skills' ||
    directoryPath.startsWith('.codex/skills/')
  );
}

function isExcludedScanPath(relativePath, excludedScanPaths) {
  return excludedScanPaths.some(
    (excludedPath) =>
      relativePath === excludedPath ||
      relativePath.startsWith(`${excludedPath}/`),
  );
}

function normalizeInputPath(rawValue, repoRoot) {
  if (!rawValue || rawValue === '.') {
    return {
      scopePath: '.',
      scopeType: 'directory',
    };
  }

  if (path.isAbsolute(rawValue)) {
    throw new CommandError('Pass a repo-relative path, not an absolute path.');
  }

  const normalizedPath = path.posix.normalize(rawValue.replaceAll('\\', '/'));
  if (normalizedPath === '..' || normalizedPath.startsWith('../')) {
    throw new CommandError('Path must stay inside the repository root.');
  }

  const absolutePath = path.resolve(repoRoot, normalizedPath);
  if (!existsSync(absolutePath)) {
    throw new CommandError(`Path not found: ${rawValue}`);
  }

  const stats = statSync(absolutePath);
  if (stats.isDirectory()) {
    return {
      scopePath: normalizedPath === '' ? '.' : normalizedPath,
      scopeType: 'directory',
    };
  }

  if (path.posix.basename(normalizedPath) !== 'AGENTS.md') {
    throw new CommandError('Pass a directory or an AGENTS.md file.');
  }

  return {
    scopePath: normalizedPath,
    scopeType: 'file',
  };
}

export function parseValidateArguments(argv, repoRoot) {
  let scope = {
    scopePath: '.',
    scopeType: 'directory',
  };
  let debug = false;
  let mode = null;

  for (const argument of argv) {
    if (argument === '--check') {
      if (mode && mode !== 'check') {
        throw new CommandError('Choose either --check or --sync, not both.');
      }

      mode = 'check';
      continue;
    }

    if (argument === '--sync') {
      if (mode && mode !== 'sync') {
        throw new CommandError('Choose either --check or --sync, not both.');
      }

      mode = 'sync';
      continue;
    }

    if (argument === '--debug') {
      debug = true;
      continue;
    }

    if (argument.startsWith('--')) {
      throw new CommandError(`Unknown option: ${argument}`);
    }

    if (scope.scopePath !== '.' || scope.scopeType !== 'directory') {
      throw new CommandError(
        'Usage: node .codex/skills/agentsmd-hierarchy/scripts/validate-agents.mjs [--check|--sync] [repo-relative-path-or-agents-file] [--debug]',
      );
    }

    scope = normalizeInputPath(argument, repoRoot);
  }

  return {
    debug,
    mode: mode ?? 'check',
    scope,
  };
}

function runGitLsFiles(repoRoot, args) {
  try {
    const output = execFileSync('git', ['ls-files', ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return output
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((filePath) => filePath.replaceAll('\\', '/'));
  } catch {
    return null;
  }
}

function collectFilesFromGit(repoRoot) {
  const trackedAndUntrackedPaths = runGitLsFiles(repoRoot, [
    '--cached',
    '--others',
    '--exclude-standard',
  ]);
  if (!trackedAndUntrackedPaths) {
    return null;
  }

  const deletedPaths = new Set(
    runGitLsFiles(repoRoot, ['--deleted', '--exclude-standard']) ?? [],
  );

  return trackedAndUntrackedPaths.filter(
    (filePath) => !deletedPaths.has(filePath),
  );
}

function collectFilesFromFilesystem(repoRoot, excludedScanPaths) {
  const filePaths = [];

  function visitDirectory(directoryPath) {
    const absoluteDirectoryPath =
      directoryPath === '.' ? repoRoot : path.resolve(repoRoot, directoryPath);

    for (const entry of readdirSync(absoluteDirectoryPath, {
      withFileTypes: true,
    })) {
      const relativePath =
        directoryPath === '.' ? entry.name : `${directoryPath}/${entry.name}`;

      if (isExcludedScanPath(relativePath, excludedScanPaths)) {
        continue;
      }

      if (entry.isDirectory()) {
        visitDirectory(relativePath);
        continue;
      }

      filePaths.push(relativePath);
    }
  }

  visitDirectory('.');

  return filePaths.sort();
}

function collectRepositoryFiles(repoRoot, excludedScanPaths) {
  const gitFiles = collectFilesFromGit(repoRoot);
  if (gitFiles) {
    return {
      filePaths: gitFiles,
      source: 'git',
    };
  }

  return {
    filePaths: collectFilesFromFilesystem(repoRoot, excludedScanPaths),
    source: 'filesystem',
  };
}

function getVisibleAgentsPaths(allPaths, excludedScanPaths) {
  return allPaths
    .filter((filePath) => path.posix.basename(filePath) === 'AGENTS.md')
    .filter((filePath) => {
      const directoryPath = getAgentsDirectory(filePath);
      return (
        !isExcludedAgentsDirectory(directoryPath) &&
        !isExcludedScanPath(filePath, excludedScanPaths)
      );
    })
    .sort();
}

function getAgentsDirectory(agentsPath) {
  const directoryPath = path.posix.dirname(agentsPath);
  return directoryPath === '' ? '.' : directoryPath;
}

function getAgentsPath(directoryPath) {
  return directoryPath === '.' ? 'AGENTS.md' : `${directoryPath}/AGENTS.md`;
}

function getScopeDirectory(scope) {
  if (scope.scopeType === 'file') {
    return getAgentsDirectory(scope.scopePath);
  }

  return scope.scopePath;
}

function getAncestorDirectories(directoryPath) {
  const directories = ['.'];
  if (directoryPath === '.') {
    return directories;
  }

  const segments = directoryPath.split('/');
  for (let index = 0; index < segments.length; index += 1) {
    directories.push(segments.slice(0, index + 1).join('/'));
  }

  return directories;
}

function isSameOrDescendant(directoryPath, scopeDirectory) {
  return (
    directoryPath === scopeDirectory ||
    scopeDirectory === '.' ||
    directoryPath.startsWith(`${scopeDirectory}/`)
  );
}

function getAgentsPathsForScope(allAgentsPaths, scope) {
  if (scope.scopeType === 'file') {
    return [scope.scopePath];
  }

  const scopeDirectory = getScopeDirectory(scope);
  const ancestorPaths = new Set(
    getAncestorDirectories(scopeDirectory).map(getAgentsPath),
  );

  return allAgentsPaths
    .filter((agentsPath) => {
      if (ancestorPaths.has(agentsPath)) {
        return true;
      }

      return isSameOrDescendant(getAgentsDirectory(agentsPath), scopeDirectory);
    })
    .sort();
}

function getSectionRange(content, heading) {
  const marker = `## ${heading}\n`;
  const sectionStart = content.indexOf(marker);
  if (sectionStart === -1) {
    return null;
  }

  const bodyStart = sectionStart + marker.length;
  const nextSectionStart = content.indexOf('\n## ', bodyStart);

  return {
    bodyStart,
    end: nextSectionStart === -1 ? content.length : nextSectionStart + 1,
    start: sectionStart,
  };
}

function extractSection(content, heading) {
  const sectionRange = getSectionRange(content, heading);
  if (!sectionRange) {
    return null;
  }

  return content.slice(sectionRange.bodyStart, sectionRange.end);
}

function extractRulesSection(content) {
  return (
    extractSection(content, RULES_SECTION_HEADING) ??
    extractSection(content, LEGACY_RULES_SECTION_HEADING)
  );
}

function normalizeRulesBody(rulesSection) {
  return rulesSection?.trim() ?? '';
}

function getRenderedAgentsContent(directoryPath, rulesBody) {
  return `# ${directoryPath}\n\n## ${RULES_SECTION_HEADING}\n\n${rulesBody.trim()}\n`;
}

function getExpectedAgentsContent(agentsPath, content) {
  const directoryPath = getAgentsDirectory(agentsPath);
  const rulesBody = normalizeRulesBody(extractRulesSection(content));

  if (!rulesBody || rulesBody === '- None.') {
    return null;
  }

  return getRenderedAgentsContent(directoryPath, rulesBody);
}

function getSyncPlan(repoRoot, agentsPath) {
  const absoluteAgentsPath = path.join(repoRoot, agentsPath);
  const existingContent = readFileSync(absoluteAgentsPath, 'utf8').replaceAll(
    '\r\n',
    '\n',
  );
  const nextContent = getExpectedAgentsContent(agentsPath, existingContent);

  if (nextContent === null) {
    return {
      action: 'delete',
      changed: true,
      path: agentsPath,
    };
  }

  return {
    action: 'update',
    changed: existingContent !== nextContent,
    nextContent,
    path: agentsPath,
  };
}

function applySyncPlan(repoRoot, plan) {
  const absoluteAgentsPath = path.join(repoRoot, plan.path);

  if (plan.action === 'delete') {
    unlinkSync(absoluteAgentsPath);
    return;
  }

  if (plan.changed) {
    writeFileSync(absoluteAgentsPath, plan.nextContent, 'utf8');
  }
}

function extractFirstLine(content) {
  return content.split('\n')[0] ?? '';
}

function getHeadingLines(content) {
  return content
    .split('\n')
    .map((line, index) => ({ index, line }))
    .filter(({ line }) => line.startsWith('## '));
}

function validateRulesBody(rulesBody) {
  const issues = [];
  const normalizedBody = rulesBody.trim();

  if (!normalizedBody) {
    return ['"## Rules" must contain one or more rule bullets'];
  }

  if (normalizedBody === '- None.') {
    return ['"## Rules" must contain real rule bullets, not "- None."'];
  }

  const lines = normalizedBody.split('\n');
  const bulletLines = lines.filter((line) => line.startsWith('- '));

  if (bulletLines.length === 0) {
    issues.push('"## Rules" must be a bullet list');
  }

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    if (line.startsWith('- ')) {
      if (!line.slice(2).trim()) {
        issues.push('"## Rules" contains an empty rule bullet');
      }
      continue;
    }

    if (!line.startsWith('  ')) {
      issues.push(`malformed rule line: ${line}`);
    }
  }

  return issues;
}

function validateAgentsFile(repoRoot, agentsPath) {
  const issues = [];
  const absoluteAgentsPath = path.join(repoRoot, agentsPath);
  const content = readFileSync(absoluteAgentsPath, 'utf8').replaceAll(
    '\r\n',
    '\n',
  );
  const directoryPath = getAgentsDirectory(agentsPath);
  const firstLine = extractFirstLine(content);
  const expectedTitle = `# ${directoryPath}`;
  const canonicalRulesRange = getSectionRange(content, RULES_SECTION_HEADING);
  const legacyRulesRange = getSectionRange(
    content,
    LEGACY_RULES_SECTION_HEADING,
  );

  if (firstLine !== expectedTitle) {
    issues.push(`title should be "${expectedTitle}"`);
  }

  if (!canonicalRulesRange) {
    issues.push(`missing "## ${RULES_SECTION_HEADING}" section`);
  }

  if (legacyRulesRange) {
    issues.push(
      `use "## ${RULES_SECTION_HEADING}", not "## ${LEGACY_RULES_SECTION_HEADING}"`,
    );
  }

  for (const { line } of getHeadingLines(content)) {
    const heading = line.slice(3).trim();
    if (
      heading !== RULES_SECTION_HEADING &&
      heading !== LEGACY_RULES_SECTION_HEADING
    ) {
      issues.push(`unsupported section in v3 AGENTS.md: "${line}"`);
    }
  }

  for (const heading of REMOVED_SECTION_HEADINGS) {
    if (getSectionRange(content, heading)) {
      issues.push(`remove obsolete "## ${heading}" section`);
    }
  }

  if (canonicalRulesRange) {
    const beforeRules = content.slice(
      firstLine.length,
      canonicalRulesRange.start,
    );
    if (beforeRules.trim()) {
      issues.push('overview text is not allowed before "## Rules"');
    }

    const rulesBody = content.slice(
      canonicalRulesRange.bodyStart,
      canonicalRulesRange.end,
    );
    issues.push(...validateRulesBody(rulesBody));
  } else if (legacyRulesRange) {
    const rulesBody = content.slice(
      legacyRulesRange.bodyStart,
      legacyRulesRange.end,
    );
    issues.push(...validateRulesBody(rulesBody));
  }

  const expectedContent = getExpectedAgentsContent(agentsPath, content);
  if (expectedContent !== null && content !== expectedContent) {
    issues.push('file is not normalized to the v3 Rules-only format');
  }

  if (isExcludedAgentsDirectory(directoryPath)) {
    issues.push(
      'repo-local skill packages must not contain nested AGENTS.md files',
    );
  }

  return {
    issues: [...new Set(issues)],
  };
}

export async function runValidateAgentsCommand(rawArgs = [], runtime = {}) {
  const cwd = runtime.cwd ?? process.cwd();
  const env = runtime.env ?? process.env;
  const stdout = runtime.stdout ?? process.stdout;
  const stderr = runtime.stderr ?? process.stderr;

  try {
    const repoRoot = getRepoRoot(env, cwd);
    const excludedScanPaths = DEFAULT_EXCLUDED_SCAN_PATHS;
    const { debug, mode, scope } = parseValidateArguments(rawArgs, repoRoot);
    const logger = createLogger('validate-agents', {
      debugEnabled: debug,
      stderr,
      stdout,
    });

    logger.debug('repo_root_resolved', { repoRoot });
    logger.debug('scan_exclusions_resolved', { excludedScanPaths });
    logger.debug('command_options_resolved', {
      mode,
      scopePath: scope.scopePath,
      scopeType: scope.scopeType,
    });

    const scopeDirectory = getScopeDirectory(scope);
    if (isExcludedAgentsDirectory(scopeDirectory)) {
      throw new CommandError(
        'Do not run the AGENTS tool inside .codex skill packages. Use SKILL.md and references/ instead.',
      );
    }

    const { filePaths: allRepositoryPaths, source } = collectRepositoryFiles(
      repoRoot,
      excludedScanPaths,
    );
    logger.debug('repository_paths_collected', {
      pathCount: allRepositoryPaths.length,
      source,
    });

    const allAgentsPaths = getVisibleAgentsPaths(
      allRepositoryPaths,
      excludedScanPaths,
    );
    const agentsPathsToProcess = getAgentsPathsForScope(allAgentsPaths, scope);
    logger.debug('scope_resolved', {
      agentsFileCount: agentsPathsToProcess.length,
      totalAgentsFileCount: allAgentsPaths.length,
    });

    const changedPaths = [];
    const deletedPaths = [];
    const updatedPaths = [];

    for (const agentsPath of agentsPathsToProcess) {
      if (!existsSync(path.join(repoRoot, agentsPath))) {
        continue;
      }

      const plan = getSyncPlan(repoRoot, agentsPath);
      if (!plan.changed) {
        logger.success(
          `${logger.style(agentsPath, 'path')} is already in sync.`,
        );
        continue;
      }

      changedPaths.push(agentsPath);
      if (plan.action === 'delete') {
        deletedPaths.push(agentsPath);
        logger.warn(
          `${mode === 'check' ? 'Would delete' : 'Deleted'} ${logger.style(agentsPath, 'path')}.`,
        );
      } else {
        updatedPaths.push(agentsPath);
        logger.warn(
          `${mode === 'check' ? 'Would update' : 'Updated'} ${logger.style(agentsPath, 'path')}.`,
        );
      }

      if (mode === 'sync') {
        applySyncPlan(repoRoot, plan);
      }
    }

    const agentsPathsToValidate =
      mode === 'sync'
        ? agentsPathsToProcess.filter((agentsPath) =>
            existsSync(path.join(repoRoot, agentsPath)),
          )
        : agentsPathsToProcess;
    logger.debug('validation_targets_resolved', {
      agentsFileCount: agentsPathsToValidate.length,
    });

    const issuesByPath = [];

    for (const agentsPath of agentsPathsToValidate) {
      if (!existsSync(path.join(repoRoot, agentsPath))) {
        continue;
      }

      const result = validateAgentsFile(repoRoot, agentsPath);
      logger.debug('validation_result_recorded', {
        agentsPath,
        issueCount: result.issues.length,
      });

      if (result.issues.length > 0) {
        issuesByPath.push({
          issues: result.issues,
          path: agentsPath,
        });
        logger.error(
          `${logger.style(agentsPath, 'path')} has ${logger.style(String(result.issues.length), 'error')} issue(s).`,
        );
        continue;
      }

      logger.success(`${logger.style(agentsPath, 'path')} passed validation.`);
    }

    if (agentsPathsToProcess.length === 0) {
      logger.info('No AGENTS.md files found for this scope.');
    }

    if (mode === 'sync') {
      if (changedPaths.length === 0) {
        logger.success('AGENTS.md files were already in sync.');
      } else {
        logger.success(
          `Synced AGENTS.md files. Deleted ${deletedPaths.length}, updated ${updatedPaths.length}.`,
        );
        for (const changedPath of changedPaths) {
          stdout.write(`- ${logger.style(changedPath, 'path')}\n`);
        }
      }
    } else if (changedPaths.length > 0) {
      logger.error('AGENTS.md files are out of date:');
      for (const changedPath of changedPaths) {
        stderr.write(`- ${logger.style(changedPath, 'path')}\n`);
      }
      logger.error(
        'Run the bundled AGENTS tool with --sync to refresh the hierarchy.',
      );
    } else {
      logger.success('AGENTS.md files are in sync.');
    }

    if (issuesByPath.length > 0) {
      logger.error('AGENTS.md validation failed:');
      for (const entry of issuesByPath) {
        stderr.write(`- ${logger.style(entry.path, 'path')}\n`);
        for (const issue of entry.issues) {
          stderr.write(`  - ${issue}\n`);
        }
      }
    }

    if (
      issuesByPath.length > 0 ||
      (mode === 'check' && changedPaths.length > 0)
    ) {
      return 1;
    }

    logger.success('AGENTS.md validation passed.');
    return 0;
  } catch (error) {
    const logger = createLogger('validate-agents', {
      debugEnabled: rawArgs.includes('--debug'),
      stderr,
      stdout,
    });

    if (isCommandError(error)) {
      logger.error(error.message);
      return error.exitCode;
    }

    throw error;
  }
}
