/**
 * Subir um ambiente esperando: Oracle só libera o WTA quando o banco está saudável, e o WSH só sobe depois que a
 * API do WinThor do WTA responde e o login entra (sem a configuração inicial do WTA o WSH reinicia em loop com
 * "Versão exigida ... Versão instalada"). Aqui fica a parte pura: critérios de pronto, decisões e textos.
 */
import type { ActiveEnvInfo } from './infrActiveEnv';

export const ORACLE_READY_TIMEOUT_S = 360;
export const WTA_READY_TIMEOUT_S = 360;
/** O WSH tem de ficar rodando, sem reiniciar, por este tempo para contar como no ar */
export const WSH_STABLE_S = 30;
export const WSH_GIVE_UP_S = 90;
export const POLL_S = 5;

export type EnvRole = 'oracle' | 'wta' | 'wsh';

export interface StartProgress {
  currentName: string;
  index: number;
  total: number;
  waitingSeconds?: number;
  /** O que o Hub está esperando agora (ex.: o banco ficar saudável), com o tempo */
  message?: string;
}

export interface StartEnvResult {
  success: boolean;
  error?: string;
  failed?: string;
  /** Containers que o Hub iniciou (os que já estavam no ar não entram) */
  started: string[];
  /** Avisos que não são falha: o WSH que não subiu e por quê... */
  notes: string[];
}

export interface StartPlanItem {
  role: EnvRole;
  name: string;
}

/** Oracle, WTA e WSH, nessa ordem, só os que existem no ambiente (um ambiente pode usar um Oracle de outro nome). */
export function startPlan(info: ActiveEnvInfo): StartPlanItem[] {
  return (
    [
      info.oracle && { role: 'oracle', name: info.oracle.name },
      info.wta && { role: 'wta', name: info.wta.name },
      info.wsh && { role: 'wsh', name: info.wsh.name }
    ] as (StartPlanItem | undefined)[]
  ).filter((i): i is StartPlanItem => !!i);
}

export type Readiness = 'ready' | 'waiting' | 'failed';

/** Banco: o healthcheck da imagem (checkDBStatus.sh) diz quando o listener e a instância estão de pé. Sem healthcheck, rodando basta. */
export function oracleReadiness(state: string | undefined, health: string | undefined): Readiness {
  if (state === 'exited' || state === 'dead' || state === 'created') return 'failed';
  if (state !== 'running') return 'waiting';
  if (!health || health === 'healthy') return 'ready';
  return 'waiting';
}

export type WtaApi = 'up' | 'booting' | 'down';

/**
 * WTA: a raiz responde antes de a API do WinThor subir. Com a API respondendo (nem 404 nem 5xx) está no ar;
 * só a raiz respondendo é o Karaf ainda carregando as features (ou a configuração inicial pendente).
 */
export function wtaApiState(rootStatus: number | undefined, apiStatus: number | undefined): WtaApi {
  if (apiStatus !== undefined && apiStatus < 500 && apiStatus !== 404) return 'up';
  if (rootStatus !== undefined && rootStatus < 500) return 'booting';
  return 'down';
}

export interface WshSample {
  state: string;
  restarts: number;
}

/** WSH: rodando e sem reiniciar desde a primeira leitura é estável; reiniciando ou com reinícios novos, não. */
export function wshStability(samples: WshSample[]): 'stable' | 'restarting' | 'unknown' {
  if (samples.length === 0) return 'unknown';
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (last.state === 'restarting' || last.state === 'exited' || last.state === 'dead' || last.restarts > first.restarts) return 'restarting';
  return last.state === 'running' ? 'stable' : 'unknown';
}

export interface WtaLogin {
  ok: boolean;
  needsCredentials?: boolean;
  error?: string;
}

/** Sobe o WSH? Só com a API do WinThor no ar e o login entrando; sem credenciais para conferir, sobe e avisa. */
export function wshDecision(apiUp: boolean, login: WtaLogin | undefined): { start: boolean; note?: string } {
  if (!apiUp) {
    return {
      start: false,
      note: 'A API do WinThor do WTA ainda não respondeu (o Karaf pode estar carregando, ou falta a configuração inicial em /instalador). O WSH não foi iniciado: sem isso ele reinicia em loop com "Versão exigida". Suba o WSH depois.'
    };
  }
  if (login?.ok) return { start: true };
  if (!login || login.needsCredentials) {
    return {
      start: true,
      note: 'Sem usuário e senha do WTA nas Configurações, o Hub não conferiu a configuração inicial. Se o WSH reiniciar com "Versão exigida", conclua o /instalador do WTA.'
    };
  }
  return {
    start: false,
    note: `O login do WTA foi recusado (${login.error ?? 'sem detalhe'}): confira a senha nas Configurações ou conclua a configuração inicial em /instalador. O WSH não foi iniciado.`
  };
}

export const formatWait = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.max(0, Math.floor(seconds % 60))).padStart(2, '0')}`;
