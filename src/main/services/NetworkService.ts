import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { NetworkIpInfo, NetworkInterfaceItem } from '../../shared/types';

const execFileAsync = promisify(execFile);

export class NetworkService {
  /**
   * Obtém a lista de interfaces de rede ativas com IPv4, o IP local principal
   * e o IP da distribuição WSL2 (se ativa).
   */
  public async getNetworkIps(): Promise<NetworkIpInfo> {
    const interfaces = os.networkInterfaces();
    const localIps: NetworkInterfaceItem[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        // Suporta Node 18/20 onde family pode ser 'IPv4' ou 4
        const isIpv4 = addr.family === 'IPv4' || (addr.family as any) === 4;
        if (isIpv4 && !addr.internal) {
          // Ignora endereços APIPA (169.254.x.x)
          if (addr.address.startsWith('169.254.')) continue;

          let ifaceType = 'LAN';
          const lowerName = name.toLowerCase();
          if (lowerName.includes('wi-fi') || lowerName.includes('wireless') || lowerName.includes('wlan')) {
            ifaceType = 'Wi-Fi';
          } else if (lowerName.includes('ethernet') || lowerName.includes('eth')) {
            ifaceType = 'Ethernet';
          } else if (lowerName.includes('wsl') || lowerName.includes('hyper-v') || lowerName.includes('vethernet')) {
            ifaceType = 'Virtual (WSL/Hyper-V)';
          } else if (lowerName.includes('tailscale') || lowerName.includes('vpn')) {
            ifaceType = 'VPN';
          }

          localIps.push({
            interface: name,
            ip: addr.address,
            mac: addr.mac,
            type: ifaceType
          });
        }
      }
    }

    // Selecionar o IP principal da máquina física (priorizando Wi-Fi ou Ethernet sobre adaptadores virtuais)
    let primaryLocalIp = '127.0.0.1';
    const physical = localIps.find(
      (item) => item.type === 'Wi-Fi' || (item.type === 'Ethernet' && !item.interface.toLowerCase().includes('vethernet'))
    );

    if (physical) {
      primaryLocalIp = physical.ip;
    } else if (localIps.length > 0) {
      primaryLocalIp = localIps[0].ip;
    }

    // Tentar obter o IP da máquina virtual WSL
    const wslIp = await this.detectWslIp();

    return {
      primaryLocalIp,
      localIps,
      wslIp,
      hostname: os.hostname()
    };
  }

  /**
   * Executa comando para obter o IP atribuído à interface eth0 do WSL2.
   */
  public async detectWslIp(): Promise<string | null> {
    if (process.platform !== 'win32') {
      return null;
    }

    try {
      // Método 1: hostname -I no WSL
      const { stdout } = await execFileAsync('wsl.exe', ['hostname', '-I'], {
        timeout: 4000,
        windowsHide: true
      });

      const ips = stdout.trim().split(/\s+/);
      const ipv4 = ips.find((ip) => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip) && !ip.startsWith('127.'));
      if (ipv4) {
        return ipv4;
      }
    } catch {
      // WSL pode estar desligado ou não instalado
    }

    try {
      // Método 2: wsl -e ip -4 addr show eth0
      const { stdout } = await execFileAsync('wsl.exe', ['-e', 'ip', '-4', 'addr', 'show', 'eth0'], {
        timeout: 4000,
        windowsHide: true
      });

      const match = stdout.match(/inet\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (match && match[1]) {
        return match[1];
      }
    } catch {
      // Ignora falha silenciosamente
    }

    return null;
  }
}
