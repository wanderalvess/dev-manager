import { isValidIdentifier } from '../../utils/security';
import { execWsl } from '../../utils/wslExec';
import { httpRequest } from '../../utils/httpRequest';
import { commandFailureDetail } from '../../../shared/infrNewVersionScripts';
import { isValidEnvName, type InfrEnvironmentsResult } from '../../../shared/infrWinthorVersion';
import { describeEnvironment } from '../../../shared/infrActiveEnv';
import {
  ORACLE_READY_TIMEOUT_S,
  POLL_S,
  WSH_GIVE_UP_S,
  WSH_STABLE_S,
  WTA_READY_TIMEOUT_S,
  formatWait,
  oracleReadiness,
  startPlan,
  wshDecision,
  wshStability,
  wtaApiState,
  type StartEnvResult,
  type StartProgress,
  type WshSample,
  type WtaLogin
} from '../../../shared/infrEnvStart';

export type { StartEnvResult, StartProgress };

export interface StartEnvDeps {
  listEnvironments: (distro?: string) => Promise<InfrEnvironmentsResult>;
  /** Roda um script bash na distro (com limite de tempo) e devolve o stdout */
  run: (distro: string, script: string, timeoutMs: number) => Promise<string>;
  httpStatus: (url: string, method: 'GET' | 'OPTIONS') => Promise<number | undefined>;
  login: (url: string) => Promise<WtaLogin>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

interface Inspect {
  exists: boolean;
  state?: string;
  health?: string;
  restarts: number;
}

const INSPECT_FORMAT = "'{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}|{{.RestartCount}}'";

/**
 * Sobe um ambiente na ordem certa e espera cada parte ficar pronta: o banco saudável, o WTA com a API do WinThor
 * respondendo e o login entrando, e só então o WSH (que reinicia em loop sem a configuração inicial do WTA).
 * Cada espera tem limite, e o que não subiu volta em `notes` com o motivo.
 */
export class InfrStartEnvService {
  constructor(private readonly d: StartEnvDeps) {}

  /** As dependências de verdade: wsl.exe com o docker da distro, HTTP direto e o login do WTA. */
  public static withDefaults(
    listEnvironments: StartEnvDeps['listEnvironments'],
    login: (url: string) => Promise<WtaLogin>
  ): InfrStartEnvService {
    return new InfrStartEnvService({
      listEnvironments,
      login,
      run: async (distro, script, timeoutMs) => {
        const { stdout } = await execWsl(['-d', distro, '--', 'bash', '-c', script], { timeout: timeoutMs });
        return stdout;
      },
      httpStatus: async (url, method) => {
        try {
          return (await httpRequest(url, { method, headers: {}, timeout: 5000 })).status;
        } catch {
          return undefined;
        }
      },
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      now: () => Date.now()
    });
  }

  private async inspect(distro: string, name: string): Promise<Inspect> {
    const out = (await this.d.run(distro, `timeout 10 docker inspect -f ${INSPECT_FORMAT} ${name} 2>/dev/null || echo MISSING`, 20000)).trim();
    if (!out || out === 'MISSING') return { exists: false, restarts: 0 };
    const [state, health, restarts] = out.split('|');
    return { exists: true, state, health, restarts: Number(restarts) || 0 };
  }

  /** Porta do host publicada para a 8080 do WTA (`docker port` devolve 0.0.0.0:8039). */
  private async publishedPort(distro: string, name: string): Promise<number | undefined> {
    try {
      const out = await this.d.run(distro, `timeout 10 docker port ${name} 8080 2>/dev/null | head -1`, 20000);
      return Number(/:(\d{2,5})\s*$/m.exec(out)?.[1]) || undefined;
    } catch {
      return undefined;
    }
  }

  private async logTail(distro: string, name: string): Promise<string> {
    try {
      return (await this.d.run(distro, `timeout 10 docker logs --tail 6 ${name} 2>&1`, 20000)).trim().split(/\r?\n/).slice(-6).join('\n');
    } catch {
      return '';
    }
  }

  public async start(req: { distro?: string; name: string }, onProgress: (p: StartProgress) => void = () => {}): Promise<StartEnvResult> {
    const fail = (error: string, failed?: string, started: string[] = [], notes: string[] = []): StartEnvResult => ({ success: false, error, failed, started, notes });
    if (!isValidEnvName(req.name)) return fail('Nome de ambiente inválido.');
    if (req.distro && !isValidIdentifier(req.distro)) return fail('Distro WSL inválida.');

    const listed = await this.d.listEnvironments(req.distro);
    if (!listed.success) return fail(listed.error ?? 'Não foi possível listar os ambientes da distro.');
    const distro = listed.distro ?? req.distro;
    const found = listed.environments.find((e) => e.name === req.name.trim());
    if (!distro || !found) return fail(`O ambiente ${req.name} não existe na distro (precisa de um container wta-${req.name}).`);

    const info = describeEnvironment(found);
    const plan = startPlan(info);
    const started: string[] = [];
    const notes: string[] = [];
    let wtaUrl = info.wtaUrl;
    let apiUp = false;

    for (let i = 0; i < plan.length; i++) {
      const { role, name } = plan[i];
      const step = (message: string, waitingSeconds?: number) => onProgress({ currentName: name, index: i + 1, total: plan.length, message, waitingSeconds });

      try {
        if (role === 'wsh') {
          const decision = wshDecision(apiUp, apiUp && wtaUrl ? await this.d.login(wtaUrl) : undefined);
          if (decision.note) notes.push(decision.note);
          if (!decision.start) continue;
        }

        step('Conferindo o container');
        const before = await this.inspect(distro, name);
        if (before.state !== 'running') {
          step('Iniciando o container');
          await this.d.run(distro, `timeout 20 docker start ${name}`, 30000);
          started.push(name);
        }

        if (role === 'oracle') {
          const err = await this.waitOracle(distro, name, step);
          if (err) return fail(err, name, started, notes);
        } else if (role === 'wta') {
          const wta = await this.waitWta(distro, name, wtaUrl, step);
          if (wta.error) return fail(wta.error, name, started, notes);
          wtaUrl = wta.url ?? wtaUrl;
          apiUp = wta.apiUp;
          if (!apiUp && wta.note) notes.push(wta.note);
        } else {
          const err = await this.waitWsh(distro, name, step, notes);
          if (err) return fail(err, name, started, notes);
        }
      } catch (err: any) {
        return fail(`Falha ao subir ${name}: ${commandFailureDetail(err)}`, name, started, notes);
      }
    }
    return { success: true, started, notes };
  }

  private async waitOracle(distro: string, name: string, step: (m: string, w?: number) => void): Promise<string | undefined> {
    const begin = this.d.now();
    for (;;) {
      const s = await this.inspect(distro, name);
      const verdict = oracleReadiness(s.state, s.health);
      const elapsed = Math.floor((this.d.now() - begin) / 1000);
      if (verdict === 'ready') return undefined;
      if (verdict === 'failed') return `O banco ${name} parou (${s.state}). Fim do log:\n${await this.logTail(distro, name)}`;
      if (elapsed >= ORACLE_READY_TIMEOUT_S) return `O banco ${name} não ficou pronto em ${formatWait(ORACLE_READY_TIMEOUT_S)} (healthcheck: ${s.health || 'sem resposta'}). Veja o log: docker logs ${name}`;
      step(`Esperando o banco ficar pronto (healthcheck ${s.health || 'aguardando'}, ${formatWait(elapsed)})`);
      await this.d.sleep(POLL_S * 1000);
    }
  }

  private async waitWta(
    distro: string,
    name: string,
    knownUrl: string | undefined,
    step: (m: string, w?: number) => void
  ): Promise<{ apiUp: boolean; url?: string; error?: string; note?: string }> {
    const begin = this.d.now();
    let url = knownUrl;
    let lastRoot: number | undefined;
    for (;;) {
      const elapsed = Math.floor((this.d.now() - begin) / 1000);
      // A porta publicada vale mais que a da configuração: o container pode ter sido recriado
      const mapped = await this.publishedPort(distro, name);
      if (mapped) url = `http://localhost:${mapped}`;
      if (url) {
        lastRoot = await this.d.httpStatus(`${url}/`, 'GET');
        const api = await this.d.httpStatus(`${url}/winthor/autenticacao/v1/login`, 'OPTIONS');
        const state = wtaApiState(lastRoot, api);
        if (state === 'up') return { apiUp: true, url };
        step(state === 'booting' ? `O Karaf responde; esperando a API do WinThor subir (${formatWait(elapsed)})` : `Esperando o WTA responder (${formatWait(elapsed)})`);
      } else {
        step(`Esperando a porta do WTA ser publicada (${formatWait(elapsed)})`);
      }
      const s = await this.inspect(distro, name);
      if (s.state === 'exited' || s.state === 'dead') return { apiUp: false, error: `O WTA ${name} parou (${s.state}). Fim do log:\n${await this.logTail(distro, name)}` };
      if (elapsed >= WTA_READY_TIMEOUT_S) {
        if (lastRoot !== undefined && lastRoot < 500) {
          return { apiUp: false, url, note: `O WTA ${name} responde, mas a API do WinThor não subiu em ${formatWait(WTA_READY_TIMEOUT_S)}: o Karaf ainda carrega as features ou falta a configuração inicial em ${url}/instalador.` };
        }
        return { apiUp: false, url, error: `O WTA ${name} não respondeu em ${formatWait(WTA_READY_TIMEOUT_S)}. Veja o log: docker logs ${name}` };
      }
      await this.d.sleep(POLL_S * 1000);
    }
  }

  private async waitWsh(distro: string, name: string, step: (m: string, w?: number) => void, notes: string[]): Promise<string | undefined> {
    const begin = this.d.now();
    const samples: WshSample[] = [];
    for (;;) {
      const s = await this.inspect(distro, name);
      samples.push({ state: s.state ?? 'unknown', restarts: s.restarts });
      const elapsed = Math.floor((this.d.now() - begin) / 1000);
      if (wshStability(samples) === 'restarting') {
        const tail = await this.logTail(distro, name);
        const versao = /Vers[aã]o exigida/i.test(tail) ? ' Alguma feature do WTA está abaixo da versão mínima que o jar do WSH exige.' : '';
        return `O WSH ${name} está reiniciando.${versao} Fim do log:\n${tail}`;
      }
      if (elapsed >= WSH_STABLE_S && wshStability(samples) === 'stable') return undefined;
      if (elapsed >= WSH_GIVE_UP_S) {
        notes.push(`Não deu para confirmar que o WSH ${name} ficou estável.`);
        return undefined;
      }
      step(`Conferindo se o WSH fica no ar sem reiniciar (${formatWait(elapsed)} de ${formatWait(WSH_STABLE_S)})`);
      await this.d.sleep(POLL_S * 1000);
    }
  }
}
