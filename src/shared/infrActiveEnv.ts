/**
 * Ambiente ativo: de todos os ambientes que existem na distro (oracle-<nome>, wta-<nome>, wsh-<nome>),
 * qual o Hub usa. As portas vêm do `docker ps` (nunca de um número fixo), e escolher um ambiente aponta
 * a URL do WTA, a da Rotina 801 e a porta SSH do Karaf das Configurações para ele.
 */
import type { ContainerEnvironment } from './types';
import { isValidWinthorVersion, winthorVersionPorts, type InfrContainerInfo, type InfrEnvironment } from './infrWinthorVersion';

export interface ActiveEnvPorts {
  web?: number;
  ssh?: number;
  jmx?: number;
  jms?: number;
  oracle?: number;
  wsh?: number;
}

export type ActiveEnvStatus = 'up' | 'partial' | 'down';

/** De onde vieram as portas: do docker ps, do padrão por versão (container parado), ou não se sabe. */
export type ActiveEnvPortsSource = 'docker' | 'versao' | 'desconhecida';

export interface ActiveEnvInfo {
  name: string;
  oracle?: InfrContainerInfo;
  wta?: InfrContainerInfo;
  wsh?: InfrContainerInfo;
  ports: ActiveEnvPorts;
  portsSource: ActiveEnvPortsSource;
  /** http://localhost:<porta web do WTA>, quando a porta é conhecida */
  wtaUrl?: string;
  status: ActiveEnvStatus;
}

export interface ActiveEnvChange {
  label: string;
  from?: string;
  to: string;
}

export interface InfrActiveEnvList {
  success: boolean;
  error?: string;
  distro?: string;
  environments: ActiveEnvInfo[];
  /** Ambiente ativo gravado nas Configurações */
  active?: string;
  /** A URL do WTA nas Configurações não é a do ambiente ativo (o container foi recriado ou a URL foi trocada à mão) */
  stale?: boolean;
}

export interface InfrActiveEnvApplyResult {
  success: boolean;
  error?: string;
  env?: ActiveEnvInfo;
  changes: ActiveEnvChange[];
  /** Aviso que não impede de aplicar (ex.: portas pelo padrão da versão porque o WTA está parado) */
  note?: string;
}

/** Porta do host mapeada para uma porta do container, no formato do `docker ps`: "0.0.0.0:8039->8080/tcp, [::]:8039->8080/tcp". */
export function hostPortOf(ports: string | undefined, containerPort: number): number | undefined {
  const m = new RegExp(`(\\d+)->${containerPort}(?=/|,|\\s|$)`).exec(ports ?? '');
  return m ? Number(m[1]) : undefined;
}

/** Primeira porta do host publicada (o WSH publica a mesma porta nos dois lados, a SERVER_PORT do .env). */
export function firstHostPort(ports: string | undefined): number | undefined {
  const m = /(\d+)->\d+/.exec(ports ?? '');
  return m ? Number(m[1]) : undefined;
}

const running = (c?: InfrContainerInfo) => c?.state === 'running';

/** O ambiente com as portas reais do docker ps; com o WTA parado (sem portas), o padrão por versão quando o nome é um número. */
export function describeEnvironment(env: InfrEnvironment): ActiveEnvInfo {
  const ports: ActiveEnvPorts = {
    web: hostPortOf(env.wta?.ports, 8080),
    ssh: hostPortOf(env.wta?.ports, 8101),
    jmx: hostPortOf(env.wta?.ports, 1099),
    jms: hostPortOf(env.wta?.ports, 61616),
    oracle: hostPortOf(env.oracle?.ports, 1521),
    wsh: firstHostPort(env.wsh?.ports)
  };
  let portsSource: ActiveEnvPortsSource = 'docker';
  if (ports.web === undefined) {
    if (isValidWinthorVersion(env.name)) {
      const v = winthorVersionPorts(env.name);
      Object.assign(ports, { web: v.web, ssh: v.ssh, jmx: v.jmx, jms: v.jms, oracle: ports.oracle ?? v.oracle, wsh: ports.wsh ?? v.wsh });
      portsSource = 'versao';
    } else {
      portsSource = 'desconhecida';
    }
  }
  const all = [env.oracle, env.wta, env.wsh];
  let status: ActiveEnvStatus = 'partial';
  if (running(env.oracle) && running(env.wta) && (!env.wsh || running(env.wsh))) status = 'up';
  else if (!all.some(running)) status = 'down';
  return {
    name: env.name,
    oracle: env.oracle,
    wta: env.wta,
    wsh: env.wsh,
    ports,
    portsSource,
    wtaUrl: ports.web ? `http://localhost:${ports.web}` : undefined,
    status
  };
}

/** Oracle, depois WTA, depois WSH, com a espera de sempre entre eles (o listener do Oracle leva uns 2 minutos). */
export function activeEnvGroup(info: ActiveEnvInfo, distro?: string): ContainerEnvironment {
  const containers = [
    info.oracle && { id: info.oracle.name, name: info.oracle.name, delay: 45 },
    info.wta && { id: info.wta.name, name: info.wta.name, delay: 15 },
    info.wsh && { id: info.wsh.name, name: info.wsh.name }
  ].filter((c): c is { id: string; name: string; delay?: number } => !!c);
  return { id: `ativo-${info.name}`, name: info.name, wslDistro: distro, containers };
}

export interface ActiveEnvSettingsView {
  wtaUrl?: string;
  routine801Url?: string;
  karafSshPort?: number;
  wtaPassword?: string;
}

/**
 * O que escolher o ambiente grava nas Configurações. A URL do WTA e a da Rotina 801 passam a ser as dele
 * (o token antigo é de outro WTA e cai sozinho), e a porta SSH do Karaf também. A senha do WTA é a mesma
 * em todos os ambientes: vai de volta no patch porque o ConfigService só a leva junto quando a URL não muda.
 */
export function activeEnvSettingsPatch(
  info: ActiveEnvInfo,
  current: ActiveEnvSettingsView
): { patch: Record<string, string | number>; changes: ActiveEnvChange[] } {
  const patch: Record<string, string | number> = { activeEnvironment: info.name };
  const changes: ActiveEnvChange[] = [];
  if (info.wtaUrl) {
    patch.wtaUrl = info.wtaUrl;
    patch.routine801Url = info.wtaUrl;
    if (current.wtaUrl !== info.wtaUrl) changes.push({ label: 'URL do WTA', from: current.wtaUrl, to: info.wtaUrl });
    if (current.routine801Url !== info.wtaUrl) changes.push({ label: 'URL da Rotina 801', from: current.routine801Url, to: info.wtaUrl });
    if (current.wtaPassword) patch.wtaPassword = current.wtaPassword;
  }
  if (info.ports.ssh) {
    patch.karafSshPort = info.ports.ssh;
    if (current.karafSshPort !== info.ports.ssh) changes.push({ label: 'Porta SSH do Karaf', from: current.karafSshPort ? String(current.karafSshPort) : undefined, to: String(info.ports.ssh) });
  }
  return { patch, changes };
}

/** A URL do WTA das Configurações não bate com a do ambiente ativo. */
export function isActiveEnvStale(info: ActiveEnvInfo | undefined, wtaUrl: string | undefined): boolean {
  return !!info?.wtaUrl && info.wtaUrl !== (wtaUrl ?? '').replace(/\/+$/, '');
}

const STATUS_TEXT: Record<ActiveEnvStatus, string> = { up: 'no ar', partial: 'parcial', down: 'parado' };
export const activeEnvStatusText = (s: ActiveEnvStatus): string => STATUS_TEXT[s];
