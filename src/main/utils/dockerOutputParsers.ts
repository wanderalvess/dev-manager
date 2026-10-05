import type {
  ComposeServiceStatus,
  DockerContainerInfo,
  DockerContainerStats
} from '../../shared/types';

const KNOWN_CONTAINER_STATES = ['running', 'exited', 'paused', 'restarting', 'created', 'dead'];

/** Divide a saída do CLI em linhas não vazias (cada linha é um objeto JSON). */
function splitNonEmptyLines(stdout: string): string[] {
  return stdout.trim().split('\n').filter((l) => l.trim().length > 0);
}

/**
 * Interpreta a saída de `ps -a --format` (um JSON por linha). Linhas com JSON inválido são ignoradas
 * e estados desconhecidos viram 'unknown'.
 */
export function parseContainerList(stdout: string): DockerContainerInfo[] {
  const containers: DockerContainerInfo[] = [];

  for (const line of splitNonEmptyLines(stdout)) {
    try {
      const parsed = JSON.parse(line);
      let state = (parsed.state || 'unknown').toLowerCase();
      if (!KNOWN_CONTAINER_STATES.includes(state)) {
        state = 'unknown';
      }

      containers.push({
        id: parsed.id || '',
        names: parsed.names || '',
        image: parsed.image || '',
        state: state as any,
        status: parsed.status || '',
        ports: parsed.ports || '',
        created: parsed.created || ''
      });
    } catch {
      // Ignora linha com parse inválido
    }
  }

  return containers;
}

/** Interpreta a saída de `stats --no-stream --format` (um JSON por linha). */
export function parseContainerStats(stdout: string): DockerContainerStats[] {
  const stats: DockerContainerStats[] = [];

  for (const line of splitNonEmptyLines(stdout)) {
    try {
      const parsed = JSON.parse(line);
      stats.push({
        id: parsed.id || '',
        name: parsed.name || '',
        cpu: parsed.cpu || '0%',
        mem: parsed.mem || '0B',
        memPerc: parsed.memPerc || '0%',
        netIO: parsed.netIO || '0B'
      });
    } catch {
      // Linha ignorada
    }
  }

  return stats;
}

/** Interpreta a saída de `compose ps --format json` (um JSON por linha). */
export function parseComposeStatus(stdout: string): ComposeServiceStatus[] {
  const services: ComposeServiceStatus[] = [];

  for (const line of splitNonEmptyLines(stdout)) {
    try {
      const parsed = JSON.parse(line);
      const publishers = Array.isArray(parsed.Publishers) ? parsed.Publishers : [];
      services.push({
        name: parsed.Service || parsed.Name || '',
        state: parsed.State || parsed.Status || 'unknown',
        health: parsed.Health || undefined,
        ports: publishers.length > 0
          ? publishers.map((p: any) => `${p.PublishedPort || ''}:${p.TargetPort || ''}`)
          : undefined
      });
    } catch {
      // Ignora linha inválida
    }
  }

  return services;
}
