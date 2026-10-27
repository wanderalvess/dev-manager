import {
  WSH_DEFAULT_LIMIT,
  WSH_DEFAULT_LOOKBACK_HOURS,
  WSH_MAX_LIMIT,
  WSH_MAX_LOOKBACK_HOURS,
  WSH_MAX_TEXT_LENGTH,
  type WshItem,
  type WshRoute,
  type WshSearchRequest,
  type WshStatusFilter
} from '../../../shared/wshMonitorTypes';
import { describeWshStatus, parseObservation, splitErrorsByItem } from '../../../shared/wshObservation';

/**
 * SQL do Monitor do WSH. Texto fixo com binds: nada do usuário entra no SQL, e só há SELECT.
 * CLOBs entram cortados (`dbms_lob.substr`): VARIAVEIS e os JSONs de dados nunca são lidos, porque podem ter
 * token ou dado de cliente.
 */

export const WSH_ROUTES_SQL = `select r.id, r.servico
from pcintegracaorotaservico r
where r.ativo = 'S' and r.tipoprocesso = 'BUSCAR'
  and exists (select 1 from pcintegracaocore c where c.idrotaservico = r.id)
order by r.servico`;

export const OBSERVATION_READ_CHARS = 3800;

export interface ValidWshSearch {
  routeId?: number;
  text?: string;
  status: WshStatusFilter;
  lookbackHours: number;
  limit: number;
}

export function validateWshSearch(request: Partial<WshSearchRequest> | undefined): { ok: true; value: ValidWshSearch } | { ok: false; error: string } {
  const input = request ?? {};
  const routeId = input.routeId === undefined || input.routeId === null || (input.routeId as unknown) === '' ? undefined : Number(input.routeId);
  if (routeId !== undefined && (!Number.isInteger(routeId) || routeId <= 0)) return { ok: false, error: 'Rota inválida.' };
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (text.length > WSH_MAX_TEXT_LENGTH) return { ok: false, error: `Busca muito longa (máximo de ${WSH_MAX_TEXT_LENGTH} caracteres).` };
  const status: WshStatusFilter = input.status === 'error' || input.status === 'ok' ? input.status : 'all';
  const hours = Number(input.lookbackHours ?? WSH_DEFAULT_LOOKBACK_HOURS);
  if (!Number.isFinite(hours) || hours <= 0 || hours > WSH_MAX_LOOKBACK_HOURS) return { ok: false, error: 'Período inválido (até 90 dias).' };
  const limit = Math.min(WSH_MAX_LIMIT, Math.max(1, Math.round(Number(input.limit ?? WSH_DEFAULT_LIMIT)) || WSH_DEFAULT_LIMIT));
  return { ok: true, value: { ...(routeId ? { routeId } : {}), ...(text ? { text } : {}), status, lookbackHours: hours, limit } };
}

/** `AAAA-MM-DD HH24:MI:SS` em hora local, o mesmo formato dos binds do rastreio de lote. */
export function formatOracleDate(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** `%` e `_` digitados viram literais no LIKE. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

export function buildWshSearch(search: ValidWshSearch, now: number): { sql: string; binds: Record<string, string | number> } {
  const where = [`c.datacriacao >= to_date(:inicio, 'YYYY-MM-DD HH24:MI:SS')`];
  const binds: Record<string, string | number> = { inicio: formatOracleDate(now - search.lookbackHours * 3_600_000), limite: search.limit };
  if (search.routeId) {
    where.push('c.idrotaservico = :rota');
    binds.rota = search.routeId;
  }
  if (search.text) {
    where.push(`upper(c.idexterno) like :texto escape '\\'`);
    binds.texto = `%${escapeLike(search.text.toUpperCase())}%`;
  }
  if (search.status === 'error') where.push(`c.status = '3'`);
  if (search.status === 'ok') where.push(`c.status = '2'`);
  const sql = `select * from (
  select c.id, c.status, c.tentativas, c.idexterno, c.datacriacao, c.datasincronismo, c.dtultalter,
         r.servico as rota, re.servico as rota_envio, c.idrequisicaoenvio,
         case when c.dadostransformados is null then 0 else 1 end as tem_transformado,
         dbms_lob.substr(c.observacao, ${OBSERVATION_READ_CHARS}, 1) as observacao,
         dbms_lob.getlength(c.observacao) as observacao_tamanho
  from pcintegracaocore c
  join pcintegracaorotaservico r on r.id = c.idrotaservico
  left join pcintegracaorotaservico re on re.id = c.idrotaservicoenvio
  where ${where.join('\n    and ')}
  order by c.id desc
) where rownum <= :limite`;
  return { sql, binds };
}

export type Row = Record<string, unknown>;

/** O driver pode devolver as colunas em maiúsculas ou minúsculas. */
export const col = (row: Row, name: string): unknown => row[name.toUpperCase()] ?? row[name.toLowerCase()];
export const asNumber = (value: unknown) => (value === null || value === undefined || value === '' ? undefined : Number(value));
export const asText = (value: unknown) => (value === null || value === undefined ? undefined : String(value));
export function asEpoch(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const time = value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
  return Number.isFinite(time) ? time : undefined;
}

export function toWshRoute(row: Row): WshRoute {
  return { id: Number(col(row, 'id')), name: String(col(row, 'servico') ?? '') };
}

export function toWshItem(row: Row): WshItem {
  const externalId = asText(col(row, 'idexterno')) ?? '';
  const status = asText(col(row, 'status')) ?? '';
  const { label, tone } = describeWshStatus(status);
  const observation = parseObservation(asText(col(row, 'observacao')), asNumber(col(row, 'observacao_tamanho')));
  const { own, others } = splitErrorsByItem(externalId, observation?.errors ?? []);
  const sendRoute = asText(col(row, 'rota_envio'));
  const requestId = asText(col(row, 'idrequisicaoenvio'));
  const attempts = asNumber(col(row, 'tentativas'));
  const createdAt = asEpoch(col(row, 'datacriacao'));
  const syncedAt = asEpoch(col(row, 'datasincronismo'));
  const updatedAt = asEpoch(col(row, 'dtultalter'));
  return {
    id: Number(col(row, 'id')),
    status,
    statusLabel: label,
    tone,
    ...(attempts !== undefined ? { attempts } : {}),
    externalId,
    route: asText(col(row, 'rota')) ?? '',
    ...(sendRoute ? { sendRoute } : {}),
    ...(requestId ? { requestId } : {}),
    ...(createdAt !== undefined ? { createdAt } : {}),
    ...(syncedAt !== undefined ? { syncedAt } : {}),
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    hasTransformedData: Number(col(row, 'tem_transformado')) === 1,
    ...(observation ? { observation } : {}),
    ownErrors: own,
    otherErrors: others
  };
}
