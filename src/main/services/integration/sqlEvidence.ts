import { isReadOnlySql } from '../../../shared/sqlSplitUtils';

/**
 * Evidência por SQL do Rastreio de Integração (decisão 0003). A consulta vem do cadastro do fluxo
 * e roda sempre somente leitura. Os binds são `:lote` (texto), `:inicio` e `:fim` (texto
 * 'AAAA-MM-DD HH:MM:SS', hora local): no Postgres o literal compara direto com timestamp, no
 * Oracle o usuário envolve com TO_DATE. Só os binds que a consulta usa são enviados.
 */

export interface EvidenceContext {
  batchNumber: string;
  startMs: number;
  endMs: number;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** 'AAAA-MM-DD HH:MM:SS' na hora local, o formato que o usuário escreve em TO_DATE/timestamp. */
export function formatBindDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Nomes de bind (`:nome`) usados fora de comentários, literais e casts do Postgres (`::tipo`). */
export function usedBindNames(sql: string): Set<string> {
  const names = new Set<string>();
  const token = /(\/\*[\s\S]*?\*\/|--[^\r\n]*|'(?:''|[^'])*'|(?<!:):(?!=)([a-zA-Z_][a-zA-Z0-9_]*)\b)/g;
  for (const match of sql.matchAll(token)) {
    if (match[2]) names.add(match[2].toLowerCase());
  }
  return names;
}

export function buildEvidenceBinds(sql: string, ctx: EvidenceContext): Record<string, string> {
  const used = usedBindNames(sql);
  const all: Record<string, string> = {
    lote: ctx.batchNumber,
    inicio: formatBindDate(ctx.startMs),
    fim: formatBindDate(ctx.endMs)
  };
  return Object.fromEntries(Object.entries(all).filter(([name]) => used.has(name)));
}

/** A consulta de evidência nunca pode escrever, mesmo que o cadastro tenha sido editado à mão. */
export function validateEvidenceSql(sql: string | undefined): string | null {
  if (!sql?.trim()) return 'A consulta de evidência não está configurada.';
  if (!isReadOnlySql(sql)) return 'A consulta de evidência precisa ser somente leitura (SELECT).';
  return null;
}

const COUNT_QUERY = /\bcount\s*\(/i;

/** `select count(*) ...` conta pelo valor da primeira coluna; qualquer outra consulta conta as linhas devolvidas. */
export function countEvidence(sql: string, rows: Record<string, unknown>[]): number {
  if (COUNT_QUERY.test(sql) && rows.length > 0) {
    const first = Object.values(rows[0])[0];
    const value = Number(first);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }
  return rows.length;
}

export interface EvidenceQueryResult {
  success: boolean;
  rows: Record<string, unknown>[];
  error?: string;
}

export interface PollOutcome {
  /** `found` quando alguma tentativa achou registros. */
  status: 'found' | 'not-found' | 'error';
  count: number;
  attempts: number;
  elapsedMs: number;
  error?: string;
}

export interface PollDeps {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  run: (attemptStartedAt: number) => Promise<EvidenceQueryResult>;
}

/** Espera crescente (1 s, 2 s, 3 s... até 5 s): descida rápida aparece logo, descida lenta não sobrecarrega o banco. */
export function nextPollDelay(attempt: number): number {
  return Math.min(5000, 1000 * Math.max(1, attempt));
}

/**
 * Repete a consulta até achar registros ou esgotar a espera. Erro de SQL interrompe na hora:
 * repetir não conserta uma consulta inválida. Com `waitSeconds` 0 há uma única tentativa.
 */
export async function pollEvidence(sql: string, waitSeconds: number, deps: PollDeps): Promise<PollOutcome> {
  const startedAt = deps.now();
  const deadline = startedAt + Math.max(0, waitSeconds) * 1000;
  let attempts = 0;
  for (;;) {
    attempts += 1;
    const result = await deps.run(deps.now());
    const elapsedMs = deps.now() - startedAt;
    if (!result.success) {
      return { status: 'error', count: 0, attempts, elapsedMs, error: result.error || 'A consulta de evidência falhou.' };
    }
    const count = countEvidence(sql, result.rows);
    if (count > 0) return { status: 'found', count, attempts, elapsedMs };
    const delay = nextPollDelay(attempts);
    if (deps.now() + delay > deadline) return { status: 'not-found', count: 0, attempts, elapsedMs };
    await deps.sleep(delay);
  }
}
