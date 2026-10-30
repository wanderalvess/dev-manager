import {
  AUTH_LOCKOUT_CHECK_IDS,
  AUTH_LOCKOUT_LIMITS,
  AUTH_LOCKOUT_LOGS_PATH,
  authLockoutBaseDefaults
} from '../../../shared/authLockoutCatalog';
import { compileLockedPattern } from '../../../shared/authLockoutAnalysis';
import type {
  AuthLockoutCheckId,
  AuthLockoutDefaults,
  AuthLockoutPasswordEncoding,
  AuthLockoutRunRequest,
  AuthLockoutUser
} from '../../../shared/authLockoutTypes';
import { karafServicesLogPath } from '../../../shared/integrationInheritance';
import type { AppSettings } from '../../../shared/types';
import { isLogFilePath, isSafeUrl } from '../../utils/security';

export interface LockoutConfig {
  baseUrl: string;
  loginUrl: string;
  logoffUrl?: string;
  logsUrl: string;
  logFilePath?: string;
  userA: AuthLockoutUser;
  userB?: AuthLockoutUser;
  passwordEncoding: AuthLockoutPasswordEncoding;
  threshold: number;
  windowSeconds: number;
  lockMinutesCandidates: number[];
  concurrency: number;
  lockedPattern: RegExp;
  timeoutMs: number;
  checks: Set<AuthLockoutCheckId>;
  logSinkUnavailableConfirmed: boolean;
}

type SettingsSlice = Partial<Pick<AppSettings, 'wtaUrl' | 'karafPath'>>;

function normalizeBaseUrl(raw: string | undefined): string {
  let url = (raw || 'http://localhost:8889').trim();
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

const clamp = (value: number | undefined, fallback: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value as number))) : fallback;

export function authLockoutDefaults(settings: SettingsSlice): AuthLockoutDefaults {
  const baseUrl = normalizeBaseUrl(settings.wtaUrl);
  return {
    ...authLockoutBaseDefaults(),
    baseUrl,
    logsUrl: `${baseUrl}${AUTH_LOCKOUT_LOGS_PATH}`,
    logFilePath: karafServicesLogPath(settings.karafPath)
  };
}

function joinPath(baseUrl: string, path: string | undefined): string | undefined {
  const trimmed = path?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function validUser(user: AuthLockoutUser | undefined): user is AuthLockoutUser {
  return !!user && typeof user.login === 'string' && !!user.login.trim() && typeof user.password === 'string' && !!user.password;
}

/** Valida e completa a requisição com os padrões. Erro volta como texto, igual nos três transportes. */
export function normalizeLockoutRequest(
  request: AuthLockoutRunRequest,
  settings: SettingsSlice
): { config: LockoutConfig } | { error: string } {
  const defaults = authLockoutDefaults(settings);
  const baseUrl = normalizeBaseUrl(request.baseUrl || defaults.baseUrl);
  const loginUrl = joinPath(baseUrl, request.loginPath ?? defaults.loginPath) ?? `${baseUrl}${defaults.loginPath}`;
  const logoffUrl = joinPath(baseUrl, request.logoffPath ?? defaults.logoffPath);
  const logsUrl = joinPath(baseUrl, request.logsUrl) ?? defaults.logsUrl;
  for (const url of [baseUrl, loginUrl, logsUrl, logoffUrl].filter((u): u is string => !!u)) {
    if (!isSafeUrl(url)) return { error: `URL inválida ou não permitida: ${url}` };
  }
  if (!validUser(request.userA)) return { error: 'Informe login e senha do usuário de teste A.' };
  const userA = { login: request.userA.login.trim(), password: request.userA.password };
  const userB = validUser(request.userB) ? { login: request.userB.login.trim(), password: request.userB.password } : undefined;
  if (userB && userB.login.toLowerCase() === userA.login.toLowerCase()) {
    return { error: 'Os usuários A e B precisam ser diferentes.' };
  }

  const logFilePath = (request.logFilePath ?? defaults.logFilePath)?.trim() || undefined;
  if (logFilePath && !isLogFilePath(logFilePath)) return { error: 'O arquivo de log precisa ser local e ter extensão de log (.log, .out, .txt).' };

  const candidates = (request.lockMinutesCandidates?.length ? request.lockMinutesCandidates : defaults.lockMinutesCandidates)
    .map((m) => clamp(m, 5, 1, AUTH_LOCKOUT_LIMITS.maxLockMinutes))
    .filter((m, i, all) => all.indexOf(m) === i)
    .sort((a, b) => a - b);
  const requested = (request.checks ?? []).filter((id) => AUTH_LOCKOUT_CHECK_IDS.includes(id));

  return {
    config: {
      baseUrl,
      loginUrl,
      logoffUrl,
      logsUrl,
      logFilePath,
      userA,
      userB,
      passwordEncoding: request.passwordEncoding === 'plain' ? 'plain' : 'md5',
      threshold: clamp(request.threshold, defaults.threshold, 2, AUTH_LOCKOUT_LIMITS.maxThreshold),
      windowSeconds: clamp(request.windowSeconds, defaults.windowSeconds, 10, AUTH_LOCKOUT_LIMITS.maxWindowSeconds),
      lockMinutesCandidates: candidates,
      concurrency: clamp(request.concurrency, defaults.concurrency, 1, AUTH_LOCKOUT_LIMITS.maxConcurrency),
      lockedPattern: compileLockedPattern(request.lockedPattern, defaults.lockedPattern),
      timeoutMs: clamp(request.requestTimeoutMs, 10_000, 1_000, 60_000),
      checks: new Set(requested.length > 0 ? requested : AUTH_LOCKOUT_CHECK_IDS),
      logSinkUnavailableConfirmed: request.logSinkUnavailableConfirmed === true
    }
  };
}
