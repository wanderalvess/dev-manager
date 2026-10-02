import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_SOURCE_LINES = 300;

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
const GIT_BUFFER_LIMIT = 32 * 1024 * 1024;
const MIN_RENAME_SIMILARITY = 0.8;
const MIN_RENAME_SIMILARITY_MARGIN = 0.1;

export interface ChangedFileSize {
  path: string;
  currentLines: number;
  baseLines: number | null;
}

function runGit(root: string, args: string[], encoding: BufferEncoding = 'utf8'): string {
  return execFileSync('git', args, {
    cwd: root,
    encoding,
    maxBuffer: GIT_BUFFER_LIMIT,
  }) as string;
}

function resolveBaseCommit(root: string, base: string): string {
  return runGit(root, ['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]).trim();
}

function splitGitPaths(output: string): string[] {
  return output.split('\0').filter(Boolean);
}

function getChangedPaths(root: string, baseCommit: string): string[] {
  const tracked = runGit(root, [
    'diff',
    '--name-only',
    '-z',
    '--diff-filter=ACMRTUXB',
    baseCommit,
    '--',
  ]);
  const untracked = runGit(root, ['ls-files', '--others', '--exclude-standard', '-z']);
  return [...new Set([...splitGitPaths(tracked), ...splitGitPaths(untracked)])]
    .filter((filePath) => SOURCE_EXTENSIONS.has(extname(filePath).toLowerCase()))
    .sort();
}

function getRenameSources(root: string, baseCommit: string): Map<string, string> {
  const changes = runGit(root, [
    'diff',
    '--name-status',
    '--find-renames',
    '-z',
    baseCommit,
    '--',
  ]);
  const entries = splitGitPaths(changes);
  const sources = new Map<string, string>();

  for (let index = 0; index < entries.length;) {
    const status = entries[index++];
    if (status.startsWith('R')) {
      const source = entries[index++];
      const destination = entries[index++];
      if (source && destination) sources.set(destination, source);
    } else {
      index++;
    }
  }

  return sources;
}

function getUnstagedRenameSources(root: string, baseCommit: string,
  knownRenameSources: Map<string, string>): Map<string, string> {
  const deletedPaths = splitGitPaths(runGit(root, [
    'diff',
    '--name-only',
    '--diff-filter=D',
    '-z',
    baseCommit,
    '--',
  ])).filter((filePath) => SOURCE_EXTENSIONS.has(extname(filePath).toLowerCase()));
  const untrackedPaths = splitGitPaths(runGit(root, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  ])).filter((filePath) => SOURCE_EXTENSIONS.has(extname(filePath).toLowerCase()));
  const sources = new Map<string, string>();
  const usedSources = new Set(knownRenameSources.values());
  const usedDestinations = new Set(knownRenameSources.keys());
  const remainingSources = deletedPaths
    .filter((filePath) => !usedSources.has(filePath))
    .sort();
  const remainingDestinations = untrackedPaths
    .filter((filePath) => !usedDestinations.has(filePath))
    .sort();
  const sourceContents = new Map(
    remainingSources.map((filePath) => [
      filePath,
      getBaseFileContent(root, baseCommit, filePath) ?? '',
    ]),
  );
  const destinationContents = new Map(
    remainingDestinations.map((filePath) => [
      filePath,
      readFileSync(resolve(root, filePath), 'utf8'),
    ]),
  );
  const similarities = new Map<string, Map<string, number>>();
  for (const destination of remainingDestinations) {
    const destinationScores = new Map<string, number>();
    for (const source of remainingSources) {
      destinationScores.set(
        source,
        getLineContentSimilarity(sourceContents.get(source) ?? '', destinationContents.get(destination) ?? ''),
      );
    }
    similarities.set(destination, destinationScores);
  }
  const destinationCandidates = new Map<string, string>();
  for (const [destination, scores] of similarities) {
    const best = getClearBestMatch(scores);
    if (best && best.score >= MIN_RENAME_SIMILARITY) {
      destinationCandidates.set(destination, best.path);
    }
  }
  const destinationsBySource = new Map<string, string[]>();
  for (const [destination, source] of destinationCandidates) {
    destinationsBySource.set(source, [...(destinationsBySource.get(source) ?? []), destination]);
  }
  for (const [source, matchingDestinations] of destinationsBySource) {
    const sourceScores = new Map(
      remainingDestinations
        .map((destination) => [destination, similarities.get(destination)?.get(source) ?? 0]),
    );
    const best = getClearBestMatch(sourceScores);
    if (matchingDestinations.length !== 1 || best?.path !== matchingDestinations[0]) continue;
    sources.set(matchingDestinations[0], source);
  }
  return sources;
}

function getClearBestMatch(scores: Map<string, number>): { path: string; score: number } | null {
  const ranked = [...scores]
    .map(([path, score]) => ({ path, score }))
    .sort((left, right) => right.score - left.score);
  const [best, second] = ranked;
  if (!best || (second && best.score - second.score < MIN_RENAME_SIMILARITY_MARGIN)) return null;
  return best;
}

function getLineContentSimilarity(original: string, changed: string): number {
  const getLines = (content: string): string[] => (content.length === 0
    ? []
    : content.split(/\r\n|\n|\r/).slice(0, /[\r\n]$/.test(content) ? -1 : undefined));
  const originalLines = getLines(original);
  const changedLines = getLines(changed);
  const total = Math.max(originalLines.length, changedLines.length);
  if (total === 0) return 0;
  const originalCounts = new Map<string, number>();
  for (const line of originalLines) {
    originalCounts.set(line, (originalCounts.get(line) ?? 0) + 1);
  }
  let matchingLines = 0;
  for (const line of changedLines) {
    const count = originalCounts.get(line) ?? 0;
    if (count === 0) continue;
    matchingLines++;
    originalCounts.set(line, count - 1);
  }
  return matchingLines / total;
}

function getBaseFileContent(root: string, baseCommit: string, filePath: string): string | null {
  const treeEntries = runGit(root, [
    'ls-tree',
    '-r',
    '-z',
    '--full-tree',
    baseCommit,
    '--',
    `:(literal)${filePath}`,
  ]);
  const entry = splitGitPaths(treeEntries)
    .find((item) => item.slice(item.indexOf('\t') + 1) === filePath);
  if (!entry) return null;

  const metadata = entry.slice(0, entry.indexOf('\t')).split(' ');
  if (metadata[1] !== 'blob' || !metadata[2]) {
    throw new Error(`O caminho-base não é um arquivo regular: ${filePath}`);
  }
  return runGit(root, ['cat-file', 'blob', metadata[2]]);
}

export function countSourceLines(source: string): number {
  if (source.length === 0) return 0;
  const lines = source.split(/\r\n|\n|\r/);
  return lines.length - (lines.at(-1) === '' ? 1 : 0);
}

export function auditChangedFiles(root: string, base: string): ChangedFileSize[] {
  const baseCommit = resolveBaseCommit(root, base);
  const renameSources = getRenameSources(root, baseCommit);
  for (const [destination, source] of getUnstagedRenameSources(root, baseCommit, renameSources)) {
    if (!renameSources.has(destination)) renameSources.set(destination, source);
  }
  const results: ChangedFileSize[] = [];

  for (const filePath of getChangedPaths(root, baseCommit)) {
    let currentContent: string;
    try {
      currentContent = readFileSync(resolve(root, filePath), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }

    const basePath = renameSources.get(filePath) ?? filePath;
    const baseContent = getBaseFileContent(root, baseCommit, basePath);
    results.push({
      path: filePath,
      currentLines: countSourceLines(currentContent),
      baseLines: baseContent === null ? null : countSourceLines(baseContent),
    });
  }

  return results;
}

export function formatWarnings(results: ChangedFileSize[]): string {
  const oversized = results.filter((result) => result.currentLines > MAX_SOURCE_LINES);
  if (oversized.length === 0) {
    return `Nenhum arquivo fonte alterado excede ${MAX_SOURCE_LINES} linhas.`;
  }

  const lines = [
    `Avisos: arquivos fonte alterados com mais de ${MAX_SOURCE_LINES} linhas (limite informativo):`,
  ];
  for (const file of oversized) {
    const counts = file.baseLines === null
      ? `base: novo arquivo; atual: ${file.currentLines} linhas`
      : `base: ${file.baseLines} linhas; atual: ${file.currentLines} linhas`;
    const kind = file.baseLines === null ? 'NOVO' : 'EXISTENTE';
    lines.push(`- ${kind} ${file.path} (${counts})`);
  }
  return lines.join('\n');
}

function getBaseArgument(args: string[], env: NodeJS.ProcessEnv): string {
  if (args.length === 0) return env.FILE_SIZE_BASE || 'HEAD';
  if (args[0] !== '--base' || args.length !== 2) {
    throw new Error('Argumento desconhecido para o verificador de tamanho.');
  }
  if (!args[1] || args[1].startsWith('--')) throw new Error('O argumento --base exige uma revisão.');
  return args[1];
}

function runCli(): void {
  try {
    const base = getBaseArgument(process.argv.slice(2), process.env);
    const results = auditChangedFiles(process.cwd(), base);
    process.stdout.write(`${formatWarnings(results)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Erro ao verificar tamanhos de arquivos: ${message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
