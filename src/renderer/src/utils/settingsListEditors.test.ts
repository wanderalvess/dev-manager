import { describe, expect, it } from 'vitest';
import {
  addToList,
  coercePortFieldValue,
  computeSetupChecklistStatus,
  launcherMapToRows,
  launcherRowsToMap,
  normalizeLauncherMap,
  removeAtIndex,
  removeById,
  updateAtIndex,
  upsertById
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

describe('launcher de rotinas (linhas <-> mapa)', () => {
  it('normaliza extensão (ponto + maiúsculas), apara o caminho e ignora linha sem extensão', () => {
    expect(
      launcherRowsToMap([
        { ext: 'exe', path: ' C:\\a.exe ' },
        { ext: '.Bat', path: 'C:\\b.bat' },
        { ext: '  ', path: 'ignorada' }
      ])
    ).toEqual({ '.EXE': 'C:\\a.exe', '.BAT': 'C:\\b.bat' });
  });

  it('ida e volta mantém o conteúdo e normalizeLauncherMap é idempotente', () => {
    const map = { exe: 'C:\\a.exe', '.bat': 'C:\\b.bat' };
    const normalized = normalizeLauncherMap(map);
    expect(normalized).toEqual({ '.EXE': 'C:\\a.exe', '.BAT': 'C:\\b.bat' });
    expect(normalizeLauncherMap(normalized)).toEqual(normalized);
    expect(launcherMapToRows(normalized)).toEqual([
      { ext: '.EXE', path: 'C:\\a.exe' },
      { ext: '.BAT', path: 'C:\\b.bat' }
    ]);
    expect(launcherMapToRows(undefined)).toEqual([]);
  });
});

describe('upsertById / removeById', () => {
  it('upsertById acrescenta quando novo e substitui no lugar quando o id já existe', () => {
    const base = [{ id: 'a', n: 1 }, { id: 'b', n: 2 }];
    expect(upsertById(base, { id: 'c', n: 3 })).toEqual([...base, { id: 'c', n: 3 }]);
    expect(upsertById(base, { id: 'a', n: 9 })).toEqual([{ id: 'a', n: 9 }, { id: 'b', n: 2 }]);
    expect(upsertById(undefined, { id: 'x', n: 1 })).toEqual([{ id: 'x', n: 1 }]);
    expect(base[0].n).toBe(1);
  });

  it('removeById passa o ativo para o primeiro que sobrou só quando o removido era o ativo', () => {
    const base = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(removeById(base, 'a', 'a')).toEqual({ list: [{ id: 'b' }, { id: 'c' }], activeId: 'b' });
    expect(removeById(base, 'b', 'a')).toEqual({ list: [{ id: 'a' }, { id: 'c' }], activeId: 'a' });
    expect(removeById([{ id: 'a' }], 'a', 'a')).toEqual({ list: [], activeId: undefined });
    expect(removeById(undefined, 'a', undefined)).toEqual({ list: [], activeId: undefined });
  });
});
