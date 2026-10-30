import os from 'os';
import {
  NetworkIpInfo,
  NetworkInterfaceItem,
  SystemMetrics,
  HttpHealthResult,
  HttpProbeMethod,
  HttpProbeRequest,
  HttpProbeResult
} from '../../shared/types';
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

  /**
   * Checagem de uma API específica para o monitor da tela Integrações: status, latência, cabeçalhos
   * e o início do corpo. Só GET/HEAD e sem seguir redirect — `isSafeUrl` valida apenas a URL
   * informada, e um 3xx poderia levar a um host bloqueado (ex.: metadados de nuvem).
   */
  public async probeHttpEndpoint(req: HttpProbeRequest): Promise<HttpProbeResult> {
    const url = typeof req?.url === 'string' ? req.url.trim() : '';
    const method: HttpProbeMethod = req?.method === 'HEAD' ? 'HEAD' : 'GET';
    const timeoutMs = clampProbeTimeout(req?.timeoutMs);
    const startTime = Date.now();
    const base: HttpProbeResult = {
      url,
      method,
      ok: false,
      status: 0,
      statusText: '',
      durationMs: 0,
      sizeBytes: 0,
      contentType: '',
      headers: {},
      bodyPreview: '',
      truncated: false,
      checkedAt: startTime
    };

    if (!isSafeUrl(url)) return { ...base, error: 'URL inválida ou não permitida (use http:// ou https://).' };
    const headers = sanitizeProbeHeaders(req?.headers);
    if (typeof headers === 'string') return { ...base, error: headers };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'User-Agent': 'DevManager-ApiMonitor/1.0', Accept: 'application/json, text/plain, */*', ...headers }
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      const { text, sizeBytes, truncated } = method === 'HEAD' ? { text: '', sizeBytes: 0, truncated: false } : await readBodyPreview(response);
      const isRedirect = response.status >= 300 && response.status < 400;

      return {
        ...base,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - startTime,
        sizeBytes,
        contentType: responseHeaders['content-type'] || '',
        headers: responseHeaders,
        bodyPreview: text,
        truncated,
        redirectLocation: isRedirect ? responseHeaders.location : undefined
      };
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      return {
        ...base,
        durationMs: Date.now() - startTime,
        error: aborted ? `Sem resposta em ${Math.round(timeoutMs / 1000)} s.` : describeFetchError(err)
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Limite do corpo guardado no resultado: o suficiente para ver o formato do retorno. */
export const PROBE_BODY_PREVIEW_BYTES = 64 * 1024;
const PROBE_DEFAULT_TIMEOUT_MS = 10_000;
const PROBE_MAX_TIMEOUT_MS = 60_000;
const HEADER_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

function clampProbeTimeout(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return PROBE_DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(Math.round(value), 500), PROBE_MAX_TIMEOUT_MS);
}

/** Devolve os cabeçalhos válidos ou a mensagem de erro do primeiro inválido. */
function sanitizeProbeHeaders(input: unknown): Record<string, string> | string {
  if (!input || typeof input !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const name = rawName.trim();
    if (!name) continue;
    if (!HEADER_NAME.test(name)) return `Nome de cabeçalho inválido: "${name}".`;
    const value = String(rawValue ?? '');
    if (/[\r\n]/.test(value)) return `O valor do cabeçalho "${name}" não pode ter quebra de linha.`;
    result[name] = value;
  }
  return result;
}

async function readBodyPreview(response: Response): Promise<{ text: string; sizeBytes: number; truncated: boolean }> {
  if (!response.body) {
    const text = await response.text();
    const buffer = Buffer.from(text, 'utf-8');
    const truncated = buffer.length > PROBE_BODY_PREVIEW_BYTES;
    const slice = truncated ? buffer.subarray(0, PROBE_BODY_PREVIEW_BYTES) : buffer;
    return { text: slice.toString('utf-8'), sizeBytes: slice.length, truncated };
  }
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let received = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const piece = Buffer.from(value);
    const room = PROBE_BODY_PREVIEW_BYTES - received;
    if (piece.length > room) {
      chunks.push(piece.subarray(0, room));
      received += room;
      truncated = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(piece);
    received += piece.length;
  }
  return { text: Buffer.concat(chunks).toString('utf-8'), sizeBytes: received, truncated };
}

/** O `fetch` do Node esconde o motivo real em `cause` (ECONNREFUSED, ENOTFOUND, certificado...). */
function describeFetchError(err: any): string {
  if (err?.cause?.message === 'bad port' || err?.message === 'bad port') {
    return 'O Node bloqueia a porta desta URL por segurança (lista de portas proibidas do fetch, ex.: 6000).';
  }
  const code = err?.cause?.code || err?.code;
  if (code === 'ECONNREFUSED') return 'Conexão recusada: nada escutando nesse endereço/porta.';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'Host não encontrado (DNS).';
  if (code === 'ECONNRESET') return 'A conexão foi encerrada pelo servidor.';
  if (typeof code === 'string' && /CERT|SSL|TLS/i.test(code)) return `Falha no certificado TLS (${code}).`;
  return err?.cause?.message || err?.message || 'Falha na conexão HTTP';
}
