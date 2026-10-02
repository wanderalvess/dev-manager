import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  auditChangedFiles,
  countSourceLines,
  formatWarnings,
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

beforeEach(() => {
  tempRoot = mkdtempSync(join(tmpdir(), 'changed-file-sizes-'));
  repo = join(tempRoot, 'repository');
  mkdirSync(repo);
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
  git(['add', '.']);
  git(['commit', '-m', 'fixture baseline']);
  base = git(['rev-parse', 'HEAD']);

  writeSource('src/legacy.ts', 318);
  rmSync(join(repo, 'src', 'removed.ts'));
  writeSource('src/new.ts', 301);
});

afterEach(() => {
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = null;
});

describe('changed-file size checker', () => {
  it('counts physical lines across newline styles without a trailing empty line', () => {
    expect(countSourceLines('one\r\ntwo\r\n')).toBe(2);
    expect(countSourceLines('one\ntwo\rthree')).toBe(3);
    expect(countSourceLines('')).toBe(0);
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
  });

  it('uses the base content of a renamed file to classify its warning as legacy', () => {
    git(['mv', 'src/rename-source.ts', 'src/rename-destination.ts']);
    writeSource('src/rename-destination.ts', 318);
    git(['add', '-A']);

    const results = auditChangedFiles(repo, base);
    const renamedFile = results.find((result) => result.path === 'src/rename-destination.ts');
    const warnings = formatWarnings(results);

    expect(renamedFile).toEqual({
      path: 'src/rename-destination.ts',
      currentLines: 318,
      baseLines: 320,
    });
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

    expect(movedFile).toEqual({
      path: destination,
      currentLines: 318,
      baseLines: 320,
    });
    expect(warnings).toContain(
      `- EXISTENTE ${destination} (base: 320 linhas; atual: 318 linhas)`,
    );
    expect(warnings).not.toContain(`- NOVO ${destination}`);
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

  it('runs the CLI successfully when changed files exceed the limit', () => {
    const result = spawnSync(process.execPath, [tsxCli, checkerPath, '--base', base], {
      cwd: repo,
      encoding: 'utf8',
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('src/new.ts');
    expect(result.stdout).toContain('src/legacy.ts');
  }, 30_000);
});
