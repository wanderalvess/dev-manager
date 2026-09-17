import { describe, expect, it } from 'vitest';
import { analyzeExplainPlan } from './explainAnalyzer';

describe('explainAnalyzer', () => {
  it('detecta TABLE ACCESS FULL e produto cartesiano no Oracle', () => {
    const oraclePlan = [
      'Plan hash value: 12345678',
      '| Id  | Operation                     | Name      | Rows | Cost |',
      '|   0 | SELECT STATEMENT              |           |  500 |  120 |',
      '|   1 |  MERGE JOIN CARTESIAN         |           |  500 |  120 |',
      '|   2 |   TABLE ACCESS FULL           | PCPRODUT  |  100 |   50 |',
      '|   3 |   TABLE ACCESS FULL           | PCCLIENT  |    5 |    2 |'
    ];

    const result = analyzeExplainPlan(oraclePlan, 'oracle', 'SELECT * FROM PCPRODUT, PCCLIENT');

    expect(result.overallRisk).toBe('critical');
    expect(result.findings.some((f) => f.type === 'cartesian-join')).toBe(true);
    expect(result.findings.some((f) => f.type === 'full-table-scan')).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('detecta Seq Scan e External Merge Sort no PostgreSQL', () => {
    const pgPlan = [
      'Sort  (cost=12000.00..12500.00 rows=20000 width=32)',
      '  Sort Method: external merge Disk: 4096kB',
      '  ->  Seq Scan on tb_cliente  (cost=0.00..5000.00 rows=20000 width=32)',
      '        Filter: (ativo = true)'
    ];

    const result = analyzeExplainPlan(pgPlan, 'postgres', 'SELECT id, nome FROM tb_cliente WHERE ativo = true ORDER BY nome');

    expect(result.overallRisk).toBe('high');
    expect(result.findings.some((f) => f.type === 'full-table-scan' && f.title.includes('tb_cliente'))).toBe(true);
    expect(result.findings.some((f) => f.type === 'disk-sort')).toBe(true);
  });

  it('detecta type: ALL e Using filesort no MySQL', () => {
    const mysqlPlan = [
      '#1 | id: 1 | select_type: SIMPLE | table: pedidos | type: ALL | possible_keys: - | key: - | rows: 45000 | Extra: Using where; Using filesort'
    ];

    const result = analyzeExplainPlan(mysqlPlan, 'mysql', 'SELECT id FROM pedidos WHERE status = 1 ORDER BY data');

    expect(result.overallRisk).toBe('high');
    expect(result.findings.some((f) => f.type === 'full-table-scan')).toBe(true);
    expect(result.findings.some((f) => f.type === 'disk-sort')).toBe(true);
  });

  it('avalia plano limpo com baixo risco', () => {
    const cleanPlan = [
      'Index Scan using pk_usuario on tb_usuario (cost=0.15..8.17 rows=1 width=64)'
    ];

    const result = analyzeExplainPlan(cleanPlan, 'postgres', 'SELECT id, nome FROM tb_usuario WHERE id = 1');

    expect(result.overallRisk).toBe('low');
    expect(result.findings.length).toBe(0);
  });
});
