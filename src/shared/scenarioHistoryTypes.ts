import type { ApiScenarioRunResult } from './apiScenarioTypes';
import type { AuthLockoutRunResult } from './authLockoutTypes';
import { AUTH_LOCKOUT_STATUS_LABELS } from './authLockoutReport';

/**
 * Histórico de execuções da Validação de Cenários: as últimas execuções do Bloqueio de Login e da Validação de API,
 * em arquivo, para reabrir, copiar e baixar depois. Senhas e tokens já chegam mascarados pelos services.
 */
export type ScenarioRunKind = 'auth-lockout' | 'api';
export type ScenarioRunVerdict = 'passed' | 'failed' | 'warning' | 'error';

export const SCENARIO_RUN_KIND_LABELS: Record<ScenarioRunKind, string> = {
  'auth-lockout': 'Bloqueio de Login',
  api: 'Validação de API'
};

export interface ScenarioRunListItem {
  id: string;
  kind: ScenarioRunKind;
  name: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  verdict: ScenarioRunVerdict;
  /** Uma linha: "OK · 5 de 5", "5 OK · 3 Atenção", "Não rodou". */
  summary: string;
}

export interface ScenarioRunRecord extends ScenarioRunListItem {
  lockout?: AuthLockoutRunResult;
  api?: ApiScenarioRunResult;
}

const duration = (startedAt: string, finishedAt: string) => Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt)) || 0;

export function lockoutRunSummary(result: AuthLockoutRunResult): Pick<ScenarioRunListItem, 'verdict' | 'summary'> {
  if (result.error) return { verdict: 'error', summary: 'Não rodou' };
  const counts = new Map<string, number>();
  for (const check of result.checks) counts.set(check.status, (counts.get(check.status) ?? 0) + 1);
  const order = ['failed', 'warning', 'manual', 'info', 'passed'] as const;
  const parts = order.filter((s) => counts.get(s)).map((s) => `${counts.get(s)} ${AUTH_LOCKOUT_STATUS_LABELS[s]}`);
  const verdict: ScenarioRunVerdict = counts.get('failed') ? 'failed' : counts.get('warning') || counts.get('manual') ? 'warning' : 'passed';
  return { verdict, summary: `${parts.join(' · ') || 'Nada rodou'}${result.aborted ? ' (interrompido)' : ''}` };
}

export function apiRunSummary(result: ApiScenarioRunResult): Pick<ScenarioRunListItem, 'verdict' | 'summary'> {
  if (result.error) return { verdict: 'error', summary: 'Não rodou' };
  const passed = result.rules.filter((r) => r.passed).length;
  return result.success
    ? { verdict: 'passed', summary: `OK · ${passed} de ${result.rules.length}` }
    : { verdict: 'failed', summary: `Falhou · ${passed} de ${result.rules.length}` };
}

/** Nome do registro: cenário da API pelo nome; bloqueio pelos usuários testados (o que distingue uma execução da outra). */
export function lockoutRunName(result: AuthLockoutRunResult): string {
  const users = [...new Set(result.attempts.filter((a) => a.checkId === 'preflight' && a.user).map((a) => a.user as string))];
  return users.length ? `Bloqueio de Login (${users.join(', ')})` : 'Bloqueio de Login';
}

export function toLockoutRecord(id: string, result: AuthLockoutRunResult): ScenarioRunRecord {
  return {
    id,
    kind: 'auth-lockout',
    name: lockoutRunName(result),
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    durationMs: duration(result.startedAt, result.finishedAt),
    ...lockoutRunSummary(result),
    lockout: result
  };
}

export function toApiRecord(id: string, result: ApiScenarioRunResult): ScenarioRunRecord {
  return {
    id,
    kind: 'api',
    name: result.scenarioName,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    durationMs: duration(result.startedAt, result.finishedAt),
    ...apiRunSummary(result),
    api: result
  };
}

export function toListItem(record: ScenarioRunRecord): ScenarioRunListItem {
  return {
    id: record.id,
    kind: record.kind,
    name: record.name,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    durationMs: record.durationMs,
    verdict: record.verdict,
    summary: record.summary
  };
}

/** O relatório Markdown do registro, de qualquer tipo de execução. */
export const recordMarkdown = (record: ScenarioRunRecord): string => record.lockout?.markdown ?? record.api?.markdown ?? '';

/** "850 ms" abaixo de um segundo (a Validação de API costuma ser rápida), "12.4s" acima. */
export const formatRunDuration = (ms: number): string => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)}s`);
