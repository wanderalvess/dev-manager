import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  auditChangedFiles,
  countSourceLines,
  formatWarnings,
  mergeChangedPaths,
} from './check-changed-file-sizes';

const require = createRequire(import.meta.url);
const tsxCli = require.resolve('tsx/cli');
const checkerPath = fileURLToPath(new URL('./check-changed-file-sizes.ts', import.meta.url));

let tempRoot: string | null = null;
let repo: string;
let base: string;

function git(args: string[], cwd = repo): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function writeSource(relativePath: string, lines: number): void {
  const target = join(repo, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, Array.from({ length: lines }, (_, index) => `line ${index + 1}`).join('\n'));
}

function writeLines(relativePath: string, lines: string[]): void {
  const target = join(repo, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, lines.join('\n'));
}

function commitBase(message: string): void {
  git(['add', '-A']);
  git(['commit', '-m', message]);
  base = git(['rev-parse', 'HEAD']);
}

function runChecker(args: string[], fileSizeBase: string): ReturnType<typeof spawnSync> {
  return spawnSync(process.execPath, [tsxCli, checkerPath, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, FILE_SIZE_BASE: fileSizeBase },
  });
}

beforeEach(() => {
  tempRoot = join(process.cwd(), `.changed-file-sizes-${randomUUID()}`);
  repo = join(tempRoot, 'repository');
  mkdirSync(repo, { recursive: true });
  git(['init'], repo);
  git(['config', 'user.name', 'File Size Test'], repo);
  git(['config', 'user.email', 'file-size-test@example.invalid'], repo);
  git(['config', 'core.autocrlf', 'false'], repo);

  writeSource('src/kept.ts', 299);
  writeSource('src/legacy.ts', 320);
  writeSource('src/rename-source.ts', 320);
  writeSource('src/ambiguous-one.ts', 320);
  writeSource('src/ambiguous-two.ts', 320);
  writeSource('src/unchanged.ts', 301);
  writeSource('src/removed.ts', 4);
  commitBase('fixture baseline');

  writeSource('src/legacy.ts', 318);
  rmSync(join(repo, 'src', 'removed.ts'));
  writeSource('src/new.ts', 301);
}, 60_000);

afterEach(() => {
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = null;
}, 60_000);

describe('changed-file size checker', () => {
  it('counts physical lines across newline styles without a trailing empty line', () => {
    expect(countSourceLines('one\r\ntwo\r\n')).toBe(2);
    expect(countSourceLines('one\ntwo\rthree')).toBe(3);
    expect(countSourceLines('one\n')).toBe(1);
    expect(countSourceLines('one\r')).toBe(1);
    expect(countSourceLines('')).toBe(0);
  });

  it('includes every supported source extension and excludes non-source files', () => {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'];
    for (const extension of extensions) writeSource(`src/allowed${extension}`, 1);
    writeSource('src/ignored.json', 1);

    const paths = auditChangedFiles(repo, base).map((result) => result.path);

    expect(paths).toEqual(expect.arrayContaining(extensions.map((extension) => `src/allowed${extension}`)));
    expect(paths).not.toContain('src/ignored.json');
  }, 30_000);

  it('deduplicates changed paths while applying the extension allowlist', () => {
    expect(mergeChangedPaths(
      ['src/duplicate.ts', 'src/duplicate.ts'],
      ['src/duplicate.ts', 'src/other.css', 'src/ignored.json'],
    )).toEqual(['src/duplicate.ts', 'src/other.css']);
  });

  it('audits changed source files, excluding unchanged and deleted files', () => {
    const results = auditChangedFiles(repo, base);

    expect(results).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'src/new.ts', currentLines: 301, baseLines: null }),
      expect.objectContaining({ path: 'src/legacy.ts', currentLines: 318, baseLines: 320 }),
    ]));
    expect(results.map((result) => result.path)).not.toContain('src/unchanged.ts');
    expect(results.map((result) => result.path)).not.toContain('src/removed.ts');
    expect(formatWarnings(results)).toContain('src/new.ts');
    expect(formatWarnings(results)).toContain('src/legacy.ts');
  }, 30_000);

  it('uses the base content of a renamed file to classify its warning as legacy', () => {
    git(['mv', 'src/rename-source.ts', 'src/rename-destination.ts']);
    writeSource('src/rename-destination.ts', 318);
    git(['add', '-A']);

    const results = auditChangedFiles(repo, base);
    const renamedFile = results.find((result) => result.path === 'src/rename-destination.ts');
    const warnings = formatWarnings(results);

    expect(renamedFile).toEqual({ path: 'src/rename-destination.ts', currentLines: 318, baseLines: 320 });
    expect(warnings).toContain(
      '- EXISTENTE src/rename-destination.ts (base: 320 linhas; atual: 318 linhas)',
    );
    expect(warnings).not.toContain('- NOVO src/rename-destination.ts');
  }, 30_000);

  it('pairs an unstaged filesystem move with a different basename by line similarity', () => {
    writeSource('src/legacy.ts', 320);
    rmSync(join(repo, 'src', 'new.ts'));
    const destination = 'src/refactored/legacy-check.ts';
    const destinationPath = join(repo, destination);
    mkdirSync(dirname(destinationPath), { recursive: true });
    renameSync(join(repo, 'src', 'legacy.ts'), destinationPath);
    const movedLines = readFileSync(destinationPath, 'utf8').split('\n');
    writeFileSync(destinationPath, movedLines.slice(0, -2).join('\n'));

    const results = auditChangedFiles(repo, base);
    const movedFile = results.find((result) => result.path === destination);
    const warnings = formatWarnings(results);

    expect(movedFile).toEqual({ path: destination, currentLines: 318, baseLines: 320 });
    expect(warnings).toContain(
      `- EXISTENTE ${destination} (base: 320 linhas; atual: 318 linhas)`,
    );
    expect(warnings).not.toContain(`- NOVO ${destination}`);
  }, 30_000);

  it.each([
    { matchedLines: 4, expectedBaseLines: 5 },
    { matchedLines: 3, expectedBaseLines: null },
  ])('pairs an unstaged move only at or above 80% similarity ($matchedLines lines)', ({
    matchedLines, expectedBaseLines,
  }) => {
    commitBase('settle fixture changes');
    writeSource('src/threshold-source.ts', 5);
    commitBase('add threshold source');
    rmSync(join(repo, 'src', 'threshold-source.ts'));
    const destination = `src/threshold-${matchedLines}.ts`;
    writeLines(destination, Array.from({ length: matchedLines }, (_, index) => `line ${index + 1}`));

    const result = auditChangedFiles(repo, base).find((file) => file.path === destination);

    expect(result?.baseLines).toBe(expectedBaseLines);
  }, 30_000);

  it('keeps an unrelated same-basename file new instead of pairing it as an unstaged rename', () => {
    git(['add', '-A']);
    git(['commit', '-m', 'fixture current changes']);

    const source = 'src/original/same.ts';
    const sourcePath = join(repo, source);
    mkdirSync(dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, 'original one\noriginal two\n');
    git(['add', source]);
    git(['commit', '-m', 'add tracked source']);
    base = git(['rev-parse', 'HEAD']);

    rmSync(join(repo, source));
    const destination = 'src/replacement/same.ts';
    const destinationPath = join(repo, destination);
    mkdirSync(dirname(destinationPath), { recursive: true });
    writeFileSync(
      destinationPath,
      Array.from({ length: 301 }, (_, index) => `unrelated line ${index + 1}`).join('\n'),
    );

    const result = auditChangedFiles(repo, base).find((file) => file.path === destination);

    expect(result).toEqual({ path: destination, currentLines: 301, baseLines: null });
    expect(formatWarnings(result ? [result] : [])).toContain(`- NOVO ${destination}`);
  }, 30_000);

  it('keeps a new file unpaired when deleted-source similarity is ambiguous', () => {
    rmSync(join(repo, 'src', 'new.ts'));
    rmSync(join(repo, 'src', 'ambiguous-one.ts'));
    rmSync(join(repo, 'src', 'ambiguous-two.ts'));
    const destination = 'src/refactored/ambiguous.ts';
    writeSource(destination, 318);

    const result = auditChangedFiles(repo, base).find((file) => file.path === destination);

    expect(result).toEqual({
      path: destination,
      currentLines: 318,
      baseLines: null,
    });
    expect(formatWarnings(result ? [result] : [])).toContain(`- NOVO ${destination}`);
  }, 30_000);

  it('keeps competing destinations new when both match the same deleted source', () => {
    commitBase('settle fixture changes');
    const sourceLines = Array.from({ length: 10 }, (_, index) => `source ${index}`);
    writeLines('src/competing-source.ts', sourceLines);
    commitBase('add competing source');
    rmSync(join(repo, 'src', 'competing-source.ts'));
    writeLines('src/competing-one.ts', sourceLines.slice(0, 9));
    writeLines('src/competing-two.ts', sourceLines.slice(0, 9));

    const results = auditChangedFiles(repo, base).filter((file) => file.path.startsWith('src/competing-'));

    expect(results).toHaveLength(2);
    expect(results.every((file) => file.baseLines === null)).toBe(true);
  }, 30_000);

  it('requires the destination to be the deleted source’s clear best candidate', () => {
    commitBase('settle fixture changes');
    const sourceOne = Array.from({ length: 100 }, (_, index) => `source ${index}`);
    const sourceTwo = [
      ...sourceOne.slice(19),
      ...Array.from({ length: 19 }, (_, index) => `second-only ${index}`),
    ];
    writeLines('src/reciprocal-one.ts', sourceOne);
    writeLines('src/reciprocal-two.ts', sourceTwo);
    commitBase('add reciprocal sources');
    rmSync(join(repo, 'src', 'reciprocal-one.ts'));
    rmSync(join(repo, 'src', 'reciprocal-two.ts'));
    writeLines('src/reciprocal-first-destination.ts', [
      ...sourceOne.slice(0, 80),
      ...Array.from({ length: 20 }, (_, index) => `first-only ${index}`),
    ]);
    writeLines('src/reciprocal-second-destination.ts', sourceTwo);

    const results = auditChangedFiles(repo, base);

    expect(results.find((file) => file.path.endsWith('first-destination.ts'))?.baseLines).toBeNull();
    expect(results.find((file) => file.path.endsWith('second-destination.ts'))?.baseLines).toBe(100);
  }, 30_000);

  it('runs the CLI successfully when changed files exceed the limit', () => {
    const result = runChecker(['--base', base], '');

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('src/new.ts');
    expect(result.stdout).toContain('src/legacy.ts');
  }, 30_000);

  it('selects the CLI base in --base, environment, then HEAD priority order', () => {
    commitBase('settle fixture changes');
    writeSource('src/base-priority.ts', 301);
    commitBase('old base');
    const oldBase = base;
    writeSource('src/base-priority.ts', 302);
    commitBase('head base');
    const headBase = base;
    writeSource('src/base-priority.ts', 303);

    expect(runChecker(['--base', headBase], oldBase).stdout).toContain('base: 302 linhas; atual: 303 linhas');
    expect(runChecker([], oldBase).stdout).toContain('base: 301 linhas; atual: 303 linhas');
    expect(runChecker([], '').stdout).toContain('base: 302 linhas; atual: 303 linhas');
  }, 60_000);

  it('exits nonzero and reports Git errors to stderr outside a repository', () => {
    const outsideRepository = join(tempRoot!, 'outside-git');
    mkdirSync(outsideRepository);
    const result = spawnSync(process.execPath, [tsxCli, checkerPath], {
      cwd: outsideRepository,
      encoding: 'utf8',
      env: { ...process.env, GIT_CEILING_DIRECTORIES: tempRoot! },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Erro ao verificar tamanhos de arquivos:');
    expect(result.stderr).toMatch(/fatal:|not a git repository/i);
  }, 30_000);
});
