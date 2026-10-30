import { AUTH_LOCKOUT_CHECKS } from '../../shared/authLockoutCatalog';
import { buildAuthLockoutMarkdown } from '../../shared/authLockoutReport';
import type {
  AuthLockoutCheckResult,
  AuthLockoutDefaults,
  AuthLockoutProgress,
  AuthLockoutRunRequest,
  AuthLockoutRunResult
} from '../../shared/authLockoutTypes';
import type { ConfigService } from './ConfigService';
import { ScenarioHistoryService } from './ScenarioHistoryService';
import { authLockoutDefaults, normalizeLockoutRequest } from './authLockout/lockoutConfig';
import { LockoutAbortedError, LockoutRun } from './authLockout/lockoutRun';
import {
  A_LOCK_CHECKS,
  checkClientSwitch,
  checkConcurrency,
  checkCorrectPasswordWhileLocked,
  checkLogoffBypass,
  checkPerUser,
  checkThreshold,
  lockAccountA,
  preflightFailureReason,
  preflightUser,
  type AccountState
} from './authLockout/lockoutAccountChecks';
import { checkCountWindow, checkLockDuration } from './authLockout/lockoutTimingChecks';
import { checkApiExceptions, checkErrorExposure, checkLogCorrelation, checkLogSinkFailure } from './authLockout/lockoutSurfaceChecks';
import { logFileSize } from './authLockout/lockoutLogSources';
import { logPreflightStart, logRunEnd, logRunStart } from './authLockout/lockoutStory';

/**
 * Teste de bloqueio de login do WinThor: executa as tentativas controladas contra o login do WTA (homologação),
 * na ordem que reaproveita o mesmo bloqueio da conta A, e correlaciona com o winthor.log e a API de logs.
 * Uma execução por vez: duas ao mesmo tempo bloqueariam as mesmas contas e uma estragaria a contagem da outra.
 */
export class AuthLockoutTestService {
  private current: LockoutRun | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly history: ScenarioHistoryService = new ScenarioHistoryService(configService)
  ) {}

  getDefaults(): AuthLockoutDefaults {
    return authLockoutDefaults(this.configService.getSettings());
  }

  isRunning(): boolean {
    return this.current !== null;
  }

  abort(): boolean {
    if (!this.current) return false;
    this.current.abort();
    return true;
  }

  async run(request: AuthLockoutRunRequest, onProgress: (progress: AuthLockoutProgress) => void = () => {}): Promise<AuthLockoutRunResult> {
    const startedAt = new Date().toISOString();
    if (this.current) return this.failure(startedAt, 'Já existe um teste de bloqueio em execução. Aguarde ou interrompa.');
    const normalized = normalizeLockoutRequest(request ?? ({} as AuthLockoutRunRequest), this.configService.getSettings());
    if ('error' in normalized) return this.failure(startedAt, normalized.error);

    const run = new LockoutRun(normalized.config, onProgress);
    this.current = run;
    let error: string | undefined;
    try {
      await this.execute(run);
    } catch (err: any) {
      if (!(err instanceof LockoutAbortedError)) error = err?.message || 'Falha inesperada no teste de bloqueio.';
    } finally {
      this.current = null;
    }
    const result = this.buildResult(run, error);
    await this.history.saveLockout(result);
    return result;
  }

  private async execute(run: LockoutRun): Promise<void> {
    const { config } = run;
    const logOffset = logFileSize(config.logFilePath);
    const state: AccountState = { bReady: false };
    const needsA = A_LOCK_CHECKS.some((id) => run.selected(id)) || run.selected('threshold') || run.selected('count-window');
    const needsB = run.selected('per-user') || run.selected('concurrency');
    logRunStart(run, logOffset);

    if (needsA || (needsB && config.userB)) logPreflightStart(run);
    if (needsA) {
      const a = await preflightUser(run, config.userA, 'usuário A');
      if (a.attempt.outcome !== 'authenticated') {
        throw new Error(
          `O usuário A (${config.userA.login}) não entrou com a senha informada: ${preflightFailureReason(a)}`
        );
      }
    }
    if (needsB && config.userB) {
      const b = await preflightUser(run, config.userB, 'usuário B');
      state.bReady = b.attempt.outcome === 'authenticated';
      if (!state.bReady) state.bFailure = preflightFailureReason(b);
    }

    if (run.selected('threshold')) await checkThreshold(run, state);
    else if (A_LOCK_CHECKS.some((id) => run.selected(id))) await lockAccountA(run, state);

    if (state.aLockedAtMs !== undefined) {
      run.note(`${config.userA.login} está bloqueado: as próximas checagens aproveitam esse mesmo bloqueio.`);
      if (run.selected('correct-password-while-locked')) await checkCorrectPasswordWhileLocked(run);
      if (run.selected('client-switch')) await checkClientSwitch(run);
      // Por usuário antes do logoff: se o logoff limpar o bloqueio, B entraria mesmo com o defeito de bloqueio por origem
      if (run.selected('per-user')) await checkPerUser(run, state);
      if (run.selected('logoff-bypass') && !(await checkLogoffBypass(run)) && run.selected('lock-duration')) {
        await lockAccountA(run, state);
      }
    } else {
      for (const id of ['correct-password-while-locked', 'client-switch', 'per-user', 'logoff-bypass'] as const) {
        if (run.selected(id)) run.setCheck(id, 'skipped', 'A conta A não bloqueou, então não há bloqueio para testar.');
      }
    }
    if (run.selected('concurrency')) await checkConcurrency(run, state);

    const aFree = run.selected('lock-duration') || run.selected('count-window')
      ? await checkLockDuration(run, state.aLockedAtMs, run.selected('lock-duration'))
      : state.aLockedAtMs === undefined;
    if (run.selected('count-window')) {
      if (aFree) await checkCountWindow(run);
      else run.setCheck('count-window', 'skipped', 'A conta A não foi liberada a tempo para medir a janela.');
    }

    if (run.selected('api-exceptions')) await checkApiExceptions(run);
    if (run.selected('log-correlation')) await checkLogCorrelation(run, logOffset, await this.logsAuth(run));
    if (run.selected('log-sink-failure')) await checkLogSinkFailure(run);
    if (run.selected('error-exposure')) await checkErrorExposure(run);
  }

  /**
   * Credencial para ler a API de logs: o login do WTA de Configurações (costuma ter permissão de administrador),
   * depois o cookie salvo e, por último, o token dos usuários de teste obtido no pré-voo.
   */
  private async logsAuth(run: LockoutRun): Promise<Record<string, string> | undefined> {
    const settings = this.configService.getSettings();
    const testLogins = [run.config.userA.login, run.config.userB?.login].filter(Boolean).map((l) => l!.toLowerCase());
    const login = settings.wtaLogin?.trim();
    let token: string | undefined;
    if (login && settings.wtaPassword && !testLogins.includes(login.toLowerCase())) {
      run.note(`Para ler a API de logs, entrando com o login do WTA de Configurações (${login}), que costuma ter permissão de administrador.`);
      run.addPasswordSecret(settings.wtaPassword);
      const r = await run.login(
        'log-correlation',
        { login, password: settings.wtaPassword },
        settings.wtaPassword,
        `Login do WTA de Configurações (${login}) para ler a API de logs`,
        undefined,
        'enter'
      );
      token = r.token;
    }
    const saved = settings.wtaAuthToken?.trim().replace(/^suukie=/, '') || undefined;
    if (!token && saved) run.note('Para ler a API de logs, usando o token do WTA salvo em Configurações.');
    token ??= saved;
    if (!token) {
      token = (run.config.userB && run.tokens.get(run.config.userB.login)) || run.tokens.get(run.config.userA.login);
      if (token) run.note('Para ler a API de logs, usando o token de um usuário de teste obtido no pré-voo (pode não ter permissão).');
    }
    if (!token) return undefined;
    run.secrets.add(token);
    return { Authorization: `Bearer ${token}`, Cookie: `suukie=${token}` };
  }

  private buildResult(run: LockoutRun, error?: string): AuthLockoutRunResult {
    const checks: AuthLockoutCheckResult[] = AUTH_LOCKOUT_CHECKS.map(
      (def) =>
        run.results.get(def.id) ?? {
          id: def.id,
          title: def.title,
          status: 'skipped',
          summary: run.selected(def.id) ? (run.isAborted || error ? 'Não chegou a rodar.' : 'Não executada.') : 'Não selecionada.',
          evidence: []
        }
    );
    logRunEnd(run, checks, error);
    const base = {
      success: !error,
      ...(error ? { error } : {}),
      runId: run.runId,
      startedAt: run.startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      aborted: run.isAborted,
      baseUrl: run.config.baseUrl,
      logsUrl: run.config.logsUrl,
      ...(run.config.logFilePath ? { logFilePath: run.config.logFilePath } : {}),
      checks,
      attempts: run.attempts,
      log: run.log
    };
    return { ...base, markdown: buildAuthLockoutMarkdown(base) };
  }

  private failure(startedAt: string, error: string): AuthLockoutRunResult {
    const defaults = this.getDefaults();
    const base = {
      success: false,
      error,
      runId: '',
      startedAt,
      finishedAt: new Date().toISOString(),
      aborted: false,
      baseUrl: defaults.baseUrl,
      logsUrl: defaults.logsUrl,
      checks: [],
      attempts: [],
      log: []
    };
    return { ...base, markdown: buildAuthLockoutMarkdown(base) };
  }
}
