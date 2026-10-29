import { execFileSync } from 'child_process';
import type { ServiceState } from '../../../shared/types';
import type { KarafInstallInfo } from '../../../shared/karafInstall';

/** Nome de serviço lido do .conf do yajsw: só letras, números, espaço, ponto, hífen e sublinhado. */
const SAFE_SERVICE_NAME = /^[\w .-]{1,80}$/;

/** `sc query` síncrono e curto: o início do Karaf embutido é síncrono e não pode esperar mais que isso. */
export function queryServiceStateSync(name: string): ServiceState {
  if (process.platform !== 'win32' || !SAFE_SERVICE_NAME.test(name)) return 'UNKNOWN';
  try {
    const stdout = execFileSync('sc.exe', ['query', name], { encoding: 'utf-8', timeout: 3000, windowsHide: true });
    if (stdout.includes('RUNNING')) return 'RUNNING';
    if (stdout.includes('START_PENDING')) return 'START_PENDING';
    if (stdout.includes('STOP_PENDING')) return 'STOP_PENDING';
    if (stdout.includes('STOPPED')) return 'STOPPED';
    return 'UNKNOWN';
  } catch (err) {
    return String((err as { stdout?: string })?.stdout ?? (err as Error)?.message).includes('1060') ? 'NOT_INSTALLED' : 'UNKNOWN';
  }
}

/**
 * O serviço Windows da instalação (o wrapper yajsw sobe o mesmo Karaf, com as mesmas portas e a mesma pasta data/)
 * está de pé: iniciar outro por cima briga pela porta SSH e pelo lock. Devolve a mensagem para o usuário, ou null.
 */
export function serviceBlockingStart(info: KarafInstallInfo, query: (name: string) => ServiceState = queryServiceStateSync): string | null {
  if (!info.service) return null;
  const state = query(info.service.name);
  if (state !== 'RUNNING' && state !== 'START_PENDING') return null;
  const port = info.sshPort ?? 8101;
  return (
    `O serviço Windows "${info.service.name}" já está rodando esta instalação do Karaf (porta SSH ${port}). ` +
    `Pare o serviço antes de iniciar pelo app (services.msc ou "sc stop ${info.service.name}" como administrador), ` +
    'ou use o Karaf do serviço sem iniciar outro.'
  );
}
