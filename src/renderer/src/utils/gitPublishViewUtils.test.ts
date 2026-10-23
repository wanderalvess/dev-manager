import { describe, expect, it } from 'vitest';
import type { GitBranchPublishStatus } from '../../../shared/types';
import { describePublishPrompt, getPrActionLabel, isBranchLocalOnly } from './gitPublishViewUtils';

function makeStatus(overrides: Partial<GitBranchPublishStatus> = {}): GitBranchPublishStatus {
  return { branch: 'bugfix/x', publishedOnRemote: true, verifiedOnRemote: true, unpushedCommits: 0, ...overrides };
}

describe('isBranchLocalOnly', () => {
  const base = { currentBranch: 'bugfix/x', provider: 'azure' as const, detachedHead: false };

  it('é verdadeiro quando a branch não está entre as do origin', () => {
    expect(isBranchLocalOnly({ ...base, remoteBranches: ['develop'] })).toBe(true);
    expect(isBranchLocalOnly({ ...base })).toBe(true);
  });

  it('é falso quando a branch já existe no origin', () => {
    expect(isBranchLocalOnly({ ...base, remoteBranches: ['develop', 'bugfix/x'] })).toBe(false);
  });

  it('é falso sem provedor, com HEAD destacado ou sem projeto', () => {
    expect(isBranchLocalOnly({ ...base, provider: undefined, remoteBranches: [] })).toBe(false);
    expect(isBranchLocalOnly({ ...base, detachedHead: true, remoteBranches: [] })).toBe(false);
    expect(isBranchLocalOnly(undefined)).toBe(false);
  });
});

describe('describePublishPrompt', () => {
  it('pede para publicar quando a branch não está no origin', () => {
    const prompt = describePublishPrompt(makeStatus({ publishedOnRemote: false, unpushedCommits: null }), 'release/39.0');
    expect(prompt?.title).toBe('Branch ainda não publicada');
    expect(prompt?.message).toContain('TF401175');
    expect(prompt?.message).toContain("'release/39.0'");
  });

  it('avisa de commits sem push quando a branch já está publicada', () => {
    expect(describePublishPrompt(makeStatus({ unpushedCommits: 1 }), 'develop')?.message).toContain('1 commit local ainda não foi enviado');
    expect(describePublishPrompt(makeStatus({ unpushedCommits: 3 }), 'develop')?.message).toContain('3 commits locais ainda não foram enviados');
  });

  it('não pergunta nada quando a branch está publicada e em dia, ou sem branch', () => {
    expect(describePublishPrompt(makeStatus(), 'develop')).toBeNull();
    expect(describePublishPrompt(makeStatus({ unpushedCommits: null }), 'develop')).toBeNull();
    expect(describePublishPrompt(makeStatus({ branch: '' }), 'develop')).toBeNull();
  });
});

describe('getPrActionLabel', () => {
  it('troca o rótulo conforme a branch precise ser publicada', () => {
    expect(getPrActionLabel('azure', false)).toBe('Abrir Formulário de Pull Request no Azure DevOps');
    expect(getPrActionLabel('azure', true)).toBe('Publicar Branch e Abrir Pull Request no Azure DevOps');
    expect(getPrActionLabel('gitlab', false)).toBe('Abrir Formulário de Merge Request no GitLab');
    expect(getPrActionLabel('github', true)).toBe('Publicar Branch e Abrir Pull Request no GitHub');
  });
});
