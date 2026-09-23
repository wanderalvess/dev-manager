import { describe, it, expect } from 'vitest';
import {
  buildFeatureMavenUrl,
  normalizeRoutine801Catalog,
  findRepositoryForFeature,
  filterRoutine801Features,
  buildKarafInstallCommands
} from './routine801Utils';
import { Routine801Feature, Routine801RepositoryUpdate } from '../../shared/types';

describe('routine801Utils', () => {
  describe('buildFeatureMavenUrl', () => {
    it('deve formatar corretamente a URL maven para features.xml', () => {
      const url = buildFeatureMavenUrl(
        'br.com.pcsist.winthor.rotina',
        'winthor-autocadastro-cliente-fidelidade-features',
        '1.36.2.6'
      );
      expect(url).toBe(
        'mvn:br.com.pcsist.winthor.rotina/winthor-autocadastro-cliente-fidelidade-features/1.36.2.6/xml/features'
      );
    });
  });

  describe('normalizeRoutine801Catalog', () => {
    it('deve normalizar resposta vazia com arrays vazios', () => {
      const result = normalizeRoutine801Catalog(null);
      expect(result.repositorios).toEqual([]);
      expect(result.funcionalidades).toEqual([]);
    });

    it('deve normalizar repositórios e funcionalidades preenchendo featureMavenUrl', () => {
      const raw = {
        repositorios: [
          {
            comando: 'INSTALL',
            repositorio: {
              groupId: 'br.com.pcsist.winthor.rotina',
              artifactId: 'winthor-fin-1531-features',
              version: '1.38.0.2'
            }
          }
        ],
        funcionalidades: [
          {
            nome: 'winthor-fin-1531',
            versao: '1.38.0.2',
            codigoRotina: 1531,
            codigoModulo: 15,
            tipoProjeto: 'ROTINA',
            descricao: '1531 - Conciliação Bancária',
            status: 'LIBERADO'
          }
        ]
      };

      const result = normalizeRoutine801Catalog(raw);
      expect(result.repositorios).toHaveLength(1);
      expect(result.repositorios[0].repositorio.featureMavenUrl).toBe(
        'mvn:br.com.pcsist.winthor.rotina/winthor-fin-1531-features/1.38.0.2/xml/features'
      );
      expect(result.funcionalidades).toHaveLength(1);
      expect(result.funcionalidades[0].nome).toBe('winthor-fin-1531');
      expect(result.funcionalidades[0].tipoProjeto).toBe('ROTINA');
      expect(result.funcionalidades[0].status).toBe('LIBERADO');
      expect(result.funcionalidades[0].featureMavenUrl).toBe(
        'mvn:br.com.pcsist.winthor.rotina/winthor-fin-1531-features/1.38.0.2/xml/features'
      );
    });
  });

  describe('findRepositoryForFeature', () => {
    const repos: Routine801RepositoryUpdate[] = [
      {
        comando: 'INSTALL',
        repositorio: {
          groupId: 'br.com.pcsist.winthor.servico',
          artifactId: 'winthor-expedicao-painel-operacao-features',
          version: '1.37.0.9',
          featureMavenUrl: 'mvn:br.com.pcsist.winthor.servico/winthor-expedicao-painel-operacao-features/1.37.0.9/xml/features'
        }
      }
    ];

    it('deve localizar repositório quando artifactId tem sufixo -features', () => {
      const feat: Routine801Feature = {
        nome: 'winthor-expedicao-painel-operacao',
        versao: '1.37.0.9',
        codigoRotina: 0,
        codigoModulo: 38,
        tipoProjeto: 'SERVICO',
        descricao: 'Painel de Expedição',
        status: 'LIBERADO'
      };

      const found = findRepositoryForFeature(feat, repos);
      expect(found).not.toBeNull();
      expect(found?.artifactId).toBe('winthor-expedicao-painel-operacao-features');
    });

    it('deve retornar null quando nenhum repositório corresponder', () => {
      const feat: Routine801Feature = {
        nome: 'winthor-outro-servico',
        versao: '2.0.0.0',
        codigoRotina: 0,
        codigoModulo: 1,
        tipoProjeto: 'SERVICO',
        descricao: 'Outro',
        status: 'LIBERADO'
      };

      const found = findRepositoryForFeature(feat, repos);
      expect(found).toBeNull();
    });
  });

  describe('filterRoutine801Features', () => {
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

    it('deve filtrar por termo de busca no nome ou descrição', () => {
      const res = filterRoutine801Features(list, 'caixa');
      expect(res).toHaveLength(1);
      expect(res[0].codigoRotina).toBe(805);
    });

    it('deve filtrar por código numérico de rotina', () => {
      const res = filterRoutine801Features(list, '1531');
      expect(res).toHaveLength(1);
      expect(res[0].nome).toBe('winthor-fin-1531');
    });

    it('deve filtrar por tipoProjeto (SERVICO ou ROTINA)', () => {
      const resServicos = filterRoutine801Features(list, '', 'SERVICO');
      expect(resServicos).toHaveLength(1);
      expect(resServicos[0].nome).toBe('winthor-expedicao-painel-operacao');

      const resRotinas = filterRoutine801Features(list, '', 'ROTINA');
      expect(resRotinas).toHaveLength(2);
    });

    it('deve filtrar por status (LIBERADO/P ou HOMOLOGACAO/H)', () => {
      const resLiberado = filterRoutine801Features(list, '', 'ALL', 'P');
      expect(resLiberado).toHaveLength(2);

      const resHomologacao = filterRoutine801Features(list, '', 'ALL', 'H');
      expect(resHomologacao).toHaveLength(1);
      expect(resHomologacao[0].status).toBe('HOMOLOGACAO');
    });
  });

  describe('buildKarafInstallCommands', () => {
    it('deve gerar comandos repo-add e feature:install -r -u', () => {
      const feat: Routine801Feature = {
        nome: 'winthor-fin-1531',
        versao: '1.38.0.2',
        codigoRotina: 1531,
        codigoModulo: 15,
        tipoProjeto: 'ROTINA',
        descricao: '1531',
        status: 'LIBERADO',
        featureMavenUrl: 'mvn:br.com.pcsist.winthor.rotina/winthor-fin-1531-features/1.38.0.2/xml/features'
      };

      const cmds = buildKarafInstallCommands(feat);
      expect(cmds.repoCommand).toBe(
        'feature:repo-add mvn:br.com.pcsist.winthor.rotina/winthor-fin-1531-features/1.38.0.2/xml/features'
      );
      expect(cmds.installCommand).toBe('feature:install -r -u winthor-fin-1531/1.38.0.2');
    });
  });
});
