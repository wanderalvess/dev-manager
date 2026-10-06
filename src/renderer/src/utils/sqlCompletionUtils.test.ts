import { describe, expect, it } from 'vitest';
import type { TableColumnInfo } from '../../../shared/types';
import {
  computeSqlCompletions,
  detectClause,
  isInsideStringOrComment,
  maskSqlLiterals,
  type CompletionContext
} from './sqlCompletionUtils';

const col = (name: string, type = 'VARCHAR2', extra: Partial<TableColumnInfo> = {}): TableColumnInfo =>
  ({ name, type, nullable: true, isPrimaryKey: false, ...extra }) as TableColumnInfo;

const COLUMNS: Record<string, TableColumnInfo[]> = {
  PCPEDC: [col('NUMPED', 'NUMBER', { isPrimaryKey: true, nullable: false }), col('CODCLI', 'NUMBER'), col('DATA', 'DATE')],
  PCCLIENT: [col('CODCLI', 'NUMBER', { isPrimaryKey: true }), col('CLIENTE'), col('CGCENT')],
  'public.users': [col('id', 'int4', { isPrimaryKey: true }), col('email', 'text')]
};

const ctx = (over: Partial<CompletionContext> = {}): CompletionContext => ({
  dialect: 'oracle',
  tables: ['PCPEDC', 'PCCLIENT', 'PCPRODUT'],
  getColumns: (key) => COLUMNS[key],
  ...over
});

/** Posição do cursor marcada com `|` no texto. */
const run = (marked: string, c: CompletionContext = ctx()) => {
  const offset = marked.indexOf('|');
  const text = marked.replace('|', '');
  return { text, result: computeSqlCompletions(text, offset, c) };
};
const labels = (r: { items: { label: string }[] }) => r.items.map((i) => i.label);

describe('após alias ou tabela com ponto', () => {
  it('sugere só as colunas da tabela do alias', () => {
    const { result } = run('SELECT p.| FROM PCPEDC p JOIN PCCLIENT c ON c.CODCLI = p.CODCLI');
    expect(labels(result).sort()).toEqual(['CODCLI', 'DATA', 'NUMPED']);
    expect(result.items.every((i) => i.kind === 'column')).toBe(true);
    expect(result.needColumnsFor).toEqual([]);
  });

  it('filtra pelo prefixo digitado depois do ponto e marca a chave primária', () => {
    const { result } = run('SELECT c.CL| FROM PCCLIENT c');
    expect(labels(result)[0]).toBe('CLIENTE');
    expect(labels(result)).not.toContain('CGCENT');
    const pk = run('SELECT p.NU| FROM PCPEDC p').result.items[0];
    expect(pk.detail).toMatch(/PK/);
    expect(pk.detail).toMatch(/NOT NULL/);
  });

  it('o alias vale mesmo com o FROM depois do cursor e entre vários comandos', () => {
    const { result } = run('SELECT 1 FROM dual;\nSELECT p.| FROM PCPEDC p;\nSELECT 2 FROM dual;');
    expect(labels(result)).toContain('NUMPED');
  });

  it('colunas ainda não carregadas voltam em needColumnsFor', () => {
    const { result } = run('SELECT p.| FROM PCPEDC p', ctx({ getColumns: () => undefined }));
    expect(result.items).toEqual([]);
    expect(result.needColumnsFor).toEqual(['PCPEDC']);
  });

  it('nome da própria tabela como qualificador (sem alias)', () => {
    const { result } = run('SELECT PCCLIENT.| FROM PCCLIENT');
    expect(labels(result)).toContain('CGCENT');
  });

  it('PostgreSQL: schema. lista as tabelas do schema', () => {
    const pg = ctx({ dialect: 'postgres', tables: ['public.users', 'public.orders', 'audit.log'] });
    const { result } = run('SELECT * FROM public.|', pg);
    expect(labels(result).sort()).toEqual(['orders', 'users']);
  });
});

describe('contexto da cláusula', () => {
  it('depois de FROM e JOIN sugere tabelas primeiro', () => {
    const afterFrom = run('SELECT * FROM |').result;
    expect(afterFrom.items[0].kind).toBe('table');
    expect(labels(afterFrom)).toEqual(expect.arrayContaining(['PCPEDC', 'PCCLIENT', 'PCPRODUT']));
    expect(run('SELECT * FROM PCPEDC p JOIN |').result.items[0].kind).toBe('table');
  });

  it('depois de vírgula no FROM continua pedindo tabela', () => {
    expect(run('SELECT * FROM PCPEDC p, |').result.items[0].kind).toBe('table');
  });

  it('depois de uma tabela no FROM sugere continuação (WHERE, JOIN...) e não outra tabela', () => {
    const { result } = run('SELECT * FROM PCPEDC |');
    expect(labels(result)).toEqual(expect.arrayContaining(['WHERE', 'JOIN', 'ORDER BY']));
    expect(result.items.some((i) => i.kind === 'table')).toBe(false);
  });

  it('no SELECT, colunas das tabelas do FROM (mesmo depois do cursor) vêm antes de funções e palavras-chave', () => {
    const { result } = run('SELECT | FROM PCPEDC p');
    expect(result.items[0].kind).toBe('column');
    const kinds = result.items.map((i) => i.kind);
    expect(kinds.indexOf('column')).toBeLessThan(kinds.indexOf('function'));
    expect(kinds.indexOf('function')).toBeLessThan(kinds.indexOf('keyword'));
  });

  it('com várias tabelas oferece também a forma alias.COLUNA', () => {
    const { result } = run('SELECT | FROM PCPEDC p JOIN PCCLIENT c ON 1 = 1');
    expect(labels(result)).toEqual(expect.arrayContaining(['p.NUMPED', 'c.CLIENTE', 'CLIENTE']));
  });

  it('no WHERE e no ON sugere colunas', () => {
    expect(run('SELECT * FROM PCPEDC WHERE |').result.items[0].kind).toBe('column');
    expect(run('SELECT * FROM PCPEDC p JOIN PCCLIENT c ON |').result.items[0].kind).toBe('column');
  });

  it('em branco no início do comando: palavras-chave, snippets e tabelas', () => {
    const { result } = run('|');
    expect(labels(result)).toEqual(expect.arrayContaining(['SELECT', 'sel', 'PCPEDC']));
    expect(result.items.find((i) => i.label === 'sel')?.isSnippet).toBe(true);
  });

  it('novo comando depois de um ponto e vírgula não herda o contexto do anterior', () => {
    const { result } = run('SELECT * FROM PCPEDC;\n|');
    expect(labels(result)).toContain('SELECT');
    expect(result.items.some((i) => i.kind === 'column')).toBe(false);
  });

  it('palavras-chave do dialeto: ROWNUM no Oracle, LIMIT no PostgreSQL', () => {
    expect(labels(run('SELECT * FROM PCPEDC WHERE |').result)).toContain('ROWNUM');
    const pg = ctx({ dialect: 'postgres' });
    expect(labels(run('SELECT * FROM PCPEDC |', pg).result)).toContain('LIMIT');
    expect(labels(run('SELECT * FROM PCPEDC WHERE |', pg).result)).not.toContain('ROWNUM');
  });
});

describe('tabelas com nome que exige aspas', () => {
  it('PostgreSQL: o rótulo é o nome listado e o texto inserido ganha aspas', () => {
    const pg = ctx({ dialect: 'postgres', tables: ['public.Clientes', 'public.users'] });
    const items = run('SELECT * FROM |', pg).result.items;
    expect(items.find((i) => i.label === 'public.Clientes')?.insertText).toBe('public."Clientes"');
    expect(items.find((i) => i.label === 'public.users')?.insertText).toBe('public.users');
  });
});

describe('prefixo, faixa de substituição e limites', () => {
  it('filtra pelo prefixo e informa a palavra a substituir', () => {
    const { text, result } = run('SELECT * FROM PCP|');
    expect(labels(result)).toEqual(expect.arrayContaining(['PCPEDC', 'PCPRODUT']));
    expect(labels(result)).not.toContain('PCCLIENT');
    expect(text.slice(result.range.start, result.range.end)).toBe('PCP');
  });

  it('não sugere dentro de texto entre aspas nem de comentário', () => {
    expect(run("SELECT 'abc| FROM dual").result.items).toEqual([]);
    expect(run('SELECT 1 -- coment| \nFROM dual').result.items).toEqual([]);
    expect(run('SELECT /* x| */ 1 FROM dual').result.items).toEqual([]);
  });

  it('FROM dentro de texto ou comentário não engana o contexto', () => {
    const { result } = run("SELECT 'FROM x' AS a, | FROM PCPEDC");
    expect(result.items[0].kind).toBe('column');
  });

  it('limita a quantidade de itens', () => {
    const many = ctx({ tables: Array.from({ length: 5000 }, (_, i) => `T${i}`) });
    expect(run('SELECT * FROM |', many).result.items.length).toBeLessThanOrEqual(400);
  });
});

describe('helpers', () => {
  it('maskSqlLiterals preserva o tamanho e apaga textos e comentários', () => {
    const sql = "SELECT 'a;b' /* c */ FROM t -- d";
    const masked = maskSqlLiterals(sql);
    expect(masked).toHaveLength(sql.length);
    expect(masked).not.toMatch(/a;b|\bc\b|\bd\b/);
    expect(masked).toContain('FROM t');
  });

  it('isInsideStringOrComment', () => {
    expect(isInsideStringOrComment("SELECT 'ab", 10)).toBe(true);
    expect(isInsideStringOrComment("SELECT 'ab' ", 12)).toBe(false);
    expect(isInsideStringOrComment("SELECT 'it''s", 13)).toBe(true);
    expect(isInsideStringOrComment('SELECT 1 -- x\nFROM', 18)).toBe(false);
  });

  it('detectClause', () => {
    expect(detectClause('SELECT a FROM ')).toBe('table');
    expect(detectClause('SELECT a FROM t ')).toBe('after-table');
    expect(detectClause('SELECT a FROM t WHERE ')).toBe('column');
    expect(detectClause('')).toBe('generic');
  });
});
