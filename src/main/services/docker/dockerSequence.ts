import type { DockerContext } from './dockerContext';

/**
 * Inicia uma sequência de containers ordenadamente respeitando delays pré-configurados
 * (ex: Oracle -> delay 60s -> WTA -> delay 20s -> WSH).
 */
export async function startContainerSequence(
  ctx: DockerContext,
  containers: { name: string; delay?: number }[],
  onProgress?: (step: { currentName: string; index: number; total: number; waitingSeconds?: number }) => void
): Promise<{ success: boolean; started: string[]; failed?: string; error?: string }> {
  const started: string[] = [];

  // Auto-recuperação prévia: garante que o daemon Docker esteja ativo antes de iniciar a sequência
  const ensure = await ctx.ensureDockerRunning();
  if (!ensure.running) {
    return {
      success: false,
      started: [],
      failed: containers[0]?.name || 'docker-daemon',
      error: ensure.error || 'O daemon do Docker está inativo e não pôde ser iniciado automaticamente.'
    };
  }

  for (let i = 0; i < containers.length; i++) {
    const item = containers[i];
    onProgress?.({ currentName: item.name, index: i + 1, total: containers.length });

    try {
      await ctx.startContainer(item.name);
      started.push(item.name);
    } catch (err: any) {
      return {
        success: false,
        started,
        failed: item.name,
        error: err?.message || 'Falha ao iniciar container'
      };
    }

    // Se houver delay configurado e não for o último container
    if (item.delay && item.delay > 0 && i < containers.length - 1) {
      for (let sec = item.delay; sec > 0; sec--) {
        onProgress?.({ currentName: item.name, index: i + 1, total: containers.length, waitingSeconds: sec });
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return { success: true, started };
}

/**
 * Para uma sequência ou lote de containers ordenadamente.
 */
export async function stopContainerSequence(
  ctx: DockerContext,
  containers: string[],
  onProgress?: (step: { currentName: string; index: number; total: number }) => void
): Promise<{ success: boolean; stopped: string[]; failed?: string; error?: string }> {
  const stopped: string[] = [];

  for (let i = 0; i < containers.length; i++) {
    const name = containers[i];
    onProgress?.({ currentName: name, index: i + 1, total: containers.length });

    try {
      await ctx.stopContainer(name);
      stopped.push(name);
    } catch (err: any) {
      return {
        success: false,
        stopped,
        failed: name,
        error: err?.message || 'Falha ao parar container'
      };
    }
  }

  return { success: true, stopped };
}
