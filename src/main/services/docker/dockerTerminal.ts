import { spawn } from 'child_process';
import type { DockerContext } from './dockerContext';

/**
 * Abre um terminal interativo conectado ao container selecionado via Windows Terminal (`wt`) ou cmd.
 */
export async function openContainerTerminal(
  ctx: DockerContext,
  containerId: string,
  shellName = 'bash'
): Promise<boolean> {
  if (!ctx.isValidContainerId(containerId)) {
    throw new Error('Identificador de container inválido.');
  }

  const safeShell = ['bash', 'sh', 'zsh'].includes(shellName) ? shellName : 'bash';

  try {
    if (ctx.useWsl && ctx.targetWslDistro) {
      // Tenta abrir com Windows Terminal (wt) direto na sessão bash do container
      const distro = ctx.targetWslDistro;
      const wtArgs = ['-w', '0', 'nt', 'wsl', '-d', distro, '--', 'docker', 'exec', '-it', containerId, safeShell];
      const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
      wtChild.on('error', () => {
        // wt.exe indisponível (ENOENT chega de forma assíncrona, não via throw): cai para cmd.exe
        const fallbackCmd = `wsl -d ${distro} -- docker exec -it ${containerId} ${safeShell}`;
        const child = spawn('cmd.exe', ['/c', 'start', `Container: ${containerId}`, 'cmd.exe', '/k', fallbackCmd], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      });
      wtChild.unref();
      return true;
    }

    const engine = await ctx.getEngineCommand();
    const title = `Container (${engine}): ${containerId.slice(0, 12)}`;
    const dockerArgs = `${engine} exec -it ${containerId} ${safeShell}`;

    const child = spawn('cmd.exe', ['/c', 'start', title, 'cmd.exe', '/k', dockerArgs], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
    return true;
  } catch (err) {
    console.error(`[DockerService] Falha ao abrir terminal para o container ${containerId}:`, err);
    return false;
  }
}
