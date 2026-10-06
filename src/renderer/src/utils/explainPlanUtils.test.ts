import { describe, expect, it } from 'vitest';
import { parseExplainPlan } from './explainPlanUtils';

const ORACLE = `Plan hash value: 1234567890

-------------------------------------------------------------------------------------------
| Id  | Operation                    | Name       | Rows  | Bytes | Cost (%CPU)| Time     |
-------------------------------------------------------------------------------------------
|   0 | SELECT STATEMENT             |            |    10 |   640 |   120   (2)| 00:00:02 |
|*  1 |  HASH JOIN                   |            |    10 |   640 |   120   (2)| 00:00:02 |
|   2 |   TABLE ACCESS BY INDEX ROWID| PCCLIENT   |     5 |   100 |     3   (0)| 00:00:01 |
|*  3 |    INDEX UNIQUE SCAN         | PCCLIENT_PK|     1 |       |     2   (0)| 00:00:01 |
|*  4 |   TABLE ACCESS FULL          | PCPEDC     |    90 |  3960 |   115   (1)| 00:00:02 |
-------------------------------------------------------------------------------------------

Predicate Information (identified by operation id):
---------------------------------------------------

   1 - access("P"."CODCLI"="C"."CODCLI")
   3 - access("C"."CODCLI"=:B1)
   4 - filter("P"."VLTOTAL">1000 AND
              "P"."POSICAO"='L')

Note
-----
   - dynamic statistics used: dynamic sampling (level=2)
`;

const PG = [
  'Hash Join  (cost=10.50..45.20 rows=100 width=64) (actual time=0.5..2.1 rows=98 loops=1)',
  '  Hash Cond: (p.codcli = c.codcli)',
  '  ->  Seq Scan on pedidos p  (cost=0.00..30.00 rows=1000 width=32) (actual time=0.01..0.9 rows=1000 loops=1)',
  "        Filter: (status = 'L'::text)",
  '  ->  Hash  (cost=8.00..8.00 rows=200 width=32) (actual time=0.3..0.3 rows=200 loops=1)',
  '        ->  Index Scan using clientes_pkey on clientes c  (cost=0.15..8.00 rows=200 width=32)',
  'Planning Time: 0.120 ms',
  'Execution Time: 2.300 ms'
];

describe('parseExplainPlan — Oracle', () => {
  const plan = parseExplainPlan(ORACLE.split('\n'))!;

  it('lê os nós na ordem, com profundidade pela indentação', () => {
    expect(plan.kind).toBe('oracle');
    expect(plan.planHash).toBe('1234567890');
    expect(plan.nodes.map((n) => [n.id, n.depth, n.operation])).toEqual([
      ['0', 0, 'SELECT STATEMENT'],
      ['1', 1, 'HASH JOIN'],
      ['2', 2, 'TABLE ACCESS BY INDEX ROWID'],
      ['3', 3, 'INDEX UNIQUE SCAN'],
      ['4', 2, 'TABLE ACCESS FULL']
    ]);
  });

  it('objeto, linhas, bytes, custo e tempo', () => {
    const full = plan.nodes[4];
    expect(full).toMatchObject({ object: 'PCPEDC', rows: '90', bytes: '3960', cost: 115, time: '00:00:02' });
    expect(plan.nodes[3].bytes).toBeUndefined();
  });

  it('custo próprio = acumulado menos o dos filhos; fatia sobre o total', () => {
    expect(plan.totalCost).toBe(120);
    // HASH JOIN: 120 - (3 + 115) = 2
    expect(plan.nodes[1].selfCost).toBe(2);
    expect(plan.nodes[4].selfCost).toBe(115);
    expect(plan.nodes[4].share).toBeCloseTo(115 / 120, 3);
  });

  it('marca full scan e o ponto mais caro', () => {
    expect(plan.nodes[4].flags).toEqual(expect.arrayContaining(['full-scan', 'hotspot']));
    expect(plan.nodes[1].flags).toEqual([]);
  });

  it('predicados vinculados ao id, inclusive os de várias linhas', () => {
    expect(plan.nodes[1].details).toEqual(['access("P"."CODCLI"="C"."CODCLI")']);
    expect(plan.nodes[4].details[0]).toContain('filter("P"."VLTOTAL">1000 AND "P"."POSICAO"=\'L\')');
    expect(plan.nodes[0].details).toEqual([]);
  });

  it('notas do otimizador viram resumo', () => {
    expect(plan.summary.join(' ')).toMatch(/dynamic statistics used/);
  });

  it('produto cartesiano é sinalizado', () => {
    const cart = parseExplainPlan(
      [
        '| Id  | Operation              | Name | Rows | Bytes | Cost (%CPU)| Time     |',
        '|   0 | SELECT STATEMENT       |      |   1  |   1   |     9   (0)| 00:00:01 |',
        '|   1 |  MERGE JOIN CARTESIAN  |      |   1  |   1   |     9   (0)| 00:00:01 |',
        '-----------------------------------------------------------------------------'
      ]
    )!;
    expect(cart.nodes[1].flags).toContain('cartesian');
  });
});

describe('parseExplainPlan — PostgreSQL', () => {
  const plan = parseExplainPlan(PG)!;

  it('profundidade pela posição do "->"', () => {
    expect(plan.kind).toBe('postgres');
    expect(plan.nodes.map((n) => [n.depth, n.operation, n.object])).toEqual([
      [0, 'Hash Join', undefined],
      [1, 'Seq Scan', 'pedidos p'],
      [1, 'Hash', undefined],
      [2, 'Index Scan using clientes_pkey', 'clientes c']
    ]);
  });

  it('custo total, linhas, tempo real e detalhes (Filter, Hash Cond)', () => {
    expect(plan.nodes[0]).toMatchObject({ cost: 45.2, rows: '100', time: '2.1 ms' });
    expect(plan.nodes[0].details).toEqual(['Hash Cond: (p.codcli = c.codcli)']);
    expect(plan.nodes[1].details[0]).toContain("Filter: (status = 'L'::text)");
    expect(plan.totalCost).toBe(45.2);
  });

  it('Seq Scan é full-scan; tempos de planejamento e execução vão para o resumo', () => {
    expect(plan.nodes[1].flags).toContain('full-scan');
    expect(plan.summary).toEqual(['Planning Time: 0.120 ms', 'Execution Time: 2.300 ms']);
  });

  it('o nó de maior custo próprio recebe hotspot', () => {
    // Seq Scan: 30 próprio; Hash Join: 45.2 - (30 + 8) = 7.2
    expect(plan.nodes[1].selfCost).toBe(30);
    expect(plan.nodes[1].flags).toContain('hotspot');
  });
});

describe('parseExplainPlan — formatos desconhecidos', () => {
  it('devolve null para vazio, texto livre e MySQL tabular', () => {
    expect(parseExplainPlan([])).toBeNull();
    expect(parseExplainPlan(['qualquer coisa'])).toBeNull();
    expect(parseExplainPlan(['id | select_type | table | type', '1 | SIMPLE | users | ALL'])).toBeNull();
  });
});
