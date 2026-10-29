import {
  describeOrderOperation,
  describeOrderStatus,
  markUnanswered,
  parseOrderRejection,
  ONLINE_ORDER_DEFAULT_LIMIT,
  ONLINE_ORDER_DEFAULT_LOOKBACK_HOURS,
  ONLINE_ORDER_MAX_LIMIT,
  ONLINE_ORDER_MAX_LOOKBACK_HOURS,
  type OnlineOrderLogEntry,
  type OnlineOrderLogRequest,
  type OnlineOrderLogResponse,
  type OnlineOrderStatusFilter
} from '../../../shared/onlineOrderLog';
import { asEpoch, asNumber, asText, col, formatOracleDate, type Row } from './wshMonitorQuery';

/**
 * SQL da PCLOGPEDIDOAPI (processos online de pedido). Texto fixo com binds, só SELECT. O JSON (CLOB) entra cortado
 * (`dbms_lob.substr`) para uma linha grande não pesar a tela. No mesmo segundo, o desfecho (A ou R) vem antes do P.
 */

export const ORDER_JSON_READ_CHARS = 3800;

export interface ValidOrderLogSearch {
  orderNumber?: number;
  status: OnlineOrderStatusFilter;
  lookbackHours: number;
  limit: number;
}

export function validateOrderLogSearch(
  request: Partial<OnlineOrderLogRequest> | undefined
): { ok: true; value: ValidOrderLogSearch } | { ok: false; error: string } {
  const input = request ?? {};
  const typed = String(input.orderNumber ?? '').trim();
  if (typed && !/^\d{1,15}$/.test(typed)) return { ok: false, error: 'Número do pedido inválido: use só dígitos.' };
  const status: OnlineOrderStatusFilter = input.status === 'A' || input.status === 'R' || input.status === 'P' ? input.status : 'all';
  const hours = Number(input.lookbackHours ?? ONLINE_ORDER_DEFAULT_LOOKBACK_HOURS);
  if (!Number.isFinite(hours) || hours <= 0 || hours > ONLINE_ORDER_MAX_LOOKBACK_HOURS) return { ok: false, error: 'Período inválido (até 90 dias).' };
  const limit = Math.min(ONLINE_ORDER_MAX_LIMIT, Math.max(1, Math.round(Number(input.limit ?? ONLINE_ORDER_DEFAULT_LIMIT)) || ONLINE_ORDER_DEFAULT_LIMIT));
  return { ok: true, value: { ...(typed ? { orderNumber: Number(typed) } : {}), status, lookbackHours: hours, limit } };
}

export function buildOrderLogSearch(search: ValidOrderLogSearch, now: number): { sql: string; binds: Record<string, string | number> } {
  const where: string[] = [];
  const binds: Record<string, string | number> = { limite: search.limit };
  if (search.orderNumber !== undefined) {
    where.push('l.numped = :numped');
    binds.numped = search.orderNumber;
  } else {
    where.push(`l.data >= to_date(:inicio, 'YYYY-MM-DD HH24:MI:SS')`);
    binds.inicio = formatOracleDate(now - search.lookbackHours * 3_600_000);
  }
  if (search.status !== 'all') {
    where.push('upper(l.status) = :status');
    binds.status = search.status;
  }
  const sql = `select * from (
  select l.data, l.numped, l.posicao, l.operacao, l.status,
         dbms_lob.substr(l.json, ${ORDER_JSON_READ_CHARS}, 1) as json_trecho,
         dbms_lob.getlength(l.json) as json_tamanho
  from pclogpedidoapi l
  where ${where.join('\n    and ')}
  order by l.data desc, case when upper(l.status) = 'P' then 1 else 0 end
) where rownum <= :limite`;
  return { sql, binds };
}

export function toOrderLogEntry(row: Row): OnlineOrderLogEntry {
  const operation = (asText(col(row, 'operacao')) ?? '').trim().toUpperCase();
  const status = (asText(col(row, 'status')) ?? '').trim().toUpperCase();
  const { label, tone } = describeOrderStatus(status);
  const date = asEpoch(col(row, 'data'));
  const position = asText(col(row, 'posicao'))?.trim();
  const json = asText(col(row, 'json_trecho'));
  const length = asNumber(col(row, 'json_tamanho'));
  return {
    ...(date !== undefined ? { date } : {}),
    orderNumber: asText(col(row, 'numped')) ?? '',
    ...(position ? { position } : {}),
    operation,
    operationLabel: describeOrderOperation(operation),
    status,
    statusLabel: label,
    tone,
    ...(json ? { json } : {}),
    jsonTruncated: Boolean(json && length !== undefined && length > json.length),
    ...(status === 'R' && parseOrderRejection(json) ? { reason: parseOrderRejection(json) } : {})
  };
}

type RunQuery = (sql: string, maxRows: number, binds: Record<string, string | number>) => Promise<{ success: boolean; rows?: Row[]; error?: string }>;

/** Valida, consulta e traduz. Entrada inválida e falha do banco voltam como erro legível, nunca exceção. */
export async function searchOrderLog(request: Partial<OnlineOrderLogRequest> | undefined, run: RunQuery, now: number): Promise<OnlineOrderLogResponse> {
  const validation = validateOrderLogSearch(request);
  if (!validation.ok) return { success: false, error: validation.error };
  const { sql, binds } = buildOrderLogSearch(validation.value, now);
  const result = await run(sql, validation.value.limit, binds);
  if (!result.success) return { success: false, error: result.error || 'Falha ao consultar a PCLOGPEDIDOAPI.' };
  return {
    success: true,
    entries: markUnanswered((result.rows ?? []).map(toOrderLogEntry), now),
    limit: validation.value.limit,
    ...(validation.value.orderNumber === undefined ? { lookbackHours: validation.value.lookbackHours } : {})
  };
}
