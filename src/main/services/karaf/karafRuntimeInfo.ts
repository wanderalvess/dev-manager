import { KarafJvmMemoryInfo } from '../../../shared/types';
import { parseJmxMemoryOutput, parseKarafInfoOutput, buildJvmMemoryMetrics } from '../../utils/jvmMemoryUtils';
import type { ChunkHandler, KarafActionResult, KarafContext, KarafCredentials } from './karafContext';
import { noopChunk } from './karafContext';

/**
 * Verifica se a feature/bundle foi de fato instalada e está ativa após um deploy,
 * filtrando a saída de "feature:list -i" e "bundle:list" pelo termo informado
 * (artifactId ou nome da feature). Evita depender de flags de filtro nativas do
 * Karaf, que variam entre versões.
 */
export async function verifyInstallation(
  ctx: KarafContext,
  matchTerm: string,
  onChunk: ChunkHandler,
  credentials?: KarafCredentials
): Promise<{ featureInstalled: boolean; featureLines: string[]; bundleLines: string[] }> {
  const featureRes = await ctx.executeKarafCommand('feature:list -i', onChunk, credentials);
  const bundleRes = await ctx.executeKarafCommand('bundle:list', onChunk, credentials);

  const term = matchTerm.trim().toLowerCase();
  const filterLines = (text: string) =>
    text
      .split(/\r?\n/)
      .filter((line) => line.toLowerCase().includes(term))
      .map((line) => line.trim());

  const featureLines = term ? filterLines(featureRes.stdout) : [];
  const bundleLines = term ? filterLines(bundleRes.stdout) : [];

  return {
    featureInstalled: featureLines.length > 0,
    featureLines,
    bundleLines
  };
}

/**
 * Lê o log interno do container Karaf (Pax Logging, via `log:display`) — diferente do
 * stdout do processo embedded persistido em KarafLogPersistenceService: este é o log real
 * da aplicação dentro do OSGi, funciona contra qualquer Karaf acessível por SSH (local ou
 * remoto), e reflete o que os bundles de fato logaram, não a saída do shell interativo.
 */
export async function getKarafLog(
  ctx: KarafContext,
  lines: number,
  credentials?: KarafCredentials
): Promise<{ success: boolean; output: string }> {
  const safeLines = Math.min(Math.max(1, Math.floor(lines) || 200), 5000);
  const res = await ctx.executeKarafCommand(`log:display -n ${safeLines}`, () => {}, credentials);
  // eslint-disable-next-line no-control-regex
  const cleanOutput = (res.stdout || res.stderr || '').replace(/\x1b\[[0-9;]*m/g, '');
  return { success: res.code === 0, output: cleanOutput };
}

/**
 * Obtém métricas de consumo de memória Heap e Non-Heap da JVM do Karaf em tempo real.
 * Tenta primeiramente via JMX MBeans (jmx:read java.lang:type=Memory ...) e, caso não
 * disponível, faz fallback inteligente para o comando nativo "info" do Karaf.
 */
export async function getJvmMemoryMetrics(
  ctx: KarafContext,
  credentials?: KarafCredentials
): Promise<KarafJvmMemoryInfo> {
  const isOnline = await ctx.isKarafRunning(credentials?.port);
  if (!isOnline) {
    throw new Error('Karaf OSGi offline: porta SSH fechada');
  }


  // 1. Tentar ler Heap e Non-Heap via JMX MBeans (feature management do Karaf)
  try {
    const heapJmxRes = await ctx.executeKarafCommand('jmx:read java.lang:type=Memory HeapMemoryUsage', noopChunk, credentials, 15000);
    const heapParsed = parseJmxMemoryOutput(heapJmxRes.stdout);

    if (heapParsed) {
      // Só consulta Non-Heap quando o JMX respondeu ao Heap (evita round-trip SSH inútil)
      const nonHeapJmxRes = await ctx.executeKarafCommand('jmx:read java.lang:type=Memory NonHeapMemoryUsage', noopChunk, credentials, 15000);
      const nonHeapParsed = parseJmxMemoryOutput(nonHeapJmxRes.stdout);

      // Tentar obter threads e uptime via info rápido
      const infoRes = await ctx.executeKarafCommand('info', noopChunk, credentials, 15000);
      const infoParsed = parseKarafInfoOutput(infoRes.stdout);

      return buildJvmMemoryMetrics({
        heapUsedBytes: heapParsed.used,
        heapCommittedBytes: heapParsed.committed,
        heapMaxBytes: heapParsed.max,
        nonHeapUsedBytes: nonHeapParsed?.used,
        nonHeapCommittedBytes: nonHeapParsed?.committed,
        nonHeapMaxBytes: nonHeapParsed?.max,
        liveThreads: infoParsed.liveThreads,
        peakThreads: infoParsed.peakThreads,
        daemonThreads: infoParsed.daemonThreads,
        classesLoaded: infoParsed.classesLoaded,
        uptime: infoParsed.uptime,
        source: 'jmx'
      });
    }
  } catch {
    // Segue para fallback com 'info'
  }

  // 2. Fallback: Comando "info" nativo do Karaf
  const infoRes = await ctx.executeKarafCommand('info', noopChunk, credentials, 20000);
  const infoParsed = parseKarafInfoOutput(infoRes.stdout);

  return buildJvmMemoryMetrics({
    heapUsedBytes: infoParsed.heapUsedBytes,
    heapCommittedBytes: infoParsed.heapCommittedBytes,
    heapMaxBytes: infoParsed.heapMaxBytes,
    liveThreads: infoParsed.liveThreads,
    peakThreads: infoParsed.peakThreads,
    daemonThreads: infoParsed.daemonThreads,
    classesLoaded: infoParsed.classesLoaded,
    uptime: infoParsed.uptime,
    source: 'info'
  });
}

/**
 * Força a execução de Garbage Collection (GC) na JVM do Karaf para liberar memória Heap.
 */
export async function triggerGarbageCollection(
  ctx: KarafContext,
  credentials?: KarafCredentials
): Promise<KarafActionResult> {
  let res = await ctx.executeKarafCommand('jmx:run java.lang:type=Memory gc', noopChunk, credentials, 15000);
  if (res.code !== 0) {
    res = await ctx.executeKarafCommand('system:gc', noopChunk, credentials, 15000);
  }
  return {
    success: res.code === 0,
    output: res.stdout || res.stderr || 'Garbage Collection solicitada à JVM do Karaf.'
  };
}
