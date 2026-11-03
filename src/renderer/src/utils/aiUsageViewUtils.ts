import type { AiLimitStatus } from '../../../shared/types';

export const AI_USAGE_LOCAL_NOTE =
  'Contador local: só enxerga o que passa pelo Hub Manager (tela, API REST e MCP), sem guardar prompt, resposta nem chave. ' +
  'Chamadas feitas fora do Hub não entram. O limite de gastos do painel do provedor continua sendo a proteção real.';

export function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace('.', ',')} mi`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1).replace('.', ',').replace(/,0$/, '')} mil`;
  return value.toLocaleString('pt-BR');
}

/** Custo estimado a partir do preço que o usuário informou; o símbolo da moeda é dele, por isso fica fora. */
export function formatCost(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function limitPercent(used: number, limit: number | undefined): number | null {
  return limit && limit > 0 ? Math.min(100, Math.floor((used / limit) * 100)) : null;
}

/** Texto curto "hoje 1.200/10.000 · mês 5.000/100.000" para o cartão do provedor. */
export function describeLimits(status: AiLimitStatus | undefined): string | null {
  if (!status) return null;
  const parts: string[] = [];
  if (status.dayLimit) parts.push(`hoje ${formatTokens(status.dayUsed)}/${formatTokens(status.dayLimit)}`);
  if (status.monthLimit) parts.push(`mês ${formatTokens(status.monthUsed)}/${formatTokens(status.monthLimit)}`);
  return parts.length ? parts.join(' · ') : null;
}

/** Campo numérico opcional: vazio ou inválido vira `undefined` (sem teto / sem preço). */
export function parseOptionalNumber(text: string, integer: boolean): number | undefined {
  const n = Number(text.replace(',', '.'));
  if (!text.trim() || !Number.isFinite(n) || n < 0) return undefined;
  return integer ? Math.floor(n) : n;
}
