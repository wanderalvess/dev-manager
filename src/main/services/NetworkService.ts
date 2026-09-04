import os from 'os';
import { NetworkIpInfo, NetworkInterfaceItem, SystemMetrics, HttpHealthResult } from '../../shared/types';
import { execFileAsync, isSafeUrl } from '../utils/security';

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

  private cachedWslIp: { ip: string | null; checkedAt: number } | null = null;
  private isDetectingWsl = false;
  private lastCpuMeasure: { idle: number; total: number; time: number } | null = null;

  /**
   * Executa comando para obter o IP atribuído à interface eth0 do WSL2.
   * Utiliza cache em memória, verificação prévia de placa de rede virtual do WSL
   * e timeout com Promise.race para evitar travamento da fila de processos no Windows.
   */
  public async detectWslIp(): Promise<string | null> {
    if (process.platform !== 'win32') {
      return null;
    }

    // Retorna cache de até 60 segundos se válido
    if (this.cachedWslIp && Date.now() - this.cachedWslIp.checkedAt < 60_000) {
      return this.cachedWslIp.ip;
    }

    // Evita múltiplas chamadas concorrentes a wsl.exe caso já haja uma rodando
    if (this.isDetectingWsl) {
      return this.cachedWslIp?.ip ?? null;
    }

    // Checagem em memória: se nenhuma interface de rede tiver 'wsl' no nome,
    // o subsistema WSL2 nem sequer possui placa virtual ativa no Windows.
    const ifaces = os.networkInterfaces();
    const hasWslAdapter = Object.keys(ifaces).some((name) =>
      name.toLowerCase().includes('wsl')
    );

    if (!hasWslAdapter) {
      this.cachedWslIp = { ip: null, checkedAt: Date.now() };
      return null;
    }

    this.isDetectingWsl = true;
    try {
      const runWsl = async (): Promise<string | null> => {
        try {
          const { stdout } = await execFileAsync('wsl.exe', ['hostname', '-I'], {
            timeout: 1500,
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
          const { stdout } = await execFileAsync('wsl.exe', ['-e', 'ip', '-4', 'addr', 'show', 'eth0'], {
            timeout: 1200,
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
      };

      // Trava de segurança absoluta em JS para garantir retorno rápido mesmo se o processo filho travar no Windows
      const timeoutGuard = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
      const detected = await Promise.race([runWsl(), timeoutGuard]);

      this.cachedWslIp = { ip: detected, checkedAt: Date.now() };
      return detected;
    } catch {
      this.cachedWslIp = { ip: null, checkedAt: Date.now() };
      return null;
    } finally {
      this.isDetectingWsl = false;
    }
  }

  /**
   * Coleta métricas de consumo de CPU, RAM e tempo de atividade da máquina.
   */
  public async getSystemMetrics(): Promise<SystemMetrics> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const totalMemMb = Math.round(totalMem / (1024 * 1024));
    const freeMemMb = Math.round(freeMem / (1024 * 1024));
    const usedMemMb = Math.round(usedMem / (1024 * 1024));
    const memUsagePercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;
    const uptimeSeconds = Math.round(os.uptime());

    let cpuUsagePercent = 0;
    try {
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      for (const cpu of cpus) {
        for (const type in cpu.times) {
          totalTick += (cpu.times as any)[type];
        }
        totalIdle += cpu.times.idle;
      }

      if (this.lastCpuMeasure) {
        const idleDelta = totalIdle - this.lastCpuMeasure.idle;
        const totalDelta = totalTick - this.lastCpuMeasure.total;
        if (totalDelta > 0) {
          cpuUsagePercent = Math.min(100, Math.max(0, Math.round((1 - idleDelta / totalDelta) * 100)));
        }
      } else {
        const busy = totalTick - totalIdle;
        if (totalTick > 0) {
          cpuUsagePercent = Math.min(100, Math.max(0, Math.round((busy / totalTick) * 100)));
        }
      }
      this.lastCpuMeasure = { idle: totalIdle, total: totalTick, time: Date.now() };
    } catch {
      cpuUsagePercent = 0;
    }

    return {
      cpuUsagePercent,
      totalMemMb,
      freeMemMb,
      usedMemMb,
      memUsagePercent,
      uptimeSeconds,
      totalMemoryMb: totalMemMb,
      freeMemoryMb: freeMemMb,
      usedMemoryMb: usedMemMb,
      memoryUsagePercent: memUsagePercent
    };
  }

  /**
   * Executa checagem HTTP ativa em endpoint (ex: status 200, latência em ms).
   */
  public async checkHttpHealth(url: string, timeoutMs = 3500): Promise<HttpHealthResult> {
    const startTime = Date.now();
    if (!isSafeUrl(url)) {
      return {
        url,
        reachable: false,
        isHealthy: false,
        timeMs: 0,
        responseTimeMs: 0,
        error: 'URL insegura ou não permitida.'
      };
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'DevManager-Healthcheck/1.0' }
      });
      clearTimeout(timer);

      const timeMs = Date.now() - startTime;
      const isHealthy = response.ok;
      return {
        url,
        reachable: isHealthy,
        isHealthy,
        status: response.status,
        statusCode: response.status,
        statusText: response.statusText,
        timeMs,
        responseTimeMs: timeMs
      };
    } catch (err: any) {
      const timeMs = Date.now() - startTime;
      return {
        url,
        reachable: false,
        isHealthy: false,
        timeMs,
        responseTimeMs: timeMs,
        error: err?.message || 'Falha na conexão HTTP'
      };
    }
  }
}
