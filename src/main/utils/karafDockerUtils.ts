import type { AppSettings } from '../../shared/types';
import { execFileAsync, isValidIdentifier } from './security';

/**
 * Karaf dentro de um container (o WTA do INFR-Docker). O cliente roda com `docker exec` na distro WSL: não precisa
 * de Karaf instalado no Windows, e fala com o SSH do próprio container (8101), não com a porta publicada no host.
 */

/** Onde o cliente fica na imagem do WTA: o Karaf é o /opt/pcsist/produtos/winthor (o mesmo do C:\pcsist\produtos\winthor no Windows). */
export const KARAF_CONTAINER_CLIENT = '/opt/pcsist/produtos/winthor/bin/client';

const CONTAINER_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

/**
 * Container do Karaf: o informado nas Configurações ou, sem ele, o wta-<ambiente ativo>.
 * Vazio quando nenhum dos dois existe ou o nome não é seguro.
 */
export function karafDockerContainer(settings: Partial<AppSettings>): string {
  const informed = settings.karafDockerContainer?.trim();
  const name = informed || (settings.activeEnvironment?.trim() ? `wta-${settings.activeEnvironment.trim()}` : '');
  return CONTAINER_NAME.test(name) ? name : '';
}

export function isDockerKaraf(settings: Partial<AppSettings>): boolean {
  return settings.karafEnvironment === 'docker' && karafDockerContainer(settings) !== '';
}

/** O que o resto do código recebe no lugar do caminho do cliente quando o Karaf é de um container. */
export const dockerKarafLabel = (container: string): string => `docker:${container}`;

/** Tira o `-a <porta>`: dentro do container o SSH é o 8101, não a porta publicada no host. */
export function stripSshPort(clientArgs: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < clientArgs.length; i++) {
    if (clientArgs[i] === '-a' && i + 1 < clientArgs.length && /^\d+$/.test(clientArgs[i + 1])) {
      i++;
      continue;
    }
    out.push(clientArgs[i]);
  }
  return out;
}

/** wsl.exe -d <distro> -- docker exec <container> <cliente> <args>: sem TTY, o comando roda e sai. */
export function buildDockerClientArgs(distro: string, container: string, clientArgs: string[]): { command: string; args: string[] } {
  return {
    command: 'wsl.exe',
    args: ['-d', distro, '--', 'docker', 'exec', container, KARAF_CONTAINER_CLIENT, ...stripSshPort(clientArgs)]
  };
}

/** A distro do Docker: a das Configurações do Karaf, se houver; senão a que o Hub acha pelo nome e pelo Docker. */
export async function resolveDockerKarafDistro(settings: Partial<AppSettings>): Promise<string> {
  const configured = settings.karafWslDistro?.trim();
  if (configured && isValidIdentifier(configured)) return configured;
  try {
    const { wslService } = await import('../services/WslService');
    const found = await wslService.findDockerWslDistro();
    if (found && isValidIdentifier(found)) return found;
  } catch {
    // Sem WSL ou sem Docker: cai no nome padrão da distro do WinThor
  }
  return 'ubuntu2604-winthor';
}

const portCache = new Map<string, { port?: number; at: number }>();
const PORT_CACHE_MS = 15000;

/** Porta do host publicada para o SSH (8101) do Karaf do container; lida do `docker port`, com cache de 15 s. */
export async function publishedKarafSshPort(distro: string, container: string): Promise<number | undefined> {
  const key = `${distro}/${container}`;
  const hit = portCache.get(key);
  if (hit && Date.now() - hit.at < PORT_CACHE_MS) return hit.port;
  let port: number | undefined;
  try {
    const { stdout } = await execFileAsync('wsl.exe', ['-d', distro, '--', 'docker', 'port', container, '8101'], { timeout: 8000, windowsHide: true });
    port = Number(/:(\d{2,5})\s*$/m.exec(String(stdout))?.[1]) || undefined;
  } catch {
    port = undefined;
  }
  portCache.set(key, { port, at: Date.now() });
  return port;
}
