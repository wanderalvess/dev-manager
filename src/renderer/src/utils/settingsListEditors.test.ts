import { describe, expect, it } from 'vitest';
import {
  addToList,
  coercePortFieldValue,
  computeSetupChecklistStatus,
  removeAtIndex,
  updateAtIndex
} from './settingsListEditors';
import type { MonitoredPortConfig, PathStatusInfo } from '../../../shared/types';

const DEFAULT_PORTS: MonitoredPortConfig[] = [{ port: 8889, label: 'Portal Web', enabled: true }];

function makePathStatus(exists: boolean): PathStatusInfo {
  return { path: 'C:\\qualquer', exists, isDirectory: exists, isFile: false, message: '' };
}

describe('addToList', () => {
  it('adiciona um item ao final da lista existente', () => {
    const result = addToList<MonitoredPortConfig>(
      [{ port: 1521, label: 'Oracle', enabled: true }],
      DEFAULT_PORTS,
      { port: 8080, label: 'Nova Porta', enabled: true }
    );
    expect(result).toEqual([
      { port: 1521, label: 'Oracle', enabled: true },
      { port: 8080, label: 'Nova Porta', enabled: true }
    ]);
  });

  it('usa a lista padrão como base quando current é undefined', () => {
    const result = addToList<MonitoredPortConfig>(undefined, DEFAULT_PORTS, { port: 8080, label: 'Nova Porta', enabled: true });
    expect(result).toEqual([...DEFAULT_PORTS, { port: 8080, label: 'Nova Porta', enabled: true }]);
  });

  it('não modifica a lista original (imutabilidade)', () => {
    const original = [{ port: 1521, label: 'Oracle', enabled: true }];
    addToList(original, DEFAULT_PORTS, { port: 8080, label: 'Nova', enabled: true });
    expect(original).toHaveLength(1);
  });
});

describe('updateAtIndex', () => {
  const list: MonitoredPortConfig[] = [
    { port: 1521, label: 'Oracle', enabled: true },
    { port: 8080, label: 'WTA', enabled: true }
  ];

  it('mescla o patch no item do índice informado', () => {
    const result = updateAtIndex(list, DEFAULT_PORTS, 1, { label: 'WTA Renomeado', enabled: false });
    expect(result[1]).toEqual({ port: 8080, label: 'WTA Renomeado', enabled: false });
    expect(result[0]).toEqual(list[0]);
  });

  it('não altera a lista quando o índice está fora do intervalo', () => {
    const result = updateAtIndex(list, DEFAULT_PORTS, 5, { label: 'Inexistente' });
    expect(result).toEqual(list);
  });

  it('usa a lista padrão como base quando current é undefined', () => {
    const result = updateAtIndex<MonitoredPortConfig>(undefined, DEFAULT_PORTS, 0, { enabled: false });
    expect(result[0]).toEqual({ ...DEFAULT_PORTS[0], enabled: false });
  });
});

describe('removeAtIndex', () => {
  const list: MonitoredPortConfig[] = [
    { port: 1521, label: 'Oracle', enabled: true },
    { port: 8080, label: 'WTA', enabled: true },
    { port: 8101, label: 'Karaf SSH', enabled: true }
  ];

  it('remove o item do índice informado', () => {
    const result = removeAtIndex(list, DEFAULT_PORTS, 1);
    expect(result).toEqual([list[0], list[2]]);
  });

  it('é no-op quando o índice está fora do intervalo (comportamento do splice)', () => {
    const result = removeAtIndex(list, DEFAULT_PORTS, 99);
    expect(result).toEqual(list);
  });

  it('não modifica a lista original (imutabilidade)', () => {
    removeAtIndex(list, DEFAULT_PORTS, 0);
    expect(list).toHaveLength(3);
  });
});

describe('coercePortFieldValue', () => {
  it('converte o campo "port" para inteiro', () => {
    expect(coercePortFieldValue('port', '8080')).toBe(8080);
    expect(coercePortFieldValue('port', 8080)).toBe(8080);
  });

  it('usa 0 como fallback quando o valor não é um número válido', () => {
    expect(coercePortFieldValue('port', '')).toBe(0);
    expect(coercePortFieldValue('port', 'abc')).toBe(0);
  });

  it('preserva números negativos (não trata como falsy)', () => {
    expect(coercePortFieldValue('port', '-5')).toBe(-5);
  });

  it('não converte outros campos, retornando o valor original', () => {
    expect(coercePortFieldValue('label', 'Minha Porta')).toBe('Minha Porta');
    expect(coercePortFieldValue('enabled', false)).toBe(false);
  });
});

describe('computeSetupChecklistStatus', () => {
  it('marca todos os itens como pendentes quando nada está configurado', () => {
    const status = computeSetupChecklistStatus({}, {});
    expect(status.every((item) => !item.done)).toBe(true);
    expect(status.map((item) => item.id)).toEqual(['dirs', 'ide', 'karaf-creds', 'database']);
  });

  it('marca "dirs" como feito somente quando projectsPath E karafPath existem', () => {
    const onlyOne = computeSetupChecklistStatus({}, { projectsPath: makePathStatus(true) });
    expect(onlyOne.find((i) => i.id === 'dirs')?.done).toBe(false);

    const both = computeSetupChecklistStatus(
      {},
      { projectsPath: makePathStatus(true), karafPath: makePathStatus(true) }
    );
    expect(both.find((i) => i.id === 'dirs')?.done).toBe(true);
  });

  it('marca "karaf-creds" como feito somente quando usuário E senha estão preenchidos (não apenas espaços)', () => {
    expect(computeSetupChecklistStatus({ karafUser: 'admin', karafPass: '   ' }, {}).find((i) => i.id === 'karaf-creds')?.done).toBe(false);
    expect(computeSetupChecklistStatus({ karafUser: 'admin', karafPass: 'senha123' }, {}).find((i) => i.id === 'karaf-creds')?.done).toBe(true);
    expect(computeSetupChecklistStatus({ karafUser: 'admin', karafPass: '', hasKarafPass: true }, {}).find((i) => i.id === 'karaf-creds')?.done).toBe(true);
    expect(computeSetupChecklistStatus({ karafUser: '', karafPass: '', hasKarafPass: true }, {}).find((i) => i.id === 'karaf-creds')?.done).toBe(false);
  });

  it('marca "database" como feito quando há ao menos uma conexão configurada', () => {
    expect(computeSetupChecklistStatus({ databaseConnections: [] }, {}).find((i) => i.id === 'database')?.done).toBe(false);
    expect(
      computeSetupChecklistStatus(
        { databaseConnections: [{ id: '1', name: 'X', type: 'oracle', host: 'h', port: 1521, database: 'XE', user: 'u' }] },
        {}
      ).find((i) => i.id === 'database')?.done
    ).toBe(true);
  });
});
