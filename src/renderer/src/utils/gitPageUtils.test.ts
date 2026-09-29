import { describe, expect, it } from 'vitest';
import {
  buildTargetBranchOptions,
  fileStatusBadge,
  generateTaskBranchName,
  limitDiffLines,
  parseTaskInput,
  slugifyTaskTitle,
  validateBranchName
} from './gitPageUtils';

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

describe('slugifyTaskTitle', () => {
  it('remove acentos, pontuação e converte para minúsculas com hífens', () => {
    expect(slugifyTaskTitle('Cálculo de Preço & Desconto Especial!')).toBe('calculo-de-preco-desconto-especial');
  });

  it('respeita o tamanho máximo e não deixa hífen no final', () => {
    const longTitle = 'Implementação da nova rotina de importação de dados cadastrais fiscais para faturamento';
    const slug = slugifyTaskTitle(longTitle, 20);
    expect(slug.length).toBeLessThanOrEqual(20);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('retorna string vazia para entrada vazia', () => {
    expect(slugifyTaskTitle('')).toBe('');
  });
});

describe('parseTaskInput', () => {
  it('reconhece URL do Azure DevOps e extrai work item id', () => {
    const res = parseTaskInput('https://dev.azure.com/minhaorg/meuproj/_workitems/edit/98765');
    expect(res).toEqual({ taskId: '98765' });
  });

  it('reconhece URL do Jira e extrai a chave da issue', () => {
    const res = parseTaskInput('https://jira.corp.com/browse/DEV-4321');
    expect(res).toEqual({ taskId: 'DEV-4321' });
  });

  it('reconhece formato "#id - Título"', () => {
    const res = parseTaskInput('#12345 - Corrigir bug no checkout');
    expect(res).toEqual({ taskId: '12345', taskTitle: 'Corrigir bug no checkout' });
  });

  it('reconhece formato "KEY-123: Título"', () => {
    const res = parseTaskInput('WMS-789: Ajustar emissão de nota');
    expect(res).toEqual({ taskId: 'WMS-789', taskTitle: 'Ajustar emissão de nota' });
  });

  it('reconhece ID numérico isolado', () => {
    expect(parseTaskInput('54321')).toEqual({ taskId: '54321' });
  });

  it('interpreta texto livre como título', () => {
    expect(parseTaskInput('Atualização de dependências')).toEqual({ taskTitle: 'Atualização de dependências' });
  });
});

describe('generateTaskBranchName', () => {
  it('gera branch com prefixo, taskId e slug de título', () => {
    const branch = generateTaskBranchName({
      prefix: 'feature/',
      taskId: '12345',
      title: 'Ajuste de Cálculo'
    });
    expect(branch).toBe('feature/12345-ajuste-de-calculo');
  });

  it('normaliza prefixo sem barra final', () => {
    const branch = generateTaskBranchName({
      prefix: 'bugfix',
      taskId: 'WMS-10',
      title: 'Erro de validação'
    });
    expect(branch).toBe('bugfix/WMS-10-erro-de-validacao');
  });

  it('funciona apenas com taskId ou apenas com título', () => {
    expect(generateTaskBranchName({ prefix: 'hotfix/', taskId: '999' })).toBe('hotfix/999');
    expect(generateTaskBranchName({ prefix: 'chore/', title: 'Clean code' })).toBe('chore/clean-code');
  });
});

describe('validateBranchName', () => {
  it('valida nomes aceitos pelo Git', () => {
    expect(validateBranchName('feature/12345-ajuste-de-calculo').valid).toBe(true);
    expect(validateBranchName('main').valid).toBe(true);
  });

  it('rejeita nomes inválidos', () => {
    expect(validateBranchName('').valid).toBe(false);
    expect(validateBranchName('feature/branch com espaco').valid).toBe(false);
    expect(validateBranchName('/inicia-com-barra').valid).toBe(false);
    expect(validateBranchName('termina-com-barra/').valid).toBe(false);
    expect(validateBranchName('feature//dupla-barra').valid).toBe(false);
    expect(validateBranchName('feature..dois-pontos').valid).toBe(false);
    expect(validateBranchName('branch.lock').valid).toBe(false);
    expect(validateBranchName('feature/caractere?invalido').valid).toBe(false);
  });
});
