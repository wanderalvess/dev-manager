import { describe, expect, it } from 'vitest';
import {
  buildBranchEntries,
  classifyDiffLine,
  getPrBlockedReason,
  getPrButtonLabel,
  getPrPanelTitle,
  getRemoteProviderLabel,
  taskBranchPrefixForType
} from './gitViewUtils';

describe('classifyDiffLine', () => {
  it('destaca adições e remoções, mas não os cabeçalhos +++ e ---', () => {
    expect(classifyDiffLine('+novo').gutterClass).toContain('emerald');
    expect(classifyDiffLine('-velho').gutterClass).toContain('rose');
    expect(classifyDiffLine('+++ b/a.ts').gutterClass).toContain('transparent');
    expect(classifyDiffLine('--- a/a.ts').rowClass).toContain('font-semibold');
  });

  it('reconhece hunks e linhas de contexto', () => {
    expect(classifyDiffLine('@@ -1,2 +1,2 @@').rowClass).toContain('text-primary');
    expect(classifyDiffLine(' contexto').rowClass).toContain('hover:bg-muted/20');
  });
});

describe('taskBranchPrefixForType', () => {
  it('mapeia tipos de tarefa para prefixos de branch', () => {
    expect(taskBranchPrefixForType('Bug')).toBe('bugfix/');
    expect(taskBranchPrefixForType('Defeito')).toBe('bugfix/');
    // "hotfix" contém "fix" e cai antes na regra de bugfix (comportamento original preservado).
    expect(taskBranchPrefixForType('Hotfix')).toBe('bugfix/');
    expect(taskBranchPrefixForType('Task')).toBe('feature/');
    expect(taskBranchPrefixForType(undefined)).toBe('feature/');
  });
});

describe('buildBranchEntries', () => {
  it('lista locais e só-remotas, filtrando por texto', () => {
    const res = buildBranchEntries(['main', 'dev'], ['main', 'release/1'], '');
    expect(res.total).toBe(3);
    expect(res.entries).toEqual([
      { name: 'main', remote: false },
      { name: 'dev', remote: false },
      { name: 'release/1', remote: true }
    ]);
    expect(buildBranchEntries(['main'], ['release/1'], ' REL ').entries).toEqual([{ name: 'release/1', remote: true }]);
  });
});

describe('rótulos de provedor e bloqueio de PR', () => {
  it('traduz o provedor para rótulos', () => {
    expect(getRemoteProviderLabel('github')).toBe('Ver no GitHub');
    expect(getRemoteProviderLabel()).toBe('Ver Remoto');
    expect(getPrPanelTitle('gitlab')).toBe('Criar Merge Request no GitLab');
    expect(getPrButtonLabel('azure')).toContain('Azure DevOps');
  });

  it('retorna o motivo de bloqueio na ordem de prioridade', () => {
    expect(getPrBlockedReason(undefined, 'main')).toBeNull();
    expect(getPrBlockedReason({ currentBranch: 'a' }, 'main')).toContain('remoto compatível');
    expect(getPrBlockedReason({ currentBranch: 'a', provider: 'azure', detachedHead: true }, 'main')).toContain('HEAD');
    expect(getPrBlockedReason({ currentBranch: 'a', provider: 'azure' }, 'a')).toContain('mesma');
    expect(getPrBlockedReason({ currentBranch: 'a', provider: 'azure' }, 'main')).toBeNull();
  });
});
