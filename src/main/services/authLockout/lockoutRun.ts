import { randomBytes } from 'crypto';
import { authLockoutCheckDefinition } from '../../../shared/authLockoutCatalog';
import { classifyLoginResponse, detectExposure, maskSecrets, type HeaderBag } from '../../../shared/authLockoutAnalysis';
import type {
  AuthLockoutAttempt,
  AuthLockoutAttemptKind,
  AuthLockoutCheckId,
  AuthLockoutCheckResult,
  AuthLockoutCheckStatus,
  AuthLockoutProgress,
  AuthLockoutUser
} from '../../../shared/authLockoutTypes';
import { httpRequest } from '../../utils/httpRequest';
import type { LockoutConfig } from './lockoutConfig';

export class LockoutAbortedError extends Error {
  constructor() {
    super('Execução interrompida.');
  }
}

export interface CallOptions {
  checkId: AuthLockoutCheckId | 'preflight';
  label: string;
  kind: AuthLockoutAttemptKind;
  user?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  withAuth?: boolean;
}

export interface CallResult {
  attempt: AuthLockoutAttempt;
  /** Corpo sem máscara, só para a análise em memória; nunca vai para o resultado. */
  body: string;
  headers: HeaderBag;
  token?: string;
}

const PROGRESS_TICK_MS = 15_000;

/** Estado de uma execução: tentativas registradas, segredos a mascarar, resultados e interrupção. */
export class LockoutRun {
  readonly runId = `lk-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
  readonly startedAt = new Date();
  readonly attempts: AuthLockoutAttempt[] = [];
  readonly results = new Map<AuthLockoutCheckId, AuthLockoutCheckResult>();
  /** Senhas e tokens vistos na execução: mascarados no relatório e procurados nos logs. */
  readonly secrets = new Set<string>();
  readonly wrongPasswords: string[] = [];
  readonly tokens = new Map<string, string>();
  private aborted = false;
  private wrongSeq = 0;

  constructor(
    readonly config: LockoutConfig,
    private readonly emit: (progress: AuthLockoutProgress) => void
  ) {
    this.secrets.add(config.userA.password);
    if (config.userB) this.secrets.add(config.userB.password);
  }

  get isAborted(): boolean {
    return this.aborted;
  }

  abort(): void {
    this.aborted = true;
  }

  selected(id: AuthLockoutCheckId): boolean {
    return this.config.checks.has(id);
  }

  elapsedMs(): number {
    return Date.now() - this.startedAt.getTime();
  }

  log(message: string): void {
    this.emit({ runId: this.runId, at: new Date().toISOString(), message });
  }

  throwIfAborted(): void {
    if (this.aborted) throw new LockoutAbortedError();
  }

  /** Senha errada única por tentativa: se aparecer no log, prova que o servidor registra a senha digitada. */
  nextWrongPassword(): string {
    this.wrongSeq += 1;
    const password = `Errada#${this.runId}-${this.wrongSeq}`;
    this.wrongPasswords.push(password);
    this.secrets.add(password);
    return password;
  }

  setCheck(id: AuthLockoutCheckId, status: AuthLockoutCheckStatus, summary: string, evidence: string[] = [], startedMs?: number): void {
    const check: AuthLockoutCheckResult = {
      id,
      title: authLockoutCheckDefinition(id).title,
      status,
      summary,
      evidence,
      ...(startedMs !== undefined ? { durationMs: Date.now() - startedMs } : {})
    };
    this.results.set(id, check);
    this.emit({ runId: this.runId, at: new Date().toISOString(), message: `${check.title}: ${summary}`, check });
  }

  /** Espera interrompível, avisando o tempo restante para a tela não parecer travada. */
  async sleep(ms: number, reason: string): Promise<void> {
    const until = Date.now() + Math.max(0, ms);
    while (Date.now() < until) {
      this.throwIfAborted();
      const remaining = until - Date.now();
      this.log(`${reason} — faltam ${Math.ceil(remaining / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, Math.min(PROGRESS_TICK_MS, remaining)));
    }
    this.throwIfAborted();
  }

  /** Espera até `offsetMs` contado de `fromMs` (epoch); não espera se o momento já passou. */
  async sleepUntil(fromMs: number, offsetMs: number, reason: string): Promise<void> {
    await this.sleep(fromMs + offsetMs - Date.now(), reason);
  }

  async call(options: CallOptions): Promise<CallResult> {
    this.throwIfAborted();
    const started = Date.now();
    const offsetMs = started - this.startedAt.getTime();
    let status = 0;
    let body = '';
    let headers: HeaderBag = {};
    let error: string | undefined;
    try {
      const res = await httpRequest(options.url, {
        method: options.method,
        headers: { Accept: 'application/json', 'User-Agent': 'DevManager-LockoutTest/1.0', ...options.headers },
        ...(options.body !== undefined ? { body: options.body } : {}),
        timeout: this.config.timeoutMs
      });
      status = res.status;
      body = await res.text();
      headers = (res.headers ?? {}) as HeaderBag;
    } catch (err: any) {
      error = err?.message || 'Sem resposta do servidor.';
    }
    const isLogin = options.kind === 'login-wrong' || options.kind === 'login-correct';
    const classification = isLogin ? classifyLoginResponse({ status, body, headers }, this.config.lockedPattern) : undefined;
    const token = classification?.issuedToken ? extractToken(body) : undefined;
    const secrets = [...this.secrets];
    const attempt: AuthLockoutAttempt = {
      seq: this.attempts.length + 1,
      at: new Date(started).toISOString(),
      offsetMs,
      checkId: options.checkId,
      label: options.label,
      ...(options.user ? { user: options.user } : {}),
      kind: options.kind,
      ...(options.withAuth !== undefined ? { withAuth: options.withAuth } : {}),
      method: options.method,
      path: safePath(options.url),
      status,
      ...(classification ? { outcome: classification.outcome } : {}),
      durationMs: Date.now() - started,
      issuedToken: classification?.issuedToken ?? false,
      setSessionCookie: classification?.setSessionCookie ?? false,
      bodySnippet: maskSecrets(body, token ? [...secrets, token] : secrets),
      exposure: status > 0 ? detectExposure({ body, headers, secrets, allowToken: classification?.outcome === 'authenticated' }) : [],
      ...(error ? { error } : {})
    };
    if (token) this.secrets.add(token);
    this.attempts.push(attempt);
    this.emit({ runId: this.runId, at: attempt.at, message: `${attempt.label}: ${describeAttempt(attempt)}`, attempt });
    return { attempt, body, headers, ...(token ? { token } : {}) };
  }

  login(checkId: CallOptions['checkId'], user: AuthLockoutUser, password: string, label: string, headers?: Record<string, string>) {
    return this.call({
      checkId,
      label,
      kind: password === user.password ? 'login-correct' : 'login-wrong',
      user: user.login,
      method: 'POST',
      url: this.config.loginUrl,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ login: user.login, senha: password })
    });
  }

  /** Falhas seguidas, cada uma com uma senha errada diferente. */
  async failTimes(checkId: AuthLockoutCheckId, user: AuthLockoutUser, count: number, labelPrefix: string): Promise<CallResult[]> {
    const results: CallResult[] = [];
    for (let i = 1; i <= count; i++) {
      results.push(await this.login(checkId, user, this.nextWrongPassword(), `${labelPrefix} ${user.login}: falha ${i}/${count}`));
    }
    return results;
  }
}

export function describeAttempt(a: AuthLockoutAttempt): string {
  if (a.status === 0) return `sem resposta (${a.error ?? 'erro'})`;
  return `HTTP ${a.status}${a.outcome ? ` → ${a.outcome}` : ''} em ${a.durationMs} ms`;
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function extractToken(body: string): string | undefined {
  try {
    const data = JSON.parse(body);
    const value = data?.accessToken ?? data?.access_token ?? data?.token ?? data?.jwt;
    return typeof value === 'string' && value ? value : undefined;
  } catch {
    return /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/.exec(body)?.[0];
  }
}
