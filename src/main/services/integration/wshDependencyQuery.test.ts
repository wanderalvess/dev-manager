import { describe, expect, it } from 'vitest';
import { buildDependencyQuery, dependencyFlows, toDependencies } from './wshDependencyQuery';

describe('dependências no Monitor do WSH', () => {
  const now = new Date(2026, 9, 26, 12, 0, 0).getTime();

  it('o Produto depende de ICMS, PIS/COFINS e NCM; rota fora do catálogo não tem dependências', () => {
    expect(dependencyFlows('WTA - Buscar Produto PDV').dependencies.map((d) => d.id)).toEqual(['07', '06', '05']);
    expect(dependencyFlows('WTA - Buscar ICMS').dependencies).toEqual([]);
    expect(dependencyFlows('XPTO').flow).toBeUndefined();
  });

  it('nomes das rotas por bind, normalizados, e a janela do período', () => {
    const { dependencies } = dependencyFlows('WTA - Buscar Produto PDV');
    const { sql, binds } = buildDependencyQuery(dependencies, now);
    expect(sql).toContain('in (:r0, :r1, :r2)');
    expect(sql).not.toMatch(/ICMS|observacao|variaveis/i);
    expect(binds).toEqual({ inicio: '2026-09-26 12:00:00', r0: 'WTA - BUSCAR ICMS', r1: 'WTA - BUSCAR PIS COFINS', r2: 'WTA - BUSCAR IMPOSTO NCM PDV' });
  });

  it('rota sem linha no banco: nunca integrou neste ambiente', () => {
    const { dependencies } = dependencyFlows('WTA - Buscar Produto PDV');
    const result = toDependencies(dependencies, [
      // ICMS da coleta: última integração em 2024-11-19
      { ROTA: 'WTA - BUSCAR ICMS', ULTIMA: new Date(2024, 10, 19, 23, 27, 4), ULTIMO_STATUS: '2', TOTAL_PERIODO: 0, ERROS_PERIODO: 0 },
      { ROTA: 'WTA - BUSCAR PIS COFINS', ULTIMA: new Date(2026, 8, 24), ULTIMO_STATUS: '3', TOTAL_PERIODO: 4, ERROS_PERIODO: 1 }
    ]);
    expect(result[0]).toMatchObject({ flowId: '07', found: true, lastLabel: 'Integrado', lastTone: 'ok', periodTotal: 0 });
    expect(result[1]).toMatchObject({ flowId: '06', lastTone: 'error', periodErrors: 1 });
    expect(result[2]).toEqual({ flowId: '05', flowName: 'NCM CEST', route: 'WTA - Buscar Imposto NCM PDV', found: false, periodTotal: 0, periodErrors: 0 });
  });
});
