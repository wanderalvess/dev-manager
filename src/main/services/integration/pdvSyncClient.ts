import {
  describeStatus,
  normalizeStatusCode,
  type PdvSyncStatusInfo
} from '../../../shared/pdvSyncBatch';
import { httpRequest } from '../../utils/httpRequest';
import { isSafeUrl } from '../../utils/security';
import type { PdvSyncCredentials, PdvSyncTarget } from '../../../shared/pdvSyncConfig';

/**
 * Cliente do PDVSync (CH) para o Rastreio de Integração (decisão 0003), só leitura. Segue o contrato das rotas do
 * repositório de layouts do WSH: login no RAC (OAuth2 por senha), `LoteExternoRetornos/<inquilino>/<lote>` e
 * `LojaLoteStatusretorno?inquilino=&loteOrigem=&idRetaguardaLoja=`. Não abre nem fecha lote.
 *
 * Nunca registra nem devolve senha, client_secret ou token em mensagem de erro.
 */

export type PdvSyncHttp = typeof httpRequest;

export type PdvSyncOutcome<T> = { ok: true; value: T } | { ok: false; error: string; httpStatus?: number };

export interface PdvSyncBatch {
  found: boolean;
  batchNumber: string;
  statusCode?: number;
  status: PdvSyncStatusInfo;
}

export interface PdvSyncStoreError {
  id?: string;
  message: string;
}

export interface PdvSyncStore {
  branchId?: string;
  statusCode?: number;
  status: PdvSyncStatusInfo;
  errors: PdvSyncStoreError[];
}

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_ERROR_TEXT = 140;

const fail = <T>(error: string, httpStatus?: number): PdvSyncOutcome<T> => ({ ok: false, error, httpStatus });

function shorten(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > MAX_ERROR_TEXT ? `${clean.slice(0, MAX_ERROR_TEXT)}…` : clean;
}

/** Texto curto do erro do servidor (`error_description`, `message` ou `error`), sem despejar o corpo inteiro. */
function serverMessage(body: string): string {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const text = parsed.error_description ?? parsed.message ?? parsed.error;
    return typeof text === 'string' ? shorten(text) : '';
  } catch {
    return '';
  }
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;

export class PdvSyncClient {
  constructor(
    private readonly credentials: PdvSyncCredentials,
    private readonly target: PdvSyncTarget,
    private readonly http: PdvSyncHttp = httpRequest,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS
  ) {}

  private async request(url: string, method: 'GET' | 'POST', headers: Record<string, string>, body?: string) {
    if (!isSafeUrl(url)) return fail<{ status: number; text: string }>('Endereço do PDVSync inválido ou não permitido.');
    try {
      const response = await this.http(url, { method, headers, body, timeout: this.timeoutMs });
      return { ok: true as const, value: { status: response.status, text: await response.text() } };
    } catch (error) {
      return fail<{ status: number; text: string }>(`Não foi possível falar com o PDVSync: ${shorten((error as Error).message)}`);
    }
  }

  /** Login no RAC (`grant_type=password`). Devolve o `access_token`. */
  public async login(): Promise<PdvSyncOutcome<string>> {
    const { racUrl, username, password, clientId, clientSecret } = this.credentials;
    const form = new URLSearchParams({
      grant_type: 'password',
      username,
      password,
      scope: 'authorization_api',
      client_id: clientId,
      client_secret: clientSecret
    });
    const result = await this.request(racUrl, 'POST', { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, form.toString());
    if (!result.ok) return result;

    const { status, text } = result.value;
    if (status === 400 || status === 401 || status === 403) {
      const detail = serverMessage(text);
      return fail(`O PDVSync recusou o login (HTTP ${status})${detail ? `: ${detail}` : ''}. Confira usuário, senha, client_id e client_secret.`, status);
    }
    if (status < 200 || status >= 300) return fail(`O login do PDVSync respondeu HTTP ${status}.`, status);

    const token = asRecord(parseJson(text))?.access_token;
    if (typeof token !== 'string' || !token) return fail('A resposta do login do PDVSync não trouxe o access_token.', status);
    return { ok: true, value: token };
  }

  private authHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}`, Accept: '*/*', 'Content-Type': 'application/json' };
  }

  private failedGet(status: number, text: string, what: string): PdvSyncOutcome<never> {
    if (status === 401 || status === 403) return fail(`O PDVSync não autorizou a consulta de ${what} (HTTP ${status}).`, status);
    const detail = serverMessage(text);
    return fail(`A consulta de ${what} respondeu HTTP ${status}${detail ? `: ${detail}` : ''}.`, status);
  }

  /** `GET LoteExternoRetornos/<inquilino>/<lote>`: o lote existe e em que status está. */
  public async getBatch(token: string, batchNumber: string): Promise<PdvSyncOutcome<PdvSyncBatch>> {
    const base = this.target.batchStatusUrl.replace(/\/+$/, '');
    const url = `${base}/${encodeURIComponent(this.target.tenantId)}/${encodeURIComponent(batchNumber)}`;
    const result = await this.request(url, 'GET', this.authHeaders(token));
    if (!result.ok) return result;

    const { status, text } = result.value;
    const notFound: PdvSyncBatch = { found: false, batchNumber, status: describeStatus(undefined) };
    if (status === 404) return { ok: true, value: notFound };
    if (status < 200 || status >= 300) return this.failedGet(status, text, 'lote');

    const data = asRecord(parseJson(text))?.data;
    const items = Array.isArray(data) ? data : data ? [data] : [];
    const records = items.map(asRecord).filter((item): item is Record<string, unknown> => item !== undefined);
    const match = records.find((item) => String(item.loteOrigem ?? '') === batchNumber) ?? records[0];
    if (!match) return { ok: true, value: notFound };

    const statusCode = normalizeStatusCode(match.status);
    return { ok: true, value: { found: true, batchNumber, statusCode, status: describeStatus(statusCode) } };
  }

  /** `GET LojaLoteStatusretorno?inquilino=&loteOrigem=[&idRetaguardaLoja=]`: o status do lote em cada loja. */
  public async getStores(token: string, batchNumber: string, branchId?: string): Promise<PdvSyncOutcome<PdvSyncStore[]>> {
    const base = this.target.storeStatusUrl;
    if (!base) return { ok: true, value: [] };
    if (!isSafeUrl(base)) return fail('Endereço do PDVSync inválido ou não permitido.');

    const url = new URL(base);
    url.searchParams.set('inquilino', this.target.tenantId);
    url.searchParams.set('loteOrigem', batchNumber);
    if (branchId) url.searchParams.set('idRetaguardaLoja', branchId);

    const result = await this.request(url.toString(), 'GET', this.authHeaders(token));
    if (!result.ok) return result;

    const { status, text } = result.value;
    if (status === 404) return { ok: true, value: [] };
    if (status < 200 || status >= 300) return this.failedGet(status, text, 'status por loja');

    const data = asRecord(parseJson(text))?.data;
    const root = asRecord(Array.isArray(data) ? data[0] : data);
    const rows = Array.isArray(root?.lojaLotes) ? (root.lojaLotes as unknown[]) : [];
    const stores = rows.map(asRecord).filter((row): row is Record<string, unknown> => row !== undefined).map((row): PdvSyncStore => {
      const statusCode = normalizeStatusCode(row.status);
      const errors = (Array.isArray(row.errosIdentificados) ? row.errosIdentificados : [])
        .map(asRecord)
        .filter((error): error is Record<string, unknown> => error !== undefined)
        .map((error) => ({
          id: error.idRetaguarda === undefined ? undefined : String(error.idRetaguarda),
          message: shorten(String(error.erro ?? 'erro sem descrição'))
        }));
      return {
        branchId: row.idRetaguardaLoja === undefined ? undefined : String(row.idRetaguardaLoja),
        statusCode,
        status: describeStatus(statusCode),
        errors
      };
    });
    return { ok: true, value: stores };
  }
}

/** Resultado de procurar um lote no PDVSync: login, lote e, se houver endereço, o status por loja. */
export interface PdvSyncLookup {
  /** Falha do login ou da consulta do lote; sem `batch`. */
  error?: string;
  batch?: PdvSyncBatch;
  stores?: PdvSyncStore[];
  /** O status por loja falhou, mas o do lote veio: o rastreio segue com o que tem. */
  storesError?: string;
  durationMs: number;
}

export async function lookupBatch(client: PdvSyncClient, batchNumber: string, branchId?: string): Promise<PdvSyncLookup> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;

  const login = await client.login();
  if (!login.ok) return { error: login.error, durationMs: elapsed() };

  const batch = await client.getBatch(login.value, batchNumber);
  if (!batch.ok) return { error: batch.error, durationMs: elapsed() };
  if (!batch.value.found) return { batch: batch.value, durationMs: elapsed() };

  const stores = await client.getStores(login.value, batchNumber, branchId);
  return stores.ok
    ? { batch: batch.value, stores: stores.value, durationMs: elapsed() }
    : { batch: batch.value, storesError: stores.error, durationMs: elapsed() };
}

const NO_TARGET: PdvSyncTarget = { tenantId: '', batchStatusUrl: '' };

/** Só o login, para o pré-voo: confirma que as credenciais funcionam sem precisar de inquilino nem de endereço de consulta. */
export async function checkPdvSyncLogin(
  credentials: PdvSyncCredentials,
  http: PdvSyncHttp = httpRequest
): Promise<{ ok: boolean; error?: string; durationMs: number }> {
  const started = Date.now();
  const result = await new PdvSyncClient(credentials, NO_TARGET, http).login();
  return result.ok ? { ok: true, durationMs: Date.now() - started } : { ok: false, error: result.error, durationMs: Date.now() - started };
}
