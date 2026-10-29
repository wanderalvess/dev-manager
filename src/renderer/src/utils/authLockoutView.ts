import { AUTH_LOCKOUT_CHECKS, AUTH_LOCKOUT_CHECK_IDS } from '../../../shared/authLockoutCatalog';
import type {
  AuthLockoutCheckId,
  AuthLockoutCheckResult,
  AuthLockoutCheckStatus,
  AuthLockoutDefaults,
  AuthLockoutPasswordEncoding,
  AuthLockoutRunRequest
} from '../../../shared/authLockoutTypes';
import type { ReadinessTone } from './integrationReadinessView';

export const AUTH_LOCKOUT_FORM_STORAGE_KEY = 'devManager:quality:authLockoutFormV1';

/** Campos da tela. As senhas ficam só na memória da tela: nunca vão para o localStorage. */
export interface AuthLockoutForm {
  baseUrl: string;
  loginPath: string;
  logoffPath: string;
  logsUrl: string;
  logFilePath: string;
  userALogin: string;
  userAPassword: string;
  userBLogin: string;
  userBPassword: string;
  passwordEncoding: AuthLockoutPasswordEncoding;
  threshold: string;
  windowSeconds: string;
  lockMinutes: string;
  concurrency: string;
  lockedPattern: string;
  checks: AuthLockoutCheckId[];
  logSinkUnavailableConfirmed: boolean;
}

export const SLOW_CHECK_IDS = AUTH_LOCKOUT_CHECKS.filter((c) => c.slow).map((c) => c.id);

export function formFromDefaults(defaults: AuthLockoutDefaults): AuthLockoutForm {
  return {
    baseUrl: defaults.baseUrl,
    loginPath: defaults.loginPath,
    logoffPath: defaults.logoffPath,
    logsUrl: defaults.logsUrl,
    logFilePath: defaults.logFilePath ?? '',
    userALogin: '',
    userAPassword: '',
    userBLogin: '',
    userBPassword: '',
    passwordEncoding: defaults.passwordEncoding,
    threshold: String(defaults.threshold),
    windowSeconds: String(defaults.windowSeconds),
    lockMinutes: defaults.lockMinutesCandidates.join(', '),
    concurrency: String(defaults.concurrency),
    lockedPattern: defaults.lockedPattern,
    checks: [...AUTH_LOCKOUT_CHECK_IDS],
    logSinkUnavailableConfirmed: false
  };
}

/** Senhas e a confirmação do destino de logs valem só para a sessão da tela. */
const NOT_STORED = new Set<keyof AuthLockoutForm>(['userAPassword', 'userBPassword', 'logSinkUnavailableConfirmed']);

/** Junta o que foi salvo nesta máquina aos padrões, descartando chaves estranhas e qualquer senha. */
export function mergeStoredForm(base: AuthLockoutForm, raw: string | null): AuthLockoutForm {
  if (!raw) return base;
  try {
    const stored = JSON.parse(raw) as Partial<AuthLockoutForm>;
    const merged = { ...base };
    for (const key of Object.keys(base) as (keyof AuthLockoutForm)[]) {
      if (NOT_STORED.has(key)) continue;
      const value = stored[key];
      if (key === 'checks') {
        if (Array.isArray(value)) merged.checks = value.filter((id): id is AuthLockoutCheckId => AUTH_LOCKOUT_CHECK_IDS.includes(id as AuthLockoutCheckId));
      } else if (key === 'passwordEncoding') {
        if (value === 'md5' || value === 'plain') merged.passwordEncoding = value;
      } else if (typeof value === 'string') {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
    return merged;
  } catch {
    return base;
  }
}

export function serializeForm(form: AuthLockoutForm): string {
  return JSON.stringify(Object.fromEntries(Object.entries(form).filter(([key]) => !NOT_STORED.has(key as keyof AuthLockoutForm))));
}

export function parseMinutesList(text: string): number[] {
  return text
    .split(/[,;\s]+/)
    .map((part) => Number(part.replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
}

const toNumber = (text: string) => (text.trim() ? Number(text) : undefined);

export function buildRunRequest(form: AuthLockoutForm): AuthLockoutRunRequest {
  const hasB = !!form.userBLogin.trim() && !!form.userBPassword;
  return {
    baseUrl: form.baseUrl.trim(),
    loginPath: form.loginPath.trim(),
    logoffPath: form.logoffPath.trim(),
    logsUrl: form.logsUrl.trim(),
    logFilePath: form.logFilePath.trim(),
    userA: { login: form.userALogin.trim(), password: form.userAPassword },
    ...(hasB ? { userB: { login: form.userBLogin.trim(), password: form.userBPassword } } : {}),
    passwordEncoding: form.passwordEncoding,
    threshold: toNumber(form.threshold),
    windowSeconds: toNumber(form.windowSeconds),
    lockMinutesCandidates: parseMinutesList(form.lockMinutes),
    concurrency: toNumber(form.concurrency),
    lockedPattern: form.lockedPattern.trim(),
    checks: form.checks,
    logSinkUnavailableConfirmed: form.logSinkUnavailableConfirmed
  };
}

/** O que impede de começar, em uma frase; nulo quando dá para rodar. */
export function formBlocker(form: AuthLockoutForm): string | null {
  if (form.checks.length === 0) return 'Escolha ao menos uma checagem.';
  if (!form.userALogin.trim() || !form.userAPassword) return 'Informe login e senha do usuário de teste A.';
  const needsB = AUTH_LOCKOUT_CHECKS.some((c) => c.needsUserB && form.checks.includes(c.id));
  if (needsB && (!form.userBLogin.trim() || !form.userBPassword)) {
    return 'Bloqueio por usuário e Concorrência precisam do usuário B (ou desmarque as duas).';
  }
  if (form.userBLogin.trim() && form.userBLogin.trim().toLowerCase() === form.userALogin.trim().toLowerCase()) {
    return 'Os usuários A e B precisam ser diferentes.';
  }
  return null;
}

export function pendingChecks(selected: readonly AuthLockoutCheckId[]): AuthLockoutCheckResult[] {
  return AUTH_LOCKOUT_CHECKS.map((def) => ({
    id: def.id,
    title: def.title,
    status: selected.includes(def.id) ? 'pending' : 'skipped',
    summary: selected.includes(def.id) ? 'Aguardando.' : 'Não selecionada.',
    evidence: []
  }));
}

export const STATUS_TONE: Record<AuthLockoutCheckStatus, ReadinessTone> = {
  pending: 'muted',
  running: 'muted',
  passed: 'success',
  failed: 'danger',
  warning: 'warning',
  info: 'muted',
  manual: 'warning',
  skipped: 'muted'
};

export function summarizeChecks(checks: readonly AuthLockoutCheckResult[]): Partial<Record<AuthLockoutCheckStatus, number>> {
  return checks.reduce<Partial<Record<AuthLockoutCheckStatus, number>>>((acc, c) => ({ ...acc, [c.status]: (acc[c.status] ?? 0) + 1 }), {});
}
