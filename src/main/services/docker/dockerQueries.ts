import type {
  DockerContainerInfo,
  DockerContainerInspect,
  DockerContainerStats
} from '../../../shared/types';
import { execFileAsync } from '../../utils/security';
import { buildContainerInspect } from '../../utils/dockerInspectUtils';
import { parseContainerList, parseContainerStats } from '../../utils/dockerOutputParsers';
import type { DockerContext } from './dockerContext';

/**
 * Lista todos os containers locais (em execução e parados).
 */
export async function listContainers(ctx: DockerContext): Promise<DockerContainerInfo[]> {
  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('ps', [
      '-a',
      '--format',
      '{"id":"{{.ID}}","names":"{{.Names}}","image":"{{.Image}}","state":"{{.State}}","status":"{{.Status}}","ports":"{{.Ports}}","created":"{{.CreatedAt}}"}'
    ]);

    const { stdout } = await execFileAsync(binary, finalArgs, {
      timeout: 10000,
      windowsHide: true
    });

    return parseContainerList(stdout);
  } catch (err: any) {
    console.warn('[DockerService] Motor de containers indisponível ou offline:', err?.message || err);
    return [];
  }
}

/**
 * Obtém os logs mais recentes de um container.
 */
export async function getContainerLogs(ctx: DockerContext, containerId: string, lines = 200): Promise<string> {
  if (!ctx.isValidContainerId(containerId)) {
    throw new Error('Identificador de container inválido.');
  }

  const safeLines = Math.min(Math.max(Number(lines) || 200, 10), 1000);

  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('logs', [
      '--tail',
      String(safeLines),
      '--timestamps',
      containerId
    ]);

    const { stdout, stderr } = await execFileAsync(binary, finalArgs, {
      timeout: 12000,
      windowsHide: true,
      maxBuffer: 5 * 1024 * 1024
    });

    return stdout || stderr || '(Sem logs registrados)';
  } catch (err: any) {
    return err.stderr || err.stdout || `Erro ao obter logs: ${err.message}`;
  }
}

/**
 * Obtém as estatísticas de consumo de recursos (CPU, Memória, I/O) dos containers ativos.
 */
export async function getContainerStats(ctx: DockerContext): Promise<DockerContainerStats[]> {
  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('stats', [
      '--no-stream',
      '--format',
      '{"id":"{{.ID}}","name":"{{.Name}}","cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}","memPerc":"{{.MemPerc}}","netIO":"{{.NetIO}}"}'
    ]);

    const { stdout } = await execFileAsync(binary, finalArgs, {
      timeout: 10000,
      windowsHide: true
    });

    return parseContainerStats(stdout);
  } catch {
    return [];
  }
}

/**
 * Executa docker inspect e retorna informações detalhadas de rede, portas, volumes e ambiente.
 */
export async function inspectContainer(
  ctx: DockerContext,
  containerId: string
): Promise<DockerContainerInspect | null> {
  if (!ctx.isValidContainerId(containerId)) {
    throw new Error('Identificador de container inválido.');
  }

  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('inspect', [containerId]);
    const { stdout } = await execFileAsync(binary, finalArgs, {
      timeout: 10000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    });

    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return buildContainerInspect(parsed[0], containerId);
  } catch (err: any) {
    console.error(`[DockerService] Erro ao inspecionar container ${containerId}:`, err);
    return null;
  }
}
