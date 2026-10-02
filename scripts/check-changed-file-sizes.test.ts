import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import {
  auditChangedFiles,
  countSourceLines,
  formatWarnings,
  mergeChangedPaths,
} from './check-changed-file-sizes';

const require = createRequire(import.meta.url);
const tsxCli = require.resolve('tsx/cli');
const checkerPath = fileURLToPath(new URL('./check-changed-file-sizes.ts', import.meta.url));
let tempRoot: string;
let repo: string;
let base: string;
let fixtureBase: string;

function git(args: string[], cwd = repo): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function writeSource(relativePath: string, lines: number): void {
  writeLines(relativePath, Array.from({ length: lines }, (_, index) => `line ${index + 1}`));
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

describe('changed-file size checker utilities', () => {
  it('counts physical lines across newline styles without a trailing empty line', () => {
    expect(countSourceLines('one\r\ntwo\r\n')).toBe(2);
    expect(countSourceLines('one\ntwo\rthree')).toBe(3);
    expect(countSourceLines('one\n')).toBe(1);
    expect(countSourceLines('one\r')).toBe(1);
    expect(countSourceLines('')).toBe(0);
  });

  it('deduplicates changed paths while applying the extension allowlist', () => {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css'];
    expect(mergeChangedPaths(
      ['src/duplicate.ts', ...extensions.map((extension) => `src/allowed${extension}`)],
      ['src/duplicate.ts', 'src/ignored.json'],
    )).toEqual(['src/allowed.cjs', 'src/allowed.css', 'src/allowed.js', 'src/allowed.jsx',
      'src/allowed.mjs', 'src/allowed.ts', 'src/allowed.tsx', 'src/duplicate.ts']);
  });
});

describe('changed-file size checker Git integration', () => {
  beforeAll(() => {
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
    writeSource('src/unchanged.ts', 301);
    writeSource('src/removed.ts', 4);
    commitBase('fixture baseline');
    fixtureBase = base;
  }, 60_000);

  beforeEach(() => {
    git(['reset', '--hard', fixtureBase]);
    git(['clean', '-fd']);
    writeSource('src/legacy.ts', 318);
    rmSync(join(repo, 'src', 'removed.ts'));
    writeSource('src/new.ts', 301);
    base = fixtureBase;
  }, 30_000);

  afterAll(() => {
    if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  }, 60_000);

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

  it('uses staged Git rename detection to classify a renamed file as legacy', () => {
    git(['mv', 'src/rename-source.ts', 'src/rename-destination.ts']);
    writeSource('src/rename-destination.ts', 318);
    git(['add', '-A']);

    const results = auditChangedFiles(repo, base);
    const renamed = results.find((result) => result.path === 'src/rename-destination.ts');

    expect(renamed).toEqual({ path: 'src/rename-destination.ts', currentLines: 318, baseLines: 320 });
    expect(formatWarnings(results)).toContain('- EXISTENTE src/rename-destination.ts');
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

    expect(movedFile).toEqual({ path: destination, currentLines: 318, baseLines: 320 });
    expect(formatWarnings(results)).toContain(`- EXISTENTE ${destination}`);
  }, 30_000);

  it('keeps an unrelated same-basename file new instead of pairing it as a rename', () => {
    const source = 'src/original/same.ts';
    const sourcePath = join(repo, source);
    mkdirSync(dirname(sourcePath), { recursive: true });
    writeFileSync(sourcePath, 'original one\noriginal two\n');
    git(['add', source]);
    git(['commit', '-m', 'add tracked source']);
    base = git(['rev-parse', 'HEAD']);
    rmSync(join(repo, source));

    const destination = 'src/replacement/same.ts';
    writeLines(destination, Array.from({ length: 301 }, (_, index) => `unrelated line ${index + 1}`));
    const result = auditChangedFiles(repo, base).find((file) => file.path === destination);

    expect(result).toEqual({ path: destination, currentLines: 301, baseLines: null });
    expect(formatWarnings(result ? [result] : [])).toContain(`- NOVO ${destination}`);
  }, 30_000);

  it('selects the CLI base in --base, environment, then HEAD order and exits successfully', () => {
    commitBase('settle fixture changes');
    writeSource('src/base-priority.ts', 301);
    commitBase('old base');
    const oldBase = base;
    writeSource('src/base-priority.ts', 302);
    commitBase('head base');
    const headBase = base;
    writeSource('src/base-priority.ts', 303);

    const explicitBase = runChecker(['--base', oldBase], headBase);
    const environmentBase = runChecker([], oldBase);
    const defaultBase = runChecker([], '');

    expect(explicitBase.status).toBe(0);
    expect(explicitBase.stdout).toContain('base: 301 linhas; atual: 303 linhas');
    expect(environmentBase.status).toBe(0);
    expect(environmentBase.stdout).toContain('base: 301 linhas; atual: 303 linhas');
    expect(defaultBase.status).toBe(0);
    expect(defaultBase.stdout).toContain('base: 302 linhas; atual: 303 linhas');
  }, 60_000);

  it('exits nonzero and reports Git errors outside a repository', () => {
    const outsideRepository = join(tempRoot, 'outside-git');
    mkdirSync(outsideRepository);
    const result = spawnSync(process.execPath, [tsxCli, checkerPath], {
      cwd: outsideRepository,
      encoding: 'utf8',
      env: { ...process.env, GIT_CEILING_DIRECTORIES: tempRoot },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Erro ao verificar tamanhos de arquivos:');
    expect(result.stderr).toMatch(/fatal:|not a git repository/i);
  }, 30_000);
});
