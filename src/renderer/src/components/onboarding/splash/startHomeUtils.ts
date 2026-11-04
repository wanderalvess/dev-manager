// Tela de início: contas e textos dos cartões do Jira e da semana, sem React.
import { isoDay, mondayOf, type JiraTodayReport } from '../../../../../shared/jiraToday';
import type { UsageDays, UsageSummary } from '../../../../../shared/usageMetricsTypes';
import { USAGE_MODULE_LABELS } from '../../../../../shared/usageActions';
import type { InfrEnvironment } from '../../../../../shared/infrWinthorVersion';
import { envState } from './startScreenUtils';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Horas lançadas: "3 h 20", "2 h", "45 min" ou "0 h". */
export function formatHours(seconds: number): string {
  const minutes = Math.round(Math.max(0, seconds) / 60);
  if (minutes === 0) return '0 h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** "hoje", "ontem" ou o dia da semana curto de um AAAA-MM-DD. */
export function relativeDay(day: string, now: Date): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - date.getTime()) / 86400000);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  return WEEKDAYS[date.getDay()];
}

/** Dias corridos até o fim da sprint, contando hoje como 0; null sem data. */
export function sprintDaysLeft(endDate: string | undefined, now: Date): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(0, Math.round((startOf(end) - startOf(now)) / 86400000));
}

export function sprintLeftLabel(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'termina hoje';
  return days === 1 ? 'falta 1 dia' : `faltam ${days} dias`;
}

export interface WeekBar {
  day: string;
  label: string;
  value: number;
  /** Altura de 0 a 100 em relação ao maior dia */
  percent: number;
  today: boolean;
  future: boolean;
}

/**
 * Barras de segunda a domingo. Com o Jira ligado, as horas lançadas; sem ele, as automações do Hub em cada dia.
 */
export function weekBars(now: Date, jira: JiraTodayReport | null, usageDays: UsageDays | null): { bars: WeekBar[]; unit: 'hours' | 'runs' } {
  const useJira = !!jira?.success;
  const monday = mondayOf(now);
  const today = isoDay(now);
  const values = Array.from({ length: 7 }, (_, i) => {
    const day = isoDay(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
    const value = useJira
      ? (jira!.secondsByDay[day] ?? 0)
      : Object.values(usageDays?.[day] ?? {}).reduce((sum, c) => sum + (c.runs ?? 0), 0);
    return { day, value };
  });
  const max = Math.max(1, ...values.map((v) => v.value));
  return {
    unit: useJira ? 'hours' : 'runs',
    bars: values.map(({ day, value }, i) => ({
      day,
      label: WEEKDAYS[(i + 1) % 7],
      value,
      percent: Math.round((value / max) * 100),
      today: day === today,
      future: day > today
    }))
  };
}

/** Módulo da contagem de uso → aba do app (assistente e sistema não têm página própria). */
const USAGE_MODULE_TO_TAB: Readonly<Record<string, string>> = {
  environment: 'env',
  deploy: 'deploy',
  karaf: 'karaf',
  database: 'database',
  routines: 'routines',
  git: 'git',
  qa: 'quality',
  'api-studio': 'http-client',
  docs: 'docs',
  containers: 'containers',
  apm: 'apm',
  integration: 'integration-trace',
  logs: 'logs'
};

/** Sem uso contado ainda, os atalhos sugerem o básico do dia a dia. */
const DEFAULT_SHORTCUTS = ['environment', 'database', 'deploy', 'git'];

export interface StartShortcut {
  tab: string;
  label: string;
  /** Usos na semana; 0 quando é sugestão */
  runs: number;
}

/**
 * Atalhos da tela de início quando o Jira não está ligado: os módulos mais usados na semana, cada um abrindo a sua aba.
 * Sem uso contado, sugere os módulos do dia a dia. Módulos desligados ficam de fora.
 */
export function weekShortcuts(summary: UsageSummary | null, disabledModules: readonly string[], limit = 4): { items: StartShortcut[]; suggested: boolean } {
  const toItem = (module: string, runs: number): StartShortcut | null => {
    const tab = USAGE_MODULE_TO_TAB[module];
    if (!tab || disabledModules.includes(tab)) return null;
    return { tab, label: USAGE_MODULE_LABELS[module] ?? module, runs };
  };
  const used = (summary?.byModule ?? [])
    .filter((m) => m.runs > 0)
    .sort((a, b) => b.runs - a.runs)
    .map((m) => toItem(m.module, m.runs))
    .filter((i): i is StartShortcut => !!i)
    .slice(0, limit);
  if (used.length > 0) return { items: used, suggested: false };
  return { items: DEFAULT_SHORTCUTS.map((m) => toItem(m, 0)).filter((i): i is StartShortcut => !!i), suggested: true };
}

/** Linha embaixo da saudação: o que importa agora, em uma frase. Vazia quando ainda não há nada para dizer. */
export function heroSummary(jira: JiraTodayReport | null, envs: InfrEnvironment[] | null, now: Date): string {
  const parts: string[] = [];
  if (jira?.success) {
    const n = jira.inProgress.length;
    parts.push(n === 0 ? 'Nenhuma issue em andamento' : `${n} ${n === 1 ? 'issue' : 'issues'} em andamento`);
    const due = jira.dueSoon.length;
    if (due > 0) parts.push(`${due} com prazo até hoje`);
    const left = sprintDaysLeft(jira.sprint?.endDate, now);
    if (left !== null) parts.push(left === 0 ? 'a sprint termina hoje' : left === 1 ? 'a sprint termina amanhã' : `a sprint termina em ${left} dias`);
  }
  if (envs && envs.length > 0) {
    const up = envs.filter((e) => envState(e) === 'up').length;
    parts.push(up === 0 ? 'nenhum ambiente no ar' : `${up} ${up === 1 ? 'ambiente' : 'ambientes'} no ar`);
  }
  if (parts.length === 0) return '';
  const text = parts.join(', ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}
