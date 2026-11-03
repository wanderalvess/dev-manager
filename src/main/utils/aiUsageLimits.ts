import type { AiLimitStatus, LlmProviderConfig } from '../../shared/types';

/** A partir deste percentual do teto o Hub avisa; ao chegar a 100% a chamada é bloqueada. */
export const AI_LIMIT_WARNING_RATIO = 0.8;

const fmt = (n: number) => n.toLocaleString('pt-BR');

/** Teto válido = número inteiro positivo. Vazio, zero ou lixo = sem teto. */
export function sanitizeLimit(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 ? Math.floor(value) : undefined;
}

const HOW_TO_FIX =
  'Como resolver: ajuste ou limpe o teto em Configurações → IA & LLM (Editar o motor → Teto de uso) ou aguarde a virada do período. ' +
  'Lembre que este contador só enxerga o que passa pelo Hub; o limite de gastos do painel do provedor continua sendo a proteção real.';

/** Compara o uso do dia e do mês com os tetos do provedor. O bloqueio vence o aviso. */
export function evaluateLimit(provider: LlmProviderConfig, dayUsed: number, monthUsed: number): AiLimitStatus {
  const dayLimit = sanitizeLimit(provider.dailyTokenLimit);
  const monthLimit = sanitizeLimit(provider.monthlyTokenLimit);
  const checks = [
    { limit: dayLimit, used: dayUsed, label: 'diário', when: 'hoje' },
    { limit: monthLimit, used: monthUsed, label: 'mensal', when: 'neste mês' }
  ].filter((c): c is { limit: number; used: number; label: string; when: string } => c.limit !== undefined);

  const base: AiLimitStatus = {
    providerId: provider.id,
    providerName: provider.name,
    dayUsed,
    monthUsed,
    dayLimit,
    monthLimit,
    level: 'ok'
  };

  const blocked = checks.find((c) => c.used >= c.limit);
  if (blocked) {
    return {
      ...base,
      level: 'blocked',
      message:
        `Teto ${blocked.label} de uso de IA atingido no motor "${provider.name}": ${fmt(blocked.used)} de ` +
        `${fmt(blocked.limit)} tokens usados ${blocked.when}. As chamadas a este motor ficam bloqueadas (nada é enviado ao provedor) até o teto subir ou o período virar. ${HOW_TO_FIX}`
    };
  }
  const warn = checks.find((c) => c.used >= c.limit * AI_LIMIT_WARNING_RATIO);
  if (warn) {
    return {
      ...base,
      level: 'warning',
      message:
        `Atenção: o motor "${provider.name}" já usou ${fmt(warn.used)} de ${fmt(warn.limit)} tokens do teto ${warn.label} ` +
        `(${Math.floor((warn.used / warn.limit) * 100)}%). Ao chegar a 100% as chamadas serão bloqueadas.`
    };
  }
  return base;
}
