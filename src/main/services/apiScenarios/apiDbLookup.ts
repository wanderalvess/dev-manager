import { isReadOnlySql } from '../../../shared/sqlSplitUtils';
import type { ApiRule } from '../../../shared/apiScenarioTypes';
import { extractJsonPath } from '../../utils/qaRegressionUtils';
import { usedBindNames } from '../integration/sqlEvidence';
import type { DbLookup } from './apiRules';
import { showValue } from './apiRules';

export interface DbQueryResult {
  success: boolean;
  rows: Record<string, unknown>[];
  error?: string;
}

/** Roda a consulta numa conexão do DB Studio; `null` quando a conexão não existe mais. */
export type RunDbQuery = (connectionId: string, sql: string, binds: Record<string, unknown>) => Promise<DbQueryResult | null>;

/**
 * Campo × banco: roda a consulta (sempre somente leitura) e devolve a primeira coluna da primeira linha. Se a regra
 * tem `bindPath`, o valor desse campo da resposta entra na consulta como `:valor`.
 */
export async function lookupDbValue(
  rule: ApiRule,
  json: unknown,
  runQuery: RunDbQuery | undefined,
  note: (message: string) => void
): Promise<DbLookup> {
  const sql = rule.sql?.trim() ?? '';
  if (!runQuery) return { problem: 'banco indisponível neste modo' };
  // Mesmo validado ao salvar: o arquivo de cenários pode ter sido editado à mão
  if (!isReadOnlySql(sql)) return { problem: 'a consulta precisa ser somente leitura (SELECT)' };
  const binds: Record<string, unknown> = {};
  if (usedBindNames(sql).has('valor')) {
    const value = rule.bindPath?.trim() ? extractJsonPath(json, rule.bindPath.trim()) : undefined;
    if (value === undefined || value === null || typeof value === 'object') {
      return { problem: `a consulta usa :valor, mas o campo ${rule.bindPath?.trim() || '(não informado)'} não tem um valor simples na resposta` };
    }
    binds.valor = value;
    note(`Consultando o banco com :valor = ${showValue(value)} (vindo de ${rule.bindPath?.trim()}).`);
  } else {
    note('Consultando o banco.');
  }
  const result = await runQuery(rule.connectionId ?? '', sql, binds);
  if (!result) return { problem: 'conexão do banco não encontrada (foi apagada do DB Studio?)' };
  if (!result.success) return { problem: `a consulta falhou: ${result.error ?? 'erro'}` };
  const first = result.rows[0];
  if (!first) return { problem: 'a consulta não devolveu nenhuma linha' };
  return { value: Object.values(first)[0] };
}
