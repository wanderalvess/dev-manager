// Tela de início (a abertura para quem já usa o app): textos e contas dos cartões, sem React.
import type { InfrEnvironment } from '../../../../../shared/infrWinthorVersion';
import { USAGE_MODULE_LABELS } from '../../../../../shared/usageActions';
import type { UsageSummary } from '../../../../../shared/usageMetricsTypes';

/** "Bom dia" até 11h59, "Boa tarde" até 17h59, "Boa noite" no resto. */
export function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Tempo ligado do PC: "2 dias e 3 h", "5 h 12 min" ou "8 min". */
export function formatUptime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} ${days === 1 ? 'dia' : 'dias'}${hours ? ` e ${hours} h` : ''}`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

/** Tempo economizado: "2 h 15 min", "40 min" ou "menos de 1 min". */
export function formatSaved(ms: number): string {
  const minutes = Math.round(Math.max(0, ms) / 60000);
  if (minutes < 1) return 'menos de 1 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
}

/** Primeiro dia (AAAA-MM-DD) dos últimos 7 dias, contando hoje. */
export function weekStart(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Os módulos mais usados na semana, com o nome que a tela de Meu uso mostra. */
export function topModules(summary: UsageSummary | null, limit = 3): { label: string; runs: number }[] {
  return (summary?.byModule ?? [])
    .filter((m) => m.runs > 0)
    .sort((a, b) => b.runs - a.runs)
    .slice(0, limit)
    .map((m) => ({ label: USAGE_MODULE_LABELS[m.module] ?? m.module, runs: m.runs }));
}

export type EnvState = 'up' | 'partial' | 'down';

/** Um ambiente WinThor está no ar (banco e WTA rodando), parcial (algum rodando) ou parado. */
export function envState(env: InfrEnvironment): EnvState {
  const parts = [env.oracle, env.wta, env.wsh].filter((c): c is NonNullable<typeof c> => !!c);
  const running = parts.filter((c) => c.state === 'running');
  if (env.wta?.state === 'running' && (!env.oracle || env.oracle.state === 'running')) return 'up';
  return running.length > 0 ? 'partial' : 'down';
}

export const ENV_STATE_LABEL: Record<EnvState, string> = { up: 'no ar', partial: 'em parte', down: 'parado' };

/** Dia da semana curto em português para a previsão ("hoje", "amanhã", "qua"). */
export function forecastDayLabel(date: string, now: Date): string {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(y, (m || 1) - 1, d || 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  return ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][day.getDay()];
}
