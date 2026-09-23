import { describe, it, expect } from 'vitest';
import {
  filterRoutine801Features,
  findRepositoryForFeatureUi,
  buildKarafInstallCommandsUi
} from './routine801UiUtils';
import { Routine801Feature, Routine801RepositoryUpdate } from '../../../shared/types';

describe('routine801UiUtils', () => {
  const list: Routine801Feature[] = [
    {
      nome: 'winthor-expedicao-painel-operacao',
      versao: '1.37.0.9',
      codigoRotina: 0,
      codigoModulo: 38,
      tipoProjeto: 'SERVICO',
      descricao: 'Painel de Operações da Expedição',
      status: 'LIBERADO'
    },
    {
      nome: 'winthor-fin-1531',
      versao: '1.38.0.2',
      codigoRotina: 1531,
      codigoModulo: 15,
      tipoProjeto: 'ROTINA',
      descricao: '1531 - Conciliação Bancária',
      status: 'HOMOLOGACAO'
    },
    {
      nome: 'winthor-fin-805',
      versao: '1.39.0.1',
      codigoRotina: 805,
      codigoModulo: 15,
      tipoProjeto: 'ROTINA',
      descricao: '805 - Movimentação de Caixa',
      status: 'LIBERADO'
    }
  ];

  const repos: Routine801RepositoryUpdate[] = [
    {
      comando: 'INSTALL',
      repositorio: {
        groupId: 'br.com.pcsist.winthor.rotina',
        artifactId: 'winthor-fin-805-features',
        version: '1.39.0.1',
        featureMavenUrl: 'mvn:br.com.pcsist.winthor.rotina/winthor-fin-805-features/1.39.0.1/xml/features'
      }
    }
  ];

  it('deve filtrar corretamente por texto de busca', () => {
    const res = filterRoutine801Features(list, 'caixa');
    expect(res).toHaveLength(1);
    expect(res[0].codigoRotina).toBe(805);
  });

  it('deve filtrar por código de rotina numérico', () => {
    const res = filterRoutine801Features(list, '1531');
    expect(res).toHaveLength(1);
    expect(res[0].nome).toBe('winthor-fin-1531');
  });

  it('deve filtrar por tipoProjeto (SERVICO vs ROTINA)', () => {
    const servicos = filterRoutine801Features(list, '', 'SERVICO');
    expect(servicos).toHaveLength(1);

    const rotinas = filterRoutine801Features(list, '', 'ROTINA');
    expect(rotinas).toHaveLength(2);
  });

  it('deve filtrar por status (P / LIBERADO vs H / HOMOLOGACAO)', () => {
    const prod = filterRoutine801Features(list, '', 'ALL', 'P');
    expect(prod).toHaveLength(2);

    const homol = filterRoutine801Features(list, '', 'ALL', 'H');
    expect(homol).toHaveLength(1);
    expect(homol[0].status).toBe('HOMOLOGACAO');
  });

  it('deve encontrar repositório correspondente para feature', () => {
    const repo = findRepositoryForFeatureUi(list[2], repos);
    expect(repo).not.toBeNull();
    expect(repo?.artifactId).toBe('winthor-fin-805-features');
  });

  it('deve gerar snippets CLI do Karaf corretamente', () => {
    const commands = buildKarafInstallCommandsUi(list[2], repos[0].repositorio);
    expect(commands.repoCommand).toContain('feature:repo-add mvn:br.com.pcsist.winthor.rotina');
    expect(commands.installCommand).toBe('feature:install -r -u winthor-fin-805/1.39.0.1');
    expect(commands.fullSnippet).toContain('feature:repo-add');
    expect(commands.fullSnippet).toContain('feature:install -r -u');
  });
});
