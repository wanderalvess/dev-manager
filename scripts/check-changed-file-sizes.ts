import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_SOURCE_LINES = 300;

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
const GIT_BUFFER_LIMIT = 32 * 1024 * 1024;

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
