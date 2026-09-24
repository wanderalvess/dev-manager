import { describe, expect, it } from 'vitest';
import { buildTargetBranchOptions, fileStatusBadge, limitDiffLines } from './gitPageUtils';

describe('buildTargetBranchOptions', () => {
  it('usa as branches do origin, com a padrão das configurações e as convencionais primeiro', () => {
    expect(
      buildTargetBranchOptions({
        remoteBranches: ['feature/a', 'main', 'release/38.0'],
        currentBranch: 'feature/a',
        selected: 'release/38.0',
        preferred: 'release/38.0'
      })
    ).toEqual(['release/38.0', 'main']);
  });

  it('sem refs remotas (nenhum fetch) oferece develop, main e master', () => {
    expect(buildTargetBranchOptions({ remoteBranches: [], currentBranch: 'feature/x', selected: 'develop' })).toEqual([
      'develop',
      'main',
      'master'
    ]);
  });

  it('mantém o valor selecionado mesmo que não exista no origin, para o <select> não mostrar outra opção', () => {
    const options = buildTargetBranchOptions({ remoteBranches: ['main'], currentBranch: 'feature/x', selected: 'develop' });
    expect(options[0]).toBe('develop');
    expect(options).toContain('main');
  });

  it('não oferece a própria branch atual como destino, exceto se já estiver selecionada', () => {
    expect(buildTargetBranchOptions({ remoteBranches: ['develop', 'main'], currentBranch: 'develop', selected: 'main' })).toEqual([
      'main'
    ]);
    expect(
      buildTargetBranchOptions({ remoteBranches: ['develop', 'main'], currentBranch: 'develop', selected: 'develop' })
    ).toEqual(['develop', 'main']);
  });
});

describe('fileStatusBadge', () => {
  it('tem rótulo próprio para renomeados e copiados', () => {
    expect(fileStatusBadge('renamed').label).toBe('R');
    expect(fileStatusBadge('copied').label).toBe('C');
    expect(fileStatusBadge('untracked').label).toBe('?');
    expect(fileStatusBadge('modified').label).toBe('M');
  });
});

describe('limitDiffLines', () => {
  it('corta o diff no limite e informa quantas linhas ficaram de fora', () => {
    expect(limitDiffLines('a\nb\nc', 5)).toEqual({ lines: ['a', 'b', 'c'], hiddenCount: 0 });
    expect(limitDiffLines('a\r\nb\r\nc\r\nd', 2)).toEqual({ lines: ['a', 'b'], hiddenCount: 2 });
  });
});
