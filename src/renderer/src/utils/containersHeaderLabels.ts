import type { DockerDaemonStatus } from '../../../shared/types';

/** Texto do badge de runtime ativo (WSL, Podman ou Docker Host). */
export function containersHeaderRuntimeLabel(
  daemon: Pick<DockerDaemonStatus, 'isWsl' | 'wslDistro' | 'engine'>
): string {
  if (daemon.isWsl) return `WSL • ${daemon.wslDistro || 'Docker Ativo'}`;
  if (daemon.engine === 'podman') return 'Podman Nativo';
  return 'Docker Host';
}

/** Mensagem do alerta de daemon offline: o erro real tem prioridade sobre o texto padrão. */
export function containersHeaderOfflineMessage(error: string | undefined | null, selectedDistro: string): string {
  return (
    error ||
    `O daemon do Docker está inativo${selectedDistro ? ` na distro WSL "${selectedDistro}"` : ''}. Inicie o serviço para gerenciar containers.`
  );
}
