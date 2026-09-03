import net from 'net';
import { PortStatus } from '../../shared/types';

export class NetworkPortScanner {
  /**
   * Verifica se uma porta TCP está em escuta (LISTENING) conectando nela via Socket
   * Funciona tanto no Windows quanto no Linux / Docker
   */
  public static async checkPort(port: number, host: string = '127.0.0.1', timeoutMs: number = 400): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, host);
    });
  }

  /**
   * Verifica a lista de portas monitoradas
   */
  public static async checkMonitoredPorts(
    monitoredPorts: { port: number; label: string; enabled?: boolean }[],
    host: string = '127.0.0.1'
  ): Promise<PortStatus[]> {
    const results: PortStatus[] = [];

    const activePorts = monitoredPorts.filter((p) => p.enabled !== false);

    for (const item of activePorts) {
      try {
        const inUse = await this.checkPort(item.port, host);
        results.push({
          port: item.port,
          label: item.label,
          inUse,
          pid: inUse ? 'Ativo' : undefined
        });
      } catch {
        results.push({
          port: item.port,
          label: item.label,
          inUse: false
        });
      }
    }

    return results;
  }
}
