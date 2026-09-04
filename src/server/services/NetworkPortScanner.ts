import { PortStatus } from '../../shared/types';
import { checkPortOpen } from '../../main/utils/network';

export class NetworkPortScanner {
  /**
   * Verifica se uma porta TCP está em escuta (LISTENING) conectando nela via Socket
   * Funciona tanto no Windows quanto no Linux / Docker
   */
  public static checkPort(port: number, host: string = '127.0.0.1', timeoutMs: number = 400): Promise<boolean> {
    return checkPortOpen(port, host, timeoutMs);
  }

  /**
   * Verifica a lista de portas monitoradas (em paralelo — cada checagem é independente).
   */
  public static async checkMonitoredPorts(
    monitoredPorts: { port: number; label: string; enabled?: boolean }[],
    host: string = '127.0.0.1'
  ): Promise<PortStatus[]> {
    const activePorts = monitoredPorts.filter((p) => p.enabled !== false);

    return Promise.all(
      activePorts.map(async (item) => {
        try {
          const inUse = await this.checkPort(item.port, host);
          return { port: item.port, label: item.label, inUse, pid: inUse ? 'Ativo' : undefined };
        } catch {
          return { port: item.port, label: item.label, inUse: false };
        }
      })
    );
  }
}
