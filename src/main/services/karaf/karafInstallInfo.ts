import fs from 'fs';
import path from 'path';
import type { KarafInstallInfo, KarafInstallInfoResponse } from '../../../shared/karafInstall';
import type { AppSettings, ServiceState } from '../../../shared/types';
import {
  javaHomeFromBat,
  logFileFromPaxLogging,
  parseProperties,
  resolveKarafVars,
  serviceFromWrapperConf,
  toPort
} from '../../utils/karafInstallParsers';
import { queryServiceStateSync } from './karafServiceGuard';

/** Scripts de início, na ordem em que o app procura (o WinThor usa o winthor.bat; o Karaf puro, o karaf.bat). */
const START_SCRIPTS = ['bin/winthor.bat', 'bin/karaf.bat', 'bin/karaf', 'winthor.bat', 'karaf.bat'];
const WRAPPER_CONFS = ['bin/yajsw/conf/windows-wrapper.conf', 'bin/yajsw/conf/wrapper.conf'];

function readText(root: string, relative: string): string | undefined {
  try {
    return fs.readFileSync(path.join(root, ...relative.split('/')), 'utf-8');
  } catch {
    return undefined;
  }
}

const readProps = (root: string, relative: string) => {
  const text = readText(root, relative);
  return text === undefined ? {} : parseProperties(text);
};

/**
 * Lê da pasta do Karaf o que importa para o app: versão, instância, portas SSH e HTTP, log principal, JDK do script,
 * serviço Windows do wrapper e o repositório Maven local. Só leitura; nunca abre users.properties, keys.properties
 * nem os .cfg com senha. O estado do serviço vem de quem chama (WindowsService).
 */
export function readKarafInstallInfo(root: string | undefined): KarafInstallInfo {
  const base = (root ?? '').trim();
  if (!base) return { root: '', found: false, note: 'Pasta do Karaf não configurada.' };
  if (!fs.existsSync(path.join(base, 'etc'))) {
    return { root: base, found: false, note: 'A pasta não tem etc/: confira se é a raiz da instalação do Karaf.' };
  }

  const shell = readProps(base, 'etc/org.apache.karaf.shell.cfg');
  const web = readProps(base, 'etc/org.ops4j.pax.web.cfg');
  const system = readProps(base, 'etc/system.properties');
  const distribution = readProps(base, 'etc/distribution.info');
  const mvn = readProps(base, 'etc/org.ops4j.pax.url.mvn.cfg');
  const logFile = logFileFromPaxLogging(readProps(base, 'etc/org.ops4j.pax.logging.cfg'), base);
  const startScript = START_SCRIPTS.find((script) => fs.existsSync(path.join(base, ...script.split('/'))));
  const javaHome = startScript ? javaHomeFromBat(readText(base, startScript) ?? '') : undefined;
  const wrapper = WRAPPER_CONFS.map((conf) => readText(base, conf)).find((text) => text !== undefined);
  const service = wrapper ? serviceFromWrapperConf(parseProperties(wrapper)) : undefined;
  const localRepository = mvn['org.ops4j.pax.url.mvn.localRepository'];

  return {
    root: base,
    found: true,
    ...(distribution.karafVersion ? { karafVersion: distribution.karafVersion } : {}),
    ...(system['karaf.name'] ? { instanceName: system['karaf.name'] } : {}),
    ...(toPort(shell.sshPort) ? { sshPort: toPort(shell.sshPort) } : {}),
    ...(toPort(web['org.osgi.service.http.port']) ? { httpPort: toPort(web['org.osgi.service.http.port']) } : {}),
    ...(logFile ? { logFile } : {}),
    ...(javaHome ? { javaHome } : {}),
    ...(startScript ? { startScript } : {}),
    ...(service ? { service } : {}),
    ...(localRepository ? { mavenLocalRepository: resolveKarafVars(localRepository, base) } : {})
  };
}

/** A leitura da instalação para as telas e o MCP, com o estado do serviço Windows do wrapper. O Karaf no WSL não é lido. */
export function getKarafInstallStatus(
  settings: Pick<AppSettings, 'karafPath' | 'karafEnvironment'>,
  queryService: (name: string) => ServiceState = queryServiceStateSync
): KarafInstallInfoResponse {
  if (settings.karafEnvironment === 'wsl') {
    return { success: true, info: { root: settings.karafPath ?? '', found: false, note: 'Karaf no WSL: a leitura do etc/ vale só para instalação no Windows.' } };
  }
  try {
    const info = readKarafInstallInfo(settings.karafPath);
    return { success: true, info: info.service ? { ...info, service: { ...info.service, state: queryService(info.service.name) } } : info };
  } catch (error) {
    return { success: false, error: (error as Error)?.message || 'Falha ao ler a instalação do Karaf.' };
  }
}
