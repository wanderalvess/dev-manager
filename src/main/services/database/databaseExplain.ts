import type { DatabaseConnectionConfig, ExplainPlanResult } from '../../../shared/types';
import type { DatabaseContext } from './databaseContext';

/**
 * Obtém o plano de execução (Explain Plan) para a instrução SQL informada.
 */
export async function explainPlan(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  sql: string
): Promise<ExplainPlanResult> {
  config = ctx.resolveConnectionConfig(config);
  const startTime = Date.now();
  const cleanSql = sql.trim().replace(/;+$/, '');

  if (!cleanSql) {
    return {
      success: false,
      planLines: [],
      executionTimeMs: 0,
      error: 'Instrução SQL vazia para Explain Plan.'
    };
  }

  try {
    if (config.type === 'oracle') {
      return await ctx.withConnection(
        config,
        () => ctx.getOracleConnection(config),
        ({ conn }) => conn.close(),
        async ({ conn, oracledb }) => {
          // 1. Gera o plano na sessão da conexão atual
          await conn.execute(`EXPLAIN PLAN FOR ${cleanSql}`, [], { autoCommit: true });

          // 2. Consulta a saída do DBMS_XPLAN na mesma sessão
          const displayRes = await conn.execute(
            "SELECT PLAN_TABLE_OUTPUT FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', NULL, 'TYPICAL'))",
            [],
            {
              outFormat: oracledb.OUT_FORMAT_OBJECT,
              maxRows: 500
            }
          );

          const lines = (displayRes.rows as any[])?.map((r) => String(r.PLAN_TABLE_OUTPUT || Object.values(r)[0] || '')) || [];
          return {
            success: true,
            planLines: lines,
            executionTimeMs: Date.now() - startTime
          };
        },
        true
      );
    } else if (config.type === 'postgres') {
      const res = await ctx.executeQuery(config, `EXPLAIN (FORMAT TEXT) ${cleanSql}`, 500);
      if (!res.success || !res.rows) {
        return {
          success: false,
          planLines: [],
          executionTimeMs: Date.now() - startTime,
          error: res.error || 'Falha ao executar EXPLAIN no PostgreSQL.'
        };
      }
      const lines = res.rows.map((r) => String(r['QUERY PLAN'] || Object.values(r)[0] || ''));
      return {
        success: true,
        planLines: lines,
        executionTimeMs: Date.now() - startTime
      };
    } else if (config.type === 'mysql') {
      const res = await ctx.executeQuery(config, `EXPLAIN ${cleanSql}`, 500);
      if (!res.success || !res.rows) {
        return {
          success: false,
          planLines: [],
          executionTimeMs: Date.now() - startTime,
          error: res.error || 'Falha ao executar EXPLAIN no MySQL.'
        };
      }
      // Formata as colunas em formato tabular legível
      const lines = res.rows.map(
        (r, idx) =>
          `#${idx + 1} | id: ${r.id ?? '-'} | select_type: ${r.select_type ?? '-'} | table: ${r.table ?? '-'} | type: ${r.type ?? '-'} | possible_keys: ${r.possible_keys ?? '-'} | key: ${r.key ?? '-'} | rows: ${r.rows ?? '-'}`
      );
      return {
        success: true,
        planLines: lines,
        executionTimeMs: Date.now() - startTime
      };
    }

    return {
      success: false,
      planLines: [],
      executionTimeMs: 0,
      error: `Tipo de banco '${config.type}' não suporta Explain Plan.`
    };
  } catch (err: any) {
    return {
      success: false,
      planLines: [],
      executionTimeMs: Date.now() - startTime,
      error: await ctx.formatErrorMessage(err, config)
    };
  }
}
