import { execFileAsync } from '../../utils/security';
import { wslService } from '../WslService';
import type { DockerContext } from './dockerContext';

/**
 * Inicia um container existente com auto-healing caso o Docker daemon esteja desligado no WSL
 * e resolução automática de aliases (ex: oracle-winthor <-> oracle-local).
 */
export async function startContainer(ctx: DockerContext, containerId: string): Promise<boolean> {
  if (!ctx.isValidContainerId(containerId)) {
    throw new Error('Identificador de container inválido.');
  }

  const runStart = async (targetId: string) => {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('start', [targetId]);
    await execFileAsync(binary, finalArgs, {
      timeout: 20000,
      windowsHide: true
    });
    return true;
  };

  try {
    return await runStart(containerId);
  } catch (err: any) {
    let currentErr = err;
    const errStr = (currentErr?.stderr || '') + ' ' + (currentErr?.message || '') + ' ' + (currentErr?.stdout || '');
    const isDaemonOffline =
      errStr.includes('Cannot connect to the Docker daemon') ||
      errStr.includes('Is the docker daemon running') ||
      errStr.includes('docker daemon is not running') ||
      errStr.includes('Failed to connect to');

    // Se o erro foi daemon offline e estamos usando WSL, tenta auto-iniciar o dockerd e retry
    if (isDaemonOffline && ctx.useWsl && ctx.targetWslDistro) {
      console.warn(`[DockerService] Daemon offline detectado ao iniciar ${containerId}. Tentando auto-healing na distro "${ctx.targetWslDistro}"...`);
      const heal = await wslService.startDockerDaemon(ctx.targetWslDistro);
      if (heal.success) {
        try {
          return await runStart(containerId);
        } catch (retryErr: any) {
          currentErr = retryErr;
        }
      } else if (heal.message) {
        throw new Error(heal.message);
      }
    }

    console.error(`[DockerService] Erro ao iniciar container ${containerId}:`, currentErr);

    const updatedErrStr = (currentErr?.stderr || '') + ' ' + (currentErr?.message || '') + ' ' + (currentErr?.stdout || '');
    if (updatedErrStr.includes('No such container')) {
      // Tenta auto-resolução de alias (ex: oracle-winthor -> oracle-local)
      const alias = await ctx.resolveContainerAlias(containerId);
      if (alias) {
        try {
          console.log(`[DockerService] Redirecionando alias automático: "${containerId}" -> "${alias}"`);
          return await runStart(alias);
        } catch (aliasErr: any) {
          console.warn(`[DockerService] Falha ao tentar iniciar alias "${alias}":`, aliasErr?.message);
        }
      }

      const distroMsg = ctx.useWsl && ctx.targetWslDistro ? ` na distro WSL "${ctx.targetWslDistro}"` : '';
      throw new Error(
        `O container "${containerId}" não foi encontrado${distroMsg}. Verifique os containers criados ou o nome informado nas configurações do ambiente.`
      );
    }

    if (isDaemonOffline) {
      const distroMsg = ctx.useWsl && ctx.targetWslDistro ? ` na distro WSL "${ctx.targetWslDistro}"` : '';
      throw new Error(
        `O serviço do Docker (dockerd) não está respondendo${distroMsg}. Certifique-se de que o daemon está em execução (sudo service docker start).`
      );
    }

    throw new Error(currentErr.stderr || currentErr.message || 'Falha ao iniciar container');
  }
}

/**
 * Executa `docker <subcommand> <id>` e, se o container não existir, tenta o alias resolvido
 * (ex.: oracle-winthor <-> oracle-local) antes de devolver o erro do identificador informado.
 */
async function runWithAlias(
  ctx: DockerContext,
  subcommand: 'stop' | 'restart',
  containerId: string,
  failureMessage: string
): Promise<boolean> {
  if (!ctx.isValidContainerId(containerId)) {
    throw new Error('Identificador de container inválido.');
  }

  const run = async (targetId: string) => {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs(subcommand, [targetId]);
    await execFileAsync(binary, finalArgs, { timeout: 25000, windowsHide: true });
    return true;
  };

  try {
    return await run(containerId);
  } catch (err: any) {
    if ((err?.stderr || '').includes('No such container')) {
      const alias = await ctx.resolveContainerAlias(containerId);
      if (alias) {
        try {
          return await run(alias);
        } catch {
          // Falha no alias: ignora e segue para o erro original do containerId informado
        }
      }
    }
    console.error(`[DockerService] Erro ao executar ${subcommand} no container ${containerId}:`, err);
    throw new Error(err.stderr || err.message || failureMessage);
  }
}

/** Para um container em execução (com suporte a resolução de aliases). */
export function stopContainer(ctx: DockerContext, containerId: string): Promise<boolean> {
  return runWithAlias(ctx, 'stop', containerId, 'Falha ao parar container');
}

/** Reinicia um container (com suporte a resolução de aliases). */
export function restartContainer(ctx: DockerContext, containerId: string): Promise<boolean> {
  return runWithAlias(ctx, 'restart', containerId, 'Falha ao reiniciar container');
}

/**
 * Remove forçadamente um container.
 */
export async function removeContainer(ctx: DockerContext, containerId: string): Promise<boolean> {
  if (!ctx.isValidContainerId(containerId)) {
    throw new Error('Identificador de container inválido.');
  }

  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('rm', ['-f', containerId]);
    await execFileAsync(binary, finalArgs, {
      timeout: 20000,
      windowsHide: true
    });
    return true;
  } catch (err: any) {
    console.error(`[DockerService] Erro ao remover container ${containerId}:`, err);
    throw new Error(err.stderr || err.message || 'Falha ao remover container');
  }
}

/**
 * Pausa um container em execução (docker pause).
 */
export async function pauseContainer(ctx: DockerContext, containerId: string): Promise<boolean> {
  if (!ctx.isValidContainerId(containerId)) {
    throw new Error('Identificador de container inválido.');
  }
  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('pause', [containerId]);
    await execFileAsync(binary, finalArgs, { timeout: 15000, windowsHide: true });
    return true;
  } catch (err: any) {
    console.error(`[DockerService] Erro ao pausar container ${containerId}:`, err);
    throw new Error(err.stderr || err.message || 'Falha ao pausar container');
  }
}

/**
 * Despausa um container (docker unpause).
 */
export async function unpauseContainer(ctx: DockerContext, containerId: string): Promise<boolean> {
  if (!ctx.isValidContainerId(containerId)) {
    throw new Error('Identificador de container inválido.');
  }
  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('unpause', [containerId]);
    await execFileAsync(binary, finalArgs, { timeout: 15000, windowsHide: true });
    return true;
  } catch (err: any) {
    console.error(`[DockerService] Erro ao despausar container ${containerId}:`, err);
    throw new Error(err.stderr || err.message || 'Falha ao despausar container');
  }
}

/**
 * Expruga containers parados (docker container prune -f).
 */
export async function pruneContainers(ctx: DockerContext): Promise<{ success: boolean; output: string }> {
  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs('container', ['prune', '-f']);
    const { stdout, stderr } = await execFileAsync(binary, finalArgs, { timeout: 30000, windowsHide: true });
    return { success: true, output: (stdout || stderr || 'Containers parados removidos com sucesso.').trim() };
  } catch (err: any) {
    return { success: false, output: err.stderr || err.message || 'Falha ao expurgar containers' };
  }
}
