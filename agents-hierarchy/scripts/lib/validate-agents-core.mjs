import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createLogger } from './cli-logger.mjs';
import { CommandError, isCommandError } from './errors.mjs';

const GENERATED_FILE_NAMES = new Set(['package-lock.json', 'pnpm-lock.yaml']);
const DEFAULT_EXCLUDED_SCAN_DIRECTORIES = ['.git', 'node_modules'];

function extractMarkdownSection(content, heading) {
  const sectionStart = content.indexOf(`## ${heading}\n`);
  if (sectionStart === -1) {
    return null;
  }

  const nextSectionStart = content.indexOf('\n## ', sectionStart + 1);
  return content.slice(
    sectionStart,
    nextSectionStart === -1 ? content.length : nextSectionStart,
  );
}

function getRepoRoot(env, cwd) {
  if (env.REPO_ROOT) {
    return path.resolve(env.REPO_ROOT);
  }

  return cwd;
}

function getExcludedScanDirectories(repoRoot) {
  const excludedDirectories = new Set(DEFAULT_EXCLUDED_SCAN_DIRECTORIES);
  const rootAgentsPath = path.join(repoRoot, 'AGENTS.md');

  if (!existsSync(rootAgentsPath)) {
    return [...excludedDirectories];
  }

  const agentsHierarchySection = extractMarkdownSection(
    readFileSync(rootAgentsPath, 'utf8'),
    'AGENTS Hierarchy',
  );

  if (!agentsHierarchySection) {
    return [...excludedDirectories];
  }

  for (const line of agentsHierarchySection.split('\n')) {
    if (!line.includes('Exclude')) {
      continue;
    }

    const matches = line.matchAll(/`([^`]+)`/g);
    for (const match of matches) {
      excludedDirectories.add(match[1]);
    }
  }

  return [...excludedDirectories];
}

function isExcludedAgentsDirectory(directoryPath) {
  return (
    directoryPath === '.codex/skills' ||
    directoryPath.startsWith('.codex/skills/')
  );
}

function isExcludedScanPath(relativePath, excludedScanDirectories) {
  return excludedScanDirectories.some(
    (excludedPath) =>
      relativePath === excludedPath ||
      relativePath.startsWith(`${excludedPath}/`),
  );
}

function isGeneratedFile(fileName) {
  return (
    fileName.includes('.gen.') ||
    GENERATED_FILE_NAMES.has(fileName) ||
    fileName.endsWith('.tgz')
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
  let strictPlaceholders = false;
  let debug = false;
  let mode = null;

  for (const argument of argv) {
    if (argument === '--check') {
      if (mode && mode !== 'check') {
        throw new CommandError('Choose either --check or --fix, not both.');
      }

      mode = 'check';
      continue;
    }

    if (argument === '--fix') {
      if (mode && mode !== 'fix') {
        throw new CommandError('Choose either --check or --fix, not both.');
      }

      mode = 'fix';
      continue;
    }

    if (argument === '--strict-placeholders') {
      strictPlaceholders = true;
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
        'Usage: node .codex/skills/agents-hierarchy/scripts/validate-agents.mjs [--check|--fix] [repo-relative-path-or-agents-file] [--strict-placeholders] [--debug]',
      );
    }

    scope = normalizeInputPath(argument, repoRoot);
  }

  return {
    debug,
    mode: mode ?? 'check',
    scope,
    strictPlaceholders,
  };
}

function collectFilesFromGit(repoRoot) {
  try {
    const output = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    return output
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((filePath) => filePath.replaceAll('\\', '/'));
  } catch {
    return null;
  }
}

function collectFilesFromFilesystem(repoRoot, excludedScanDirectories) {
  const filePaths = [];

  function visitDirectory(directoryPath) {
    const absoluteDirectoryPath =
      directoryPath === '.' ? repoRoot : path.resolve(repoRoot, directoryPath);

    for (const entry of readdirSync(absoluteDirectoryPath, {
      withFileTypes: true,
    })) {
      const relativePath =
        directoryPath === '.' ? entry.name : `${directoryPath}/${entry.name}`;

      if (entry.isDirectory()) {
        if (isExcludedScanPath(relativePath, excludedScanDirectories)) {
          continue;
        }

        visitDirectory(relativePath);
        continue;
      }

      filePaths.push(relativePath);
    }
  }

  visitDirectory('.');

  return filePaths.sort();
}

function collectRepositoryFiles(repoRoot, excludedScanDirectories) {
  const gitFiles = collectFilesFromGit(repoRoot);
  if (gitFiles) {
    return {
      filePaths: gitFiles,
      source: 'git',
    };
  }

  return {
    filePaths: collectFilesFromFilesystem(repoRoot, excludedScanDirectories),
    source: 'filesystem',
  };
}

function getVisibleAgentsDirectories(allPaths) {
  const directories = new Set();

  for (const filePath of allPaths) {
    if (path.posix.basename(filePath) !== 'AGENTS.md') {
      continue;
    }

    const directoryPath = path.posix.dirname(filePath);
    const normalizedDirectory = directoryPath === '' ? '.' : directoryPath;

    if (isExcludedAgentsDirectory(normalizedDirectory)) {
      continue;
    }

    directories.add(normalizedDirectory);
  }

  return [...directories].sort();
}

function getInventoryFiles(allPaths, excludedScanDirectories) {
  return allPaths
    .filter((filePath) => path.posix.basename(filePath) !== 'AGENTS.md')
    .filter(
      (filePath) => !isExcludedScanPath(filePath, excludedScanDirectories),
    )
    .sort();
}

function getScopeDirectory(scope) {
  if (scope.scopeType === 'file') {
    const directoryPath = path.posix.dirname(scope.scopePath);
    return directoryPath === '' ? '.' : directoryPath;
  }

  return scope.scopePath;
}

function getExplicitDirectories(scope) {
  const directories = new Set(['.']);
  let currentDirectory = getScopeDirectory(scope);

  while (true) {
    if (!isExcludedAgentsDirectory(currentDirectory)) {
      directories.add(currentDirectory);
    }

    if (currentDirectory === '.') {
      break;
    }

    const parentDirectory = path.posix.dirname(currentDirectory);
    currentDirectory = parentDirectory === '' ? '.' : parentDirectory;
  }

  return [...directories].sort();
}

function getRequiredDirectories(files, explicitDirectories) {
  const directories = new Set(['.', ...explicitDirectories]);

  for (const filePath of files) {
    let currentDirectory = path.posix.dirname(filePath);
    directories.add(currentDirectory);

    while (currentDirectory !== '.') {
      currentDirectory = path.posix.dirname(currentDirectory);
      directories.add(currentDirectory);
    }
  }

  return [...directories]
    .map((directoryPath) => (directoryPath === '' ? '.' : directoryPath))
    .filter((directoryPath) => !isExcludedAgentsDirectory(directoryPath))
    .sort();
}

function getDirectoriesToSync(
  requiredDirectories,
  existingAgentsDirectories,
  scope,
  explicitDirectories,
) {
  const scopeDirectory = getScopeDirectory(scope);
  const directories = new Set([
    ...requiredDirectories,
    ...existingAgentsDirectories,
    ...explicitDirectories,
  ]);

  if (scope.scopeType === 'file') {
    return [...directories]
      .filter((directoryPath) => directoryPath === scopeDirectory)
      .sort();
  }

  if (scopeDirectory === '.') {
    return [...directories].sort();
  }

  return [...directories]
    .filter(
      (directoryPath) =>
        directoryPath === '.' ||
        directoryPath === scopeDirectory ||
        directoryPath.startsWith(`${scopeDirectory}/`) ||
        scopeDirectory.startsWith(`${directoryPath}/`),
    )
    .sort();
}

function getImmediateChildren(
  directoryPath,
  inventoryFiles,
  excludedScanDirectories,
  explicitDirectories,
) {
  const directoryPrefix = directoryPath === '.' ? '' : `${directoryPath}/`;
  const childDirectories = new Set();
  const childFiles = new Set();

  for (const filePath of inventoryFiles) {
    if (directoryPrefix && !filePath.startsWith(directoryPrefix)) {
      continue;
    }

    const relativePath = directoryPrefix
      ? filePath.slice(directoryPrefix.length)
      : filePath;

    if (!relativePath) {
      continue;
    }

    const segments = relativePath.split('/');
    if (segments.length === 1) {
      childFiles.add(segments[0]);
      continue;
    }

    const childDirectory = segments[0];
    const childDirectoryPath =
      directoryPath === '.'
        ? childDirectory
        : `${directoryPath}/${childDirectory}`;

    if (isExcludedScanPath(childDirectoryPath, excludedScanDirectories)) {
      continue;
    }

    childDirectories.add(childDirectory);
  }

  for (const explicitDirectory of explicitDirectories) {
    if (explicitDirectory === '.' || explicitDirectory === directoryPath) {
      continue;
    }

    const parentDirectory = path.posix.dirname(explicitDirectory);
    const normalizedParent = parentDirectory === '' ? '.' : parentDirectory;
    if (normalizedParent !== directoryPath) {
      continue;
    }

    const childName = path.posix.basename(explicitDirectory);
    if (
      childName &&
      !isExcludedScanPath(explicitDirectory, excludedScanDirectories)
    ) {
      childDirectories.add(childName);
    }
  }

  return {
    directories: [...childDirectories].sort(),
    files: [...childFiles].sort(),
  };
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

function extractSectionBody(content, heading) {
  const sectionContent = extractSection(content, heading);
  return sectionContent === null ? null : sectionContent.trim();
}

function extractTitle(content) {
  const titleMatch = content.match(/^# (.+)$/m);
  return titleMatch?.[1] ?? null;
}

function extractOverview(content, directoriesRange) {
  const titleMatch = content.match(/^# .+\n?/);
  if (!titleMatch || !directoriesRange) {
    return '';
  }

  return content.slice(titleMatch[0].length, directoriesRange.start).trim();
}

function getTopLevelBulletLines(sectionBody) {
  if (!sectionBody) {
    return [];
  }

  return sectionBody.split('\n').filter((line) => line.startsWith('- '));
}

function validateEntrySection(sectionName, sectionBody, kind) {
  const issues = [];

  if (sectionBody === null) {
    return issues;
  }

  if (!sectionBody) {
    issues.push(
      `"${sectionName}" should contain "- None." or one or more formatted entries`,
    );
    return issues;
  }

  const topLevelBulletLines = getTopLevelBulletLines(sectionBody);

  if (topLevelBulletLines.length === 0) {
    issues.push(
      `"${sectionName}" should contain "- None." or one or more formatted entries`,
    );
    return issues;
  }

  const noneLines = topLevelBulletLines.filter((line) => line === '- None.');
  if (noneLines.length > 0 && topLevelBulletLines.length > 1) {
    issues.push(
      `"${sectionName}" must use either "- None." or listed entries, not both`,
    );
  }

  if (
    topLevelBulletLines.length === 1 &&
    topLevelBulletLines[0] === '- None.'
  ) {
    return issues;
  }

  for (const line of topLevelBulletLines) {
    if (line === '- None.') {
      continue;
    }

    const entryMatch = line.match(/^- `([^`]+)`:(.+)$/);
    if (!entryMatch) {
      issues.push(`malformed entry in "${sectionName}": ${line}`);
      continue;
    }

    const [, name, description] = entryMatch;
    if (!description.trim()) {
      issues.push(
        `entry in "${sectionName}" is missing a description: ${line}`,
      );
    }

    if (kind === 'directory' && !name.endsWith('/')) {
      issues.push(
        `directory entries in "${sectionName}" must end with "/": ${line}`,
      );
    }

    if ((kind === 'file' || kind === 'generated-file') && name.endsWith('/')) {
      issues.push(
        `file entries in "${sectionName}" must not end with "/": ${line}`,
      );
    }

    if (
      (kind === 'file' || kind === 'generated-file') &&
      name === 'AGENTS.md'
    ) {
      issues.push(`"${sectionName}" must not list "AGENTS.md" as a child file`);
    }
  }

  return issues;
}

function collectEntryNames(sectionBody) {
  if (sectionBody === null || !sectionBody) {
    return [];
  }

  const topLevelBulletLines = getTopLevelBulletLines(sectionBody);
  if (
    topLevelBulletLines.length === 1 &&
    topLevelBulletLines[0] === '- None.'
  ) {
    return [];
  }

  const entryNames = [];

  for (const line of topLevelBulletLines) {
    if (line === '- None.') {
      continue;
    }

    const entryMatch = line.match(/^- `([^`]+)`:(.+)$/);
    if (!entryMatch) {
      continue;
    }

    entryNames.push(entryMatch[1]);
  }

  return entryNames;
}

function collectDuplicateEntryNames(entryNames) {
  const counts = new Map();

  for (const entryName of entryNames) {
    counts.set(entryName, (counts.get(entryName) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([entryName]) => entryName)
    .sort();
}

function validateDocumentedInventory({
  actualDirectories,
  actualFiles,
  compareDirectories,
  compareFiles,
  documentedDirectories,
  documentedFiles,
}) {
  const issues = [];

  if (compareDirectories) {
    const documentedDirectorySet = new Set(documentedDirectories);
    const actualDirectorySet = new Set(actualDirectories);

    for (const duplicateName of collectDuplicateEntryNames(
      documentedDirectories,
    )) {
      issues.push(
        `directory entry is listed more than once: \`${duplicateName}\``,
      );
    }

    for (const directoryName of documentedDirectories) {
      if (!actualDirectorySet.has(directoryName)) {
        issues.push(
          `listed directory is not an immediate child: \`${directoryName}\``,
        );
      }
    }

    for (const directoryName of actualDirectories) {
      if (!documentedDirectorySet.has(directoryName)) {
        issues.push(
          `missing directory entry for immediate child: \`${directoryName}\``,
        );
      }
    }
  }

  if (compareFiles) {
    const documentedFileSet = new Set(documentedFiles);
    const actualFileSet = new Set(actualFiles);

    for (const duplicateName of collectDuplicateEntryNames(documentedFiles)) {
      issues.push(`file entry is listed more than once: \`${duplicateName}\``);
    }

    for (const fileName of documentedFiles) {
      if (!actualFileSet.has(fileName)) {
        issues.push(`listed file is not an immediate child: \`${fileName}\``);
      }
    }

    for (const fileName of actualFiles) {
      if (!documentedFileSet.has(fileName)) {
        issues.push(
          `missing file entry for immediate child: \`${fileName}\` (list it in "Files" or "Generated Files")`,
        );
      }
    }
  }

  return issues;
}

function collectPlaceholderLines(content) {
  return content.split('\n').filter((line) => line.includes('TODO describe'));
}

function normalizeSectionBody(sectionContent) {
  return sectionContent?.trim() ?? '';
}

function parseEntryBlocks(sectionContent) {
  if (!sectionContent) {
    return new Map();
  }

  const trimmedContent = sectionContent.trim();
  if (!trimmedContent || trimmedContent === '- None.') {
    return new Map();
  }

  const blocks = new Map();
  let currentName = null;
  let currentLines = [];

  for (const line of trimmedContent.split('\n')) {
    const entryMatch = line.match(/^- `([^`]+)`:/);

    if (entryMatch) {
      if (currentName) {
        blocks.set(currentName, currentLines.join('\n').trimEnd());
      }

      currentName = entryMatch[1];
      currentLines = [line];
      continue;
    }

    if (currentName) {
      currentLines.push(line);
    }
  }

  if (currentName) {
    blocks.set(currentName, currentLines.join('\n').trimEnd());
  }

  return blocks;
}

function buildPlaceholderEntry(name, kind) {
  if (kind === 'directory') {
    return `- \`${name}\`: TODO describe this subdirectory.`;
  }

  if (kind === 'generated-file') {
    return `- \`${name}\`: TODO describe this generated file.\n  Rules:\n  - Prefer regenerating it instead of hand-editing when possible.`;
  }

  return `- \`${name}\`: TODO describe this file.`;
}

function rewriteEntryBlock(name, block, kind) {
  if (!block) {
    return buildPlaceholderEntry(name, kind);
  }

  const lines = block.split('\n');
  const firstLineMatch = lines[0].match(/^- `[^`]+`:(.*)$/);
  const description = firstLineMatch?.[1] ?? ' TODO describe this file.';
  const rewrittenLines = [`- \`${name}\`:${description}`];
  const remainingLines = lines.slice(1);
  const hasRules = remainingLines.some((line) => line.trim() === 'Rules:');

  rewrittenLines.push(...remainingLines);

  if (kind === 'generated-file' && !hasRules) {
    rewrittenLines.push('  Rules:');
    rewrittenLines.push(
      '  - Prefer regenerating it instead of hand-editing when possible.',
    );
  }

  return rewrittenLines.join('\n').trimEnd();
}

function renderEntrySection(expectedNames, maps, kind) {
  if (expectedNames.length === 0) {
    return '- None.';
  }

  const blocks = [];

  for (const name of expectedNames) {
    const existingBlock = maps.primary.get(name) ?? maps.secondary.get(name);
    blocks.push(rewriteEntryBlock(name, existingBlock, kind));
  }

  return blocks.join('\n');
}

function renderAgentsContent(directoryPath, inventory, existingContent) {
  const writingRulesRange = getSectionRange(existingContent, 'Writing Rules');
  const overview = extractOverview(
    existingContent,
    getSectionRange(existingContent, 'Directories'),
  );
  const directoriesSection = normalizeSectionBody(
    extractSection(existingContent, 'Directories'),
  );
  const filesSection = normalizeSectionBody(
    extractSection(existingContent, 'Files'),
  );
  const generatedSection = normalizeSectionBody(
    extractSection(existingContent, 'Generated Files'),
  );
  const writingRules = normalizeSectionBody(
    extractSection(existingContent, 'Writing Rules'),
  );

  const directoryBlocks = parseEntryBlocks(directoriesSection);
  const fileBlocks = parseEntryBlocks(filesSection);
  const generatedBlocks = parseEntryBlocks(generatedSection);
  const generatedFiles = inventory.files.filter(isGeneratedFile);
  const regularFiles = inventory.files.filter(
    (fileName) => !generatedFiles.includes(fileName),
  );

  const renderedDirectories = renderEntrySection(
    inventory.directories.map((directoryName) => `${directoryName}/`),
    { primary: directoryBlocks, secondary: new Map() },
    'directory',
  );
  const renderedFiles = renderEntrySection(
    regularFiles,
    { primary: fileBlocks, secondary: generatedBlocks },
    'file',
  );
  const renderedGeneratedFiles =
    generatedFiles.length > 0
      ? renderEntrySection(
          generatedFiles,
          { primary: generatedBlocks, secondary: fileBlocks },
          'generated-file',
        )
      : '';
  const renderedWritingRules =
    writingRules ||
    '- [TODO: Add the main writing rule for this directory.]\n- [TODO: Note when this AGENTS.md must be updated.]';
  const renderedOverview =
    overview ||
    '[TODO: Add a brief overview of what this directory contains and how it fits into the repo.]';
  const trailingSections =
    writingRulesRange && writingRulesRange.end < existingContent.length
      ? existingContent.slice(writingRulesRange.end).trim()
      : '';

  const coreContent = [
    `# ${directoryPath}`,
    renderedOverview,
    '## Directories',
    renderedDirectories,
    '## Files',
    renderedFiles,
    generatedFiles.length > 0 ? '## Generated Files' : null,
    generatedFiles.length > 0 ? renderedGeneratedFiles : null,
    '## Writing Rules',
    renderedWritingRules,
  ]
    .filter(Boolean)
    .join('\n\n');

  return `${coreContent}${trailingSections ? `\n\n${trailingSections}` : ''}\n`;
}

function syncAgentsFile(repoRoot, directoryPath, inventory, mode) {
  const agentsPath =
    directoryPath === '.'
      ? path.join(repoRoot, 'AGENTS.md')
      : path.join(repoRoot, directoryPath, 'AGENTS.md');
  const existingContent = existsSync(agentsPath)
    ? readFileSync(agentsPath, 'utf8')
    : '';
  const nextContent = renderAgentsContent(
    directoryPath,
    inventory,
    existingContent,
  );
  const hadExistingFile = existsSync(agentsPath);

  if (existingContent === nextContent) {
    return {
      changed: false,
      created: false,
      path: agentsPath,
    };
  }

  if (mode === 'fix') {
    mkdirSync(path.dirname(agentsPath), { recursive: true });
    writeFileSync(agentsPath, nextContent, 'utf8');
  }

  return {
    changed: true,
    created: !hadExistingFile,
    path: agentsPath,
  };
}

function validateAgentsFile(repoRoot, agentsPath, inventoryFiles, options) {
  const issues = [];
  const warnings = [];
  const absoluteAgentsPath = path.join(repoRoot, agentsPath);
  const content = readFileSync(absoluteAgentsPath, 'utf8');
  const directoryPath = path.posix.dirname(agentsPath) || '.';

  const title = extractTitle(content);
  const directoriesRange = getSectionRange(content, 'Directories');
  const filesRange = getSectionRange(content, 'Files');
  const generatedRange = getSectionRange(content, 'Generated Files');
  const writingRulesRange = getSectionRange(content, 'Writing Rules');
  const directoriesBody = extractSectionBody(content, 'Directories');
  const filesBody = extractSectionBody(content, 'Files');
  const generatedBody = extractSectionBody(content, 'Generated Files');

  if (title !== directoryPath) {
    issues.push(`title should be "# ${directoryPath}"`);
  }

  if (!directoriesRange) {
    issues.push('missing "## Directories" section');
  }

  if (!filesRange) {
    issues.push('missing "## Files" section');
  }

  if (!writingRulesRange) {
    issues.push('missing "## Writing Rules" section');
  }

  if (
    directoriesRange &&
    filesRange &&
    directoriesRange.start > filesRange.start
  ) {
    issues.push('"## Directories" must appear before "## Files"');
  }

  if (filesRange && generatedRange && filesRange.start > generatedRange.start) {
    issues.push('"## Generated Files" must appear after "## Files"');
  }

  if (
    generatedRange &&
    writingRulesRange &&
    generatedRange.start > writingRulesRange.start
  ) {
    issues.push('"## Generated Files" must appear before "## Writing Rules"');
  }

  if (
    !generatedRange &&
    filesRange &&
    writingRulesRange &&
    filesRange.start > writingRulesRange.start
  ) {
    issues.push('"## Writing Rules" must appear after "## Files"');
  }

  const overview = extractOverview(content, directoriesRange);
  if (!overview) {
    issues.push('missing overview paragraph before the first section');
  }

  issues.push(
    ...validateEntrySection('Directories', directoriesBody, 'directory'),
  );
  issues.push(...validateEntrySection('Files', filesBody, 'file'));
  issues.push(
    ...validateEntrySection('Generated Files', generatedBody, 'generated-file'),
  );

  if (directoriesBody !== null || filesBody !== null) {
    const immediateInventory = getImmediateChildren(
      directoryPath,
      inventoryFiles,
      options.excludedScanDirectories,
      options.explicitDirectories,
    );

    issues.push(
      ...validateDocumentedInventory({
        actualDirectories: immediateInventory.directories.map(
          (childName) => `${childName}/`,
        ),
        actualFiles: immediateInventory.files,
        compareDirectories: directoriesBody !== null,
        compareFiles: filesBody !== null,
        documentedDirectories:
          directoriesBody === null ? [] : collectEntryNames(directoriesBody),
        documentedFiles:
          filesBody === null
            ? []
            : [
                ...collectEntryNames(filesBody),
                ...collectEntryNames(generatedBody),
              ],
      }),
    );
  }

  const writingRulesBody = extractSectionBody(content, 'Writing Rules');
  const writingRuleMatches = writingRulesBody?.match(/^- /gm) ?? [];
  if (writingRulesBody !== null) {
    if (writingRuleMatches.length < 2 || writingRuleMatches.length > 6) {
      issues.push('"## Writing Rules" should contain 2-6 top-level bullets');
    }
  }

  const placeholderLines = collectPlaceholderLines(content);
  if (options.strictPlaceholders) {
    for (const placeholderLine of placeholderLines) {
      issues.push(`placeholder text remains: ${placeholderLine.trim()}`);
    }
  } else {
    for (const placeholderLine of placeholderLines) {
      warnings.push(`placeholder text remains: ${placeholderLine.trim()}`);
    }
  }

  if (isExcludedAgentsDirectory(directoryPath)) {
    issues.push(
      'repo-local skill packages must not contain nested AGENTS.md files',
    );
  }

  return {
    issues,
    warnings,
  };
}

export async function runValidateAgentsCommand(rawArgs = [], runtime = {}) {
  const cwd = runtime.cwd ?? process.cwd();
  const env = runtime.env ?? process.env;
  const stdout = runtime.stdout ?? process.stdout;
  const stderr = runtime.stderr ?? process.stderr;

  try {
    const repoRoot = getRepoRoot(env, cwd);
    const excludedScanDirectories = getExcludedScanDirectories(repoRoot);
    const { debug, mode, scope, strictPlaceholders } = parseValidateArguments(
      rawArgs,
      repoRoot,
    );
    const logger = createLogger('validate-agents', {
      debugEnabled: debug,
      stderr,
      stdout,
    });

    logger.debug('repo_root_resolved', { repoRoot });
    logger.debug('scan_exclusions_resolved', { excludedScanDirectories });
    logger.debug('command_options_resolved', {
      mode,
      scopePath: scope.scopePath,
      scopeType: scope.scopeType,
      strictPlaceholders,
    });

    const scopeDirectory = getScopeDirectory(scope);
    if (isExcludedAgentsDirectory(scopeDirectory)) {
      throw new CommandError(
        'Do not run the AGENTS tool inside .codex skill packages. Use SKILL.md and references/ instead.',
      );
    }

    const { filePaths: allRepositoryPaths, source } = collectRepositoryFiles(
      repoRoot,
      excludedScanDirectories,
    );
    logger.debug('repository_inventory_collected', {
      pathCount: allRepositoryPaths.length,
      source,
    });

    const inventoryFiles = getInventoryFiles(
      allRepositoryPaths,
      excludedScanDirectories,
    );
    const existingAgentsDirectories =
      getVisibleAgentsDirectories(allRepositoryPaths);
    const explicitDirectories = getExplicitDirectories(scope);
    const requiredDirectories = getRequiredDirectories(
      inventoryFiles,
      explicitDirectories,
    );
    const directoriesToSync = getDirectoriesToSync(
      requiredDirectories,
      existingAgentsDirectories,
      scope,
      explicitDirectories,
    );
    logger.debug('scope_resolved', {
      directoriesToProcess: directoriesToSync,
      existingAgentsDirectoryCount: existingAgentsDirectories.length,
      explicitDirectoryCount: explicitDirectories.length,
      inventoryFileCount: inventoryFiles.length,
      requiredDirectoryCount: requiredDirectories.length,
    });

    const changedPaths = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (const directoryPath of directoriesToSync) {
      const targetAgentsPath =
        directoryPath === '.' ? 'AGENTS.md' : `${directoryPath}/AGENTS.md`;
      const inventory = getImmediateChildren(
        directoryPath,
        inventoryFiles,
        excludedScanDirectories,
        explicitDirectories,
      );
      logger.debug('directory_sync_started', {
        directoryCount: inventory.directories.length,
        fileCount: inventory.files.length,
        targetAgentsPath,
      });
      const result = syncAgentsFile(repoRoot, directoryPath, inventory, mode);

      if (!result.changed) {
        logger.success(
          `${logger.style(targetAgentsPath, 'path')} is already in sync.`,
        );
        continue;
      }

      changedPaths.push(path.relative(repoRoot, result.path) || 'AGENTS.md');

      if (result.created) {
        createdCount += 1;
        logger.warn(
          `${mode === 'check' ? 'Would create' : 'Created'} ${logger.style(targetAgentsPath, 'path')}.`,
        );
      } else {
        updatedCount += 1;
        logger.warn(
          `${mode === 'check' ? 'Would update' : 'Updated'} ${logger.style(targetAgentsPath, 'path')}.`,
        );
      }
    }

    const agentsPathsToValidate = directoriesToSync
      .map((directoryPath) =>
        directoryPath === '.' ? 'AGENTS.md' : `${directoryPath}/AGENTS.md`,
      )
      .filter((agentsPath) => existsSync(path.join(repoRoot, agentsPath)));
    logger.debug('validation_targets_resolved', {
      agentsFileCount: agentsPathsToValidate.length,
    });

    const issuesByPath = [];
    const warningsByPath = [];

    for (const agentsPath of agentsPathsToValidate) {
      const result = validateAgentsFile(repoRoot, agentsPath, inventoryFiles, {
        excludedScanDirectories,
        explicitDirectories,
        strictPlaceholders,
      });
      logger.debug('validation_result_recorded', {
        agentsPath,
        issueCount: result.issues.length,
        warningCount: result.warnings.length,
      });

      if (result.issues.length > 0) {
        issuesByPath.push({
          issues: result.issues,
          path: agentsPath,
        });
      }

      if (result.warnings.length > 0) {
        warningsByPath.push({
          path: agentsPath,
          warnings: result.warnings,
        });
      }

      if (result.issues.length > 0) {
        logger.error(
          `${logger.style(agentsPath, 'path')} has ${logger.style(String(result.issues.length), 'error')} issue(s).`,
        );
        continue;
      }

      logger.success(`${logger.style(agentsPath, 'path')} passed validation.`);
    }

    if (warningsByPath.length > 0) {
      logger.info('AGENTS.md placeholder warnings:');
      for (const entry of warningsByPath) {
        stdout.write(`- ${logger.style(entry.path, 'path')}\n`);
        for (const warning of entry.warnings) {
          stdout.write(`  - ${warning}\n`);
        }
      }
    }

    if (mode === 'fix') {
      if (changedPaths.length === 0) {
        logger.success('AGENTS.md files were already in sync.');
      } else {
        logger.success(
          `Synced AGENTS.md files. Created ${createdCount}, updated ${updatedCount}.`,
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
        'Run the bundled AGENTS tool with --fix to refresh the hierarchy.',
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
