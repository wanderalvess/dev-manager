/**
 * O que a própria instalação do Karaf diz de si (etc/, bin/ e o wrapper do serviço Windows), para o app não depender de
 * portas e caminhos digitados à mão. Lido do disco, só leitura; nunca inclui senha, chave nem usuário do users.properties.
 */

import type { ServiceState } from './types';

export interface KarafInstallService {
  /** wrapper.ntservice.name do yajsw ("WinThor"). */
  name: string;
  displayName?: string;
  state?: ServiceState;
}

export interface KarafInstallInfo {
  root: string;
  /** Achou etc/ dentro da pasta: é uma instalação do Karaf. */
  found: boolean;
  karafVersion?: string;
  instanceName?: string;
  sshPort?: number;
  httpPort?: number;
  /** Log principal, já com ${karaf.data} resolvido (winthor.log na distribuição do WinThor). */
  logFile?: string;
  /** JAVA_HOME fixado no script de início (bin/winthor.bat). */
  javaHome?: string;
  /** Script de início encontrado, relativo à pasta (bin/winthor.bat, bin/karaf.bat...). */
  startScript?: string;
  service?: KarafInstallService;
  /** org.ops4j.pax.url.mvn.localRepository, quando definido; senão o Karaf usa o .m2 do usuário que roda o processo. */
  mavenLocalRepository?: string;
  /** Por que não deu para ler (pasta vazia, Karaf no WSL...). */
  note?: string;
}

export type KarafInstallInfoResponse = { success: true; info: KarafInstallInfo } | { success: false; error: string };

export interface KarafSettingsMismatch {
  field: 'karafSshPort' | 'jdkPath' | 'wtaUrl';
  label: string;
  configured: string;
  installed: string;
}

interface ComparableSettings {
  karafSshPort?: number;
  jdkPath?: string;
  wtaUrl?: string;
}

const samePath = (a: string, b: string) => a.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase() === b.replace(/[\\/]+$/, '').replace(/\\/g, '/').toLowerCase();

const urlPort = (url: string): number | undefined => {
  try {
    const parsed = new URL(url);
    return parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
  } catch {
    return undefined;
  }
};

/** O que está configurado no app e difere do que a instalação diz. Campo vazio no app usa o padrão: compara com ele. */
export function karafSettingsMismatches(info: KarafInstallInfo, settings: ComparableSettings): KarafSettingsMismatch[] {
  const mismatches: KarafSettingsMismatch[] = [];
  const configuredSsh = Number(settings.karafSshPort) > 0 ? Number(settings.karafSshPort) : 8101;
  if (info.sshPort && info.sshPort !== configuredSsh) {
    mismatches.push({ field: 'karafSshPort', label: 'Porta SSH', configured: String(configuredSsh), installed: String(info.sshPort) });
  }
  if (info.javaHome && settings.jdkPath && !samePath(info.javaHome, settings.jdkPath)) {
    mismatches.push({ field: 'jdkPath', label: 'JDK', configured: settings.jdkPath, installed: info.javaHome });
  }
  const wtaPort = settings.wtaUrl ? urlPort(settings.wtaUrl) : undefined;
  if (info.httpPort && wtaPort !== undefined && wtaPort !== info.httpPort) {
    mismatches.push({ field: 'wtaUrl', label: 'Porta HTTP do WTA', configured: settings.wtaUrl ?? '', installed: `http://localhost:${info.httpPort}` });
  }
  return mismatches;
}
