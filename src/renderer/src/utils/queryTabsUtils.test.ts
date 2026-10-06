import { describe, expect, it } from 'vitest';
import {
  EMPTY_TABS,
  MAX_QUERY_TABS,
  activeTab,
  addTab,
  closeTab,
  defaultSqlFor,
  deserializeTabs,
  openConnectionTab,
  reconcileTabs,
  renameTab,
  selectTab,
  serializeTabs,
  setTabSql
} from './queryTabsUtils';

const base = () => {
  let s = addTab(EMPTY_TABS, { connectionId: 'ora', sql: 'SELECT 1 FROM DUAL', id: 'a' });
  s = addTab(s, { connectionId: 'pg', sql: 'SELECT 1', id: 'b' });
  return s;
};

describe('addTab / selectTab', () => {
  it('cria, numera e ativa a nova aba', () => {
    const s = base();
    expect(s.tabs.map((t) => [t.id, t.title, t.connectionId])).toEqual([
      ['a', 'Consulta 1', 'ora'],
      ['b', 'Consulta 2', 'pg']
    ]);
    expect(s.activeId).toBe('b');
    expect(activeTab(s)?.connectionId).toBe('pg');
  });

  it('a numeração não repete depois de fechar abas', () => {
    let s = closeTab(base(), 'b');
    s = addTab(s, { connectionId: 'pg', sql: '', id: 'c' });
    expect(s.tabs[1].title).toBe('Consulta 3');
  });

  it('respeita o limite de abas', () => {
    let s: ReturnType<typeof base> = EMPTY_TABS;
    for (let i = 0; i < MAX_QUERY_TABS + 3; i++) s = addTab(s, { connectionId: 'x', sql: '' });
    expect(s.tabs).toHaveLength(MAX_QUERY_TABS);
  });

  it('selecionar uma aba inexistente não muda nada', () => {
    const s = base();
    expect(selectTab(s, 'zzz')).toBe(s);
    expect(selectTab(s, 'b')).toBe(s);
  });
});

describe('closeTab', () => {
  it('fechar a ativa volta para a usada mais recentemente', () => {
    let s = addTab(base(), { connectionId: 'my', sql: '', id: 'c' }); // ativa c; recentes: c, b, a
    s = selectTab(s, 'a'); // recentes: a, c, b
    s = selectTab(s, 'c'); // recentes: c, a, b
    s = closeTab(s, 'c');
    expect(s.activeId).toBe('a');
  });

  it('fechar uma aba que não é a ativa mantém a ativa', () => {
    const s = closeTab(base(), 'a');
    expect(s.activeId).toBe('b');
    expect(s.tabs.map((t) => t.id)).toEqual(['b']);
  });

  it('fechar a última deixa sem aba ativa', () => {
    const s = closeTab(closeTab(base(), 'a'), 'b');
    expect(s.tabs).toEqual([]);
    expect(s.activeId).toBeNull();
  });
});

describe('setTabSql / renameTab', () => {
  it('altera só a aba indicada e não recria o estado sem mudança', () => {
    const s = base();
    const changed = setTabSql(s, 'a', 'SELECT 2 FROM DUAL');
    expect(changed.tabs[0].sql).toBe('SELECT 2 FROM DUAL');
    expect(changed.tabs[1].sql).toBe('SELECT 1');
    expect(setTabSql(changed, 'a', 'SELECT 2 FROM DUAL')).toBe(changed);
  });

  it('renomear ignora título vazio e limita o tamanho', () => {
    const s = base();
    expect(renameTab(s, 'a', '   ')).toBe(s);
    expect(renameTab(s, 'a', 'x'.repeat(100)).tabs[0].title).toHaveLength(40);
  });
});

describe('openConnectionTab', () => {
  it('volta para a aba da conexão sem apagar nada das outras', () => {
    const s = setTabSql(base(), 'a', 'SELECT * FROM PCPEDC');
    const back = openConnectionTab(s, 'ora', 'SELECT 1 FROM DUAL');
    expect(back.activeId).toBe('a');
    expect(back.tabs.find((t) => t.id === 'a')?.sql).toBe('SELECT * FROM PCPEDC');
    expect(back.tabs).toHaveLength(2);
  });

  it('com várias abas da conexão, escolhe a usada mais recentemente', () => {
    let s = addTab(base(), { connectionId: 'ora', sql: '', id: 'c' }); // 2 abas oracle: a, c
    s = selectTab(s, 'a');
    s = selectTab(s, 'b'); // recentes: b, a, c
    expect(openConnectionTab(s, 'ora', '').activeId).toBe('a');
  });

  it('sem aba da conexão, abre uma nova com a consulta padrão', () => {
    const s = openConnectionTab(base(), 'my', 'SELECT 1');
    expect(s.tabs).toHaveLength(3);
    expect(activeTab(s)).toMatchObject({ connectionId: 'my', sql: 'SELECT 1' });
  });
});

describe('reconcileTabs', () => {
  const conns = [
    { id: 'ora', type: 'oracle' as const },
    { id: 'pg', type: 'postgres' as const, isDefault: true }
  ];

  it('remove abas de conexões apagadas', () => {
    const s = reconcileTabs(base(), [{ id: 'pg', type: 'postgres' }]);
    expect(s.tabs.map((t) => t.connectionId)).toEqual(['pg']);
    expect(s.activeId).toBe('b');
  });

  it('sem abas, abre uma para a conexão padrão com a consulta do dialeto', () => {
    const s = reconcileTabs(EMPTY_TABS, conns);
    expect(activeTab(s)).toMatchObject({ connectionId: 'pg', sql: 'SELECT 1' });
    const oracleOnly = reconcileTabs(EMPTY_TABS, [{ id: 'ora', type: 'oracle' }]);
    expect(activeTab(oracleOnly)?.sql).toBe('SELECT 1 FROM DUAL');
  });

  it('enquanto as conexões não carregaram, não mexe nas abas', () => {
    const s = base();
    expect(reconcileTabs(s, [])).toBe(s);
  });

  it('ativa a primeira aba se a ativa deixou de existir', () => {
    const s = reconcileTabs({ ...base(), activeId: 'sumiu' }, conns);
    expect(s.activeId).toBe('a');
  });
});

describe('persistência', () => {
  it('guarda só texto e conexão e restaura', () => {
    const s = setTabSql(base(), 'a', 'SELECT * FROM T');
    const back = deserializeTabs(serializeTabs(s));
    expect(back.tabs).toEqual(s.tabs);
    expect(back.activeId).toBe('b');
    expect(back.counter).toBe(2);
  });

  it('dados corrompidos ou ausentes voltam ao estado vazio', () => {
    expect(deserializeTabs(null)).toBe(EMPTY_TABS);
    expect(deserializeTabs('{nao json')).toBe(EMPTY_TABS);
    expect(deserializeTabs('{"tabs":"x"}')).toBe(EMPTY_TABS);
  });

  it('descarta entradas inválidas e corrige a aba ativa', () => {
    const back = deserializeTabs(JSON.stringify({ tabs: [{ id: 1 }, { id: 'ok', connectionId: 'c', sql: 5 }], activeId: 'nope' }));
    expect(back.tabs).toEqual([{ id: 'ok', title: 'Consulta', connectionId: 'c', sql: '' }]);
    expect(back.activeId).toBe('ok');
  });
});

describe('defaultSqlFor', () => {
  it('Oracle usa DUAL', () => {
    expect(defaultSqlFor('oracle')).toBe('SELECT 1 FROM DUAL');
    expect(defaultSqlFor('postgres')).toBe('SELECT 1');
    expect(defaultSqlFor(undefined)).toBe('SELECT 1');
  });
});
