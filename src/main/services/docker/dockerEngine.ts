import { execFileAsync } from '../../utils/security';
import type { DockerContext, DockerEngine } from './dockerContext';

/**
 * Monta o comando executável e argumentos para rodar o Docker diretamente no Windows
 * ou repassar via `wsl -d <distro> -- docker ...`.
 */
export async function resolveCommandAndArgs(
  ctx: DockerContext,
  dockerSubcommand: string,
  args: string[] = []
): Promise<{ binary: string; finalArgs: string[] }> {
  if (ctx.useWsl && ctx.targetWslDistro) {
    return {
      binary: 'wsl',
      finalArgs: ['-d', ctx.targetWslDistro, '--', 'docker', dockerSubcommand, ...args]
    };
  }

  const engine = await ctx.getEngineCommand();
  return {
    binary: engine,
    finalArgs: [dockerSubcommand, ...args]
  };
}

/**
 * Converte um caminho estilo Windows (C:\...) para o caminho montado equivalente dentro do WSL
 * (/mnt/c/...), necessário porque o Docker CLI executando dentro de uma distro WSL não interpreta
 * letras de unidade do Windows.
 */
export function toWslPath(ctx: DockerContext, windowsPath: string): string {
  if (!ctx.useWsl || !ctx.targetWslDistro) return windowsPath;
  const match = /^([a-zA-Z]):[\\/](.*)$/.exec(windowsPath);
  if (!match) return windowsPath;
  const drive = match[1].toLowerCase();
  const rest = match[2].replace(/\\/g, '/');
  return `/mnt/${drive}/${rest}`;
}

/**
 * Identifica e retorna o comando do motor de container disponível no Windows ('docker' ou 'podman').
 */
export async function getEngineCommand(ctx: DockerContext): Promise<DockerEngine> {
  if (ctx.detectedEngine) {
    return ctx.detectedEngine;
  }

  // Testa primeiro o Docker no Windows
  try {
    await execFileAsync('docker', ['--version'], { timeout: 3000, windowsHide: true });
    ctx.detectedEngine = 'docker';
    return 'docker';
  } catch {
    try {
      await execFileAsync('podman', ['--version'], { timeout: 3000, windowsHide: true });
      ctx.detectedEngine = 'podman';
      return 'podman';
    } catch {
      return 'docker';
    }
  }
}
