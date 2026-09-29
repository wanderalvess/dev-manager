import { KarafJvmMemoryInfo } from '../../shared/types';

/**
 * Converte valor numérico com unidade (kbytes, mbytes, bytes, kb, mb, gb) para bytes.
 */
export function parseMemoryUnitToBytes(rawVal: string): number {
  if (!rawVal) return 0;
  const clean = rawVal.replace(/,/g, '').trim().toLowerCase();
  const match = clean.match(/^([0-9.]+)\s*([a-z]*)$/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const unit = match[2];

  if (unit.startsWith('g')) return Math.round(num * 1024 * 1024 * 1024);
  if (unit.startsWith('m')) return Math.round(num * 1024 * 1024);
  if (unit.startsWith('k')) return Math.round(num * 1024);
  return Math.round(num);
}

/**
 * Analisa a saída de jmx:read java.lang:type=Memory [HeapMemoryUsage|NonHeapMemoryUsage].
 * Exemplo de saída:
 * init = 268435456
 * used = 154321000
 * committed = 536870912
 * max = 1073741824
 */
export function parseJmxMemoryOutput(stdout: string): { init: number; used: number; committed: number; max: number } | null {
  if (!stdout) return null;

  const initMatch = stdout.match(/init\s*=\s*(-?\d+)/i);
  const usedMatch = stdout.match(/used\s*=\s*(-?\d+)/i);
  const committedMatch = stdout.match(/committed\s*=\s*(-?\d+)/i);
  const maxMatch = stdout.match(/max\s*=\s*(-?\d+)/i);

  if (!usedMatch) return null;

  const used = parseInt(usedMatch[1], 10);
  const committed = committedMatch ? parseInt(committedMatch[1], 10) : used;
  const max = maxMatch ? parseInt(maxMatch[1], 10) : -1;
  const init = initMatch ? parseInt(initMatch[1], 10) : 0;

  return { init, used, committed, max };
}

/**
 * Analisa a saída do comando "info" ou "shell:info" do Apache Karaf.
 * Extrai parâmetros de memória Heap, threads, classes e uptime.
 */
export function parseKarafInfoOutput(stdout: string): {
  heapUsedBytes: number;
  heapMaxBytes: number;
  heapCommittedBytes: number;
  liveThreads?: number;
  peakThreads?: number;
  daemonThreads?: number;
  classesLoaded?: number;
  uptime?: string;
} {
  let heapUsedBytes = 0;
  let heapMaxBytes = 0;
  let heapCommittedBytes = 0;
  let liveThreads: number | undefined;
  let peakThreads: number | undefined;
  let daemonThreads: number | undefined;
  let classesLoaded: number | undefined;
  let uptime: string | undefined;

  if (!stdout) {
    return { heapUsedBytes, heapMaxBytes, heapCommittedBytes };
  }

  const lines = stdout.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Memory
    if (/Current heap size/i.test(trimmed)) {
      const parts = trimmed.split(/size\s+/i);
      if (parts[1]) heapUsedBytes = parseMemoryUnitToBytes(parts[1]);
    } else if (/Maximum heap size/i.test(trimmed)) {
      const parts = trimmed.split(/size\s+/i);
      if (parts[1]) heapMaxBytes = parseMemoryUnitToBytes(parts[1]);
    } else if (/Committed heap size/i.test(trimmed)) {
      const parts = trimmed.split(/size\s+/i);
      if (parts[1]) heapCommittedBytes = parseMemoryUnitToBytes(parts[1]);
    }

    // Threads
    else if (/Live threads/i.test(trimmed) && !/Peak/i.test(trimmed)) {
      const numMatch = trimmed.match(/(\d[\d,.]*)/);
      if (numMatch) liveThreads = parseInt(numMatch[1].replace(/[,.]/g, ''), 10);
    } else if (/Peak live threads/i.test(trimmed)) {
      const numMatch = trimmed.match(/(\d[\d,.]*)/);
      if (numMatch) peakThreads = parseInt(numMatch[1].replace(/[,.]/g, ''), 10);
    } else if (/Daemon threads/i.test(trimmed)) {
      const numMatch = trimmed.match(/(\d[\d,.]*)/);
      if (numMatch) daemonThreads = parseInt(numMatch[1].replace(/[,.]/g, ''), 10);
    }

    // Classes
    else if (/Current classes loaded/i.test(trimmed)) {
      const numMatch = trimmed.match(/(\d[\d,.]*)/);
      if (numMatch) classesLoaded = parseInt(numMatch[1].replace(/[,.]/g, ''), 10);
    }

    // Uptime
    else if (/Uptime/i.test(trimmed)) {
      const parts = trimmed.split(/Uptime\s+/i);
      if (parts[1]) uptime = parts[1].trim();
    }
  }

  return {
    heapUsedBytes,
    heapMaxBytes,
    heapCommittedBytes,
    liveThreads,
    peakThreads,
    daemonThreads,
    classesLoaded,
    uptime
  };
}

/**
 * Constrói o objeto consolidado KarafJvmMemoryInfo aplicando cálculos e detecção de risco de OutOfMemoryError.
 */
export function buildJvmMemoryMetrics(params: {
  heapUsedBytes: number;
  heapCommittedBytes: number;
  heapMaxBytes: number;
  nonHeapUsedBytes?: number;
  nonHeapCommittedBytes?: number;
  nonHeapMaxBytes?: number;
  liveThreads?: number;
  peakThreads?: number;
  daemonThreads?: number;
  classesLoaded?: number;
  uptime?: string;
  source: 'jmx' | 'info';
}): KarafJvmMemoryInfo {
  const heapUsedBytes = Math.max(0, params.heapUsedBytes || 0);
  const heapCommittedBytes = Math.max(heapUsedBytes, params.heapCommittedBytes || 0);
  const heapMaxBytes = params.heapMaxBytes && params.heapMaxBytes > 0 ? params.heapMaxBytes : heapCommittedBytes;

  const heapUsedMb = parseFloat((heapUsedBytes / (1024 * 1024)).toFixed(2));
  const heapCommittedMb = parseFloat((heapCommittedBytes / (1024 * 1024)).toFixed(2));
  const heapMaxMb = parseFloat((heapMaxBytes / (1024 * 1024)).toFixed(2));

  const denominator = heapMaxBytes > 0 ? heapMaxBytes : heapCommittedBytes > 0 ? heapCommittedBytes : 1;
  const rawPercent = (heapUsedBytes / denominator) * 100;
  const heapUsagePercent = parseFloat(Math.min(100, Math.max(0, rawPercent)).toFixed(1));

  // Non-Heap (Metaspace / CodeCache)
  let nonHeapUsedBytes = params.nonHeapUsedBytes || 0;
  let nonHeapCommittedBytes = params.nonHeapCommittedBytes || nonHeapUsedBytes;
  let nonHeapMaxBytes = params.nonHeapMaxBytes || -1;

  // Fallback de estimativa caso o comando seja info puro e não traga Non-Heap explicitamente:
  // Baseia-se no número de classes carregadas (~5.5 KB por classe no Metaspace)
  if (nonHeapUsedBytes === 0 && params.classesLoaded && params.classesLoaded > 0) {
    nonHeapUsedBytes = params.classesLoaded * 5600;
    nonHeapCommittedBytes = Math.round(nonHeapUsedBytes * 1.25);
  }

  const nonHeapUsedMb = parseFloat((nonHeapUsedBytes / (1024 * 1024)).toFixed(2));

  // Níveis de alerta e detecção de iminência de OutOfMemoryError
  const isNearOom = heapUsagePercent >= 85;
  let alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
  let alertMessage: string | undefined;

  if (heapUsagePercent >= 85) {
    alertLevel = 'CRITICAL';
    alertMessage = `ALERTA CRÍTICO: Consumo de Heap da JVM em ${heapUsagePercent}% (${heapUsedMb} MB / ${heapMaxMb} MB). Risco iminente de OutOfMemoryError no Karaf!`;
  } else if (heapUsagePercent >= 70) {
    alertLevel = 'WARNING';
    alertMessage = `Atenção: Consumo de Heap elevado (${heapUsagePercent}%). Considere forçar Garbage Collection ou monitorar vazamentos.`;
  }

  return {
    timestamp: Date.now(),
    heapUsedBytes,
    heapCommittedBytes,
    heapMaxBytes,
    heapUsedMb,
    heapCommittedMb,
    heapMaxMb,
    heapUsagePercent,
    nonHeapUsedBytes,
    nonHeapCommittedBytes,
    nonHeapMaxBytes,
    nonHeapUsedMb,
    uptime: params.uptime,
    liveThreads: params.liveThreads,
    peakThreads: params.peakThreads,
    daemonThreads: params.daemonThreads,
    classesLoaded: params.classesLoaded,
    isNearOom,
    alertLevel,
    alertMessage,
    source: params.source
  };
}
