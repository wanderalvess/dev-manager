import { getKarafSshPort, type AppSettings } from '../../../shared/types';
import type { KarafInstallInfo } from '../../../shared/karafInstall';

export type KarafStopPlan = { kind: 'ports'; ports: number[] } | { kind: 'service'; serviceName: string };

/**
 * O que o "Parar Karaf" pode derrubar. Se o serviço Windows da instalação está rodando, a porta SSH é dele: matar o
 * processo derrubaria o serviço (e o wrapper o subiria de novo), então o botão só avisa. Senão, as portas configuradas
 * no app (SSH e debug), e não 8101/5005 fixos.
 */
export function karafStopPlan(settings: AppSettings | null | undefined, install?: KarafInstallInfo | null): KarafStopPlan {
  if (install?.service && (install.service.state === 'RUNNING' || install.service.state === 'START_PENDING')) {
    return { kind: 'service', serviceName: install.service.name };
  }
  const debugPort = Number(settings?.karafDebugPort) > 0 ? Number(settings?.karafDebugPort) : 5005;
  return { kind: 'ports', ports: [...new Set([debugPort, getKarafSshPort(settings)])] };
}
