import { describe, expect, it } from 'vitest';
import {
  analyzeTracerCapture,
  findRepeatedPatterns,
  findSlowStatements,
  moduleLabel,
  normalizeSql,
  routineCodeOf
} from './oracleTracerAnalysis';

function makeStatement(overrides: Partial<Parameters<typeof findSlowStatements>[0][number]> = {}) {
  return {
    sqlId: 'abc',
    sqlText: 'SELECT 1 FROM DUAL',
    module: 'PCSIS2075.exe',
    action: null,
    executions: 1,
    elapsedMs: 10,
    bufferGets: 100,
    ...overrides
  };
}

describe('normalizeSql', () => {
  it('troca literais e listas IN para consultas iguais caírem no mesmo balde', () => {
    const a = normalizeSql("select * from pcnfsaid where numnota = 123 and codcli in (1, 2, 3) and tipo = 'A'");
    const b = normalizeSql("SELECT *  FROM PCNFSAID WHERE NUMNOTA = 456 AND CODCLI IN (9, 8) AND TIPO = 'B'");
    expect(a).toBe(b);
    expect(a).toContain('IN (?)');
  });

  it('mantém binds posicionais (:1) para o texto continuar legível', () => {
    expect(normalizeSql('select * from t where a = :1 and b = 5')).toBe('SELECT * FROM T WHERE A = :1 AND B = ?');
  });

  it('não mexe em dígitos que fazem parte de identificadores', () => {
    expect(normalizeSql('select t1.col2 from tab3 t1')).toBe('SELECT T1.COL2 FROM TAB3 T1');
  });
});

describe('moduleLabel e routineCodeOf', () => {
  it('tira caminho e extensão e acha o número da rotina', () => {
    expect(moduleLabel('C:\\Prod\\PCSIS2075.exe')).toBe('PCSIS2075');
    expect(routineCodeOf('PCSIS2075')).toBe('2075');
  });

  it('mantém módulos sem caminho e rotula o vazio', () => {
    expect(moduleLabel('JDBC Thin Client')).toBe('JDBC Thin Client');
    expect(moduleLabel(null)).toBe('(sem módulo)');
    expect(routineCodeOf('JDBC Thin Client')).toBeNull();
  });
});

describe('findSlowStatements', () => {
  it('ordena pelo tempo médio por execução, não pelo total', () => {
    const slowOnce = makeStatement({ sqlId: 'lenta', executions: 1, elapsedMs: 900 });
    const fastMany = makeStatement({ sqlId: 'rapida', executions: 1000, elapsedMs: 5000 });
    const result = findSlowStatements([fastMany, slowOnce], 5);
    expect(result.map((s) => s.sqlId)).toEqual(['lenta', 'rapida']);
    expect(result[1].avgElapsedMs).toBe(5);
    expect(result[1].bufferGetsPerExec).toBe(0.1);
  });

  it('ignora instruções sem execução ou sem tempo medido', () => {
    const result = findSlowStatements([makeStatement({ executions: 0 }), makeStatement({ elapsedMs: null })], 5);
    expect(result).toEqual([]);
  });
});

describe('findRepeatedPatterns', () => {
  it('marca variações só de literal como possível SQL concatenado', () => {
    const variants = Array.from({ length: 5 }, (_, i) =>
      makeStatement({ sqlId: `v${i}`, sqlText: `SELECT * FROM PCCLIENT WHERE CODCLI = ${i + 100}`, executions: 1, elapsedMs: 2 })
    );
    const [pattern] = findRepeatedPatterns(variants);
    expect(pattern.kind).toBe('literal-variants');
    expect(pattern.sqlIds).toHaveLength(5);
    expect(pattern.totalElapsedMs).toBe(10);
  });

  it('marca a mesma consulta executada muitas vezes (laço no cliente)', () => {
    const [pattern] = findRepeatedPatterns([makeStatement({ executions: 800 })]);
    expect(pattern.kind).toBe('many-executions');
    expect(pattern.totalExecutions).toBe(800);
  });

  it('não marca consultas ocasionais', () => {
    expect(findRepeatedPatterns([makeStatement({ executions: 3 })])).toEqual([]);
  });
});

describe('analyzeTracerCapture', () => {
  it('agrupa por módulo, ordena pelo tempo total e resume as telas', () => {
    const groups = analyzeTracerCapture([
      makeStatement({ sqlId: 'a', module: 'PCSIS2075.exe', action: 'FrmPedido', elapsedMs: 50, executions: 2 }),
      makeStatement({ sqlId: 'b', module: 'PCSIS2075.exe', action: 'FrmPedido', elapsedMs: 70, executions: 3 }),
      makeStatement({ sqlId: 'c', module: 'JDBC Thin Client', elapsedMs: 5, executions: 1 })
    ]);
    expect(groups.map((g) => g.label)).toEqual(['PCSIS2075', 'JDBC Thin Client']);
    const delphi = groups[0];
    expect(delphi).toMatchObject({ routineCode: '2075', isExecutable: true, statementCount: 2, totalExecutions: 5, totalElapsedMs: 120 });
    expect(delphi.screens).toEqual([{ action: 'FrmPedido', statementCount: 2, totalExecutions: 5 }]);
    expect(groups[1].isExecutable).toBe(false);
  });
});
