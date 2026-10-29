/**
 * Log dos processos online de pedido (aba Online do PDV): a cada pré-venda que o PDVOmni envia, atualiza ou cancela,
 * o WTA grava uma linha na PCLOGPEDIDOAPI (DATA, NUMPED, POSICAO, OPERACAO, STATUS, JSON). Só leitura.
 * Visto no ambiente: cada chamada grava um P (o JSON é o pedido como chegou do PDV) e, em seguida, um A (o JSON é o pedido
 * gravado no WinThor, já com POSICAO) ou um R (no lugar do JSON, o motivo: "(WT-IM-0000239) -> Pedido ... já incluído. { [] }").
 */

export type OnlineOrderStatusFilter = 'all' | 'A' | 'R' | 'P';
export type OnlineOrderTone = 'ok' | 'error' | 'pending' | 'other';

export interface OnlineOrderLogRequest {
  /** NUMPED. Com o pedido, a busca ignora o período e traz todo o histórico dele. */
  orderNumber?: string;
  status?: OnlineOrderStatusFilter;
  lookbackHours?: number;
  limit?: number;
}

export interface OnlineOrderLogEntry {
  date?: number;
  orderNumber: string;
  /** POSICAO do pedido no WinThor quando a linha foi gravada. */
  position?: string;
  operation: string;
  operationLabel: string;
  status: string;
  statusLabel: string;
  tone: OnlineOrderTone;
  /** Início do JSON gravado (até 3800 caracteres). */
  json?: string;
  /** O banco tinha mais JSON do que foi lido. */
  jsonTruncated: boolean;
  /** Rejeitado: o motivo que o WTA gravou no lugar do JSON. */
  reason?: OrderRejection;
  /** Processando sem um aceito ou rejeitado depois, há mais de alguns minutos: o WTA não concluiu a chamada. */
  unanswered?: boolean;
}

export interface OrderRejection {
  /** Código da mensagem do WinThor ("WT-IM-0000239"). */
  code?: string;
  message: string;
}

export type OnlineOrderLogResponse =
  | { success: true; entries: OnlineOrderLogEntry[]; limit: number; lookbackHours?: number }
  | { success: false; error: string };

export const ONLINE_ORDER_DEFAULT_LOOKBACK_HOURS = 24;
export const ONLINE_ORDER_MAX_LOOKBACK_HOURS = 24 * 90;
export const ONLINE_ORDER_DEFAULT_LIMIT = 100;
export const ONLINE_ORDER_MAX_LIMIT = 500;

const OPERATIONS: Record<string, string> = { I: 'Inclusão', A: 'Alteração', C: 'Cancelamento' };
const STATUSES: Record<string, { label: string; tone: OnlineOrderTone }> = {
  A: { label: 'Aceito', tone: 'ok' },
  R: { label: 'Rejeitado', tone: 'error' },
  P: { label: 'Processando', tone: 'pending' }
};

const code = (value: string | undefined) => (value ?? '').trim().toUpperCase();

export function describeOrderOperation(operation: string | undefined): string {
  return OPERATIONS[code(operation)] ?? (code(operation) ? `Operação ${code(operation)}` : 'Sem operação');
}

export function describeOrderStatus(status: string | undefined): { label: string; tone: OnlineOrderTone } {
  return STATUSES[code(status)] ?? { label: code(status) ? `Status ${code(status)}` : 'Sem status', tone: 'other' };
}

/** Quanto tempo um P pode ficar sem desfecho antes de virar "Sem resposta". */
export const ONLINE_ORDER_ANSWER_GRACE_MS = 5 * 60_000;

/** O que o JSON da linha é, conforme o status. */
export function describeOrderJson(status: string | undefined): string {
  const known: Record<string, string> = { P: 'Pedido como chegou do PDV', A: 'Pedido como ficou gravado no WinThor', R: 'Resposta de recusa do WinThor' };
  return known[code(status)] ?? 'JSON gravado';
}

/** "(WT-IM-0000239) -> Pedido HUB ou Market Place já incluído. { [] }" → código e mensagem; o "{ [] }" do fim sai. */
export function parseOrderRejection(text: string | undefined): OrderRejection | undefined {
  const raw = (text ?? '').trim();
  if (!raw || raw.startsWith('{') || raw.startsWith('[')) return undefined;
  const match = /^\(\s*([A-Z]{2,}-[A-Z0-9]+-\d+)\s*\)\s*(?:->)?\s*([\s\S]*)$/.exec(raw);
  const message = (match ? match[2] : raw).replace(/\s*\{\s*\[\s*\]\s*\}\s*$/, '').trim();
  return { ...(match ? { code: match[1] } : {}), message: message || raw };
}

/**
 * Marca o P que ficou sem desfecho: cada A ou R responde a um único P do mesmo pedido, o mais antigo ainda em aberto até a
 * data dele. Assim um reenvio (dois P e um A) deixa um P sem resposta. As linhas vêm da mais nova para a mais antiga.
 */
export function markUnanswered(entries: OnlineOrderLogEntry[], now: number): OnlineOrderLogEntry[] {
  const open = new Map<string, number[]>();
  const answered = new Set<number>();
  for (let index = entries.length - 1; index >= 0; index--) {
    const entry = entries[index];
    const pending = open.get(entry.orderNumber) ?? [];
    if (entry.status === 'P') open.set(entry.orderNumber, [...pending, index]);
    else if (pending.length > 0) {
      const [first, ...rest] = pending;
      answered.add(first);
      open.set(entry.orderNumber, rest);
    }
  }
  return entries.map((entry, index) =>
    entry.status === 'P' && !answered.has(index) && entry.date !== undefined && now - entry.date >= ONLINE_ORDER_ANSWER_GRACE_MS
      ? { ...entry, unanswered: true, statusLabel: 'Sem resposta' }
      : entry
  );
}

/** JSON completo fica indentado para leitura; cortado ou inválido volta como veio. */
export function prettyOrderJson(json: string | undefined, truncated: boolean): string | undefined {
  if (!json || truncated) return json;
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}
