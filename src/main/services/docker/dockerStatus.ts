import type { DockerDaemonStatus } from '../../../shared/types';
import { execFileAsync } from '../../utils/security';
import { wslService } from '../WslService';
import type { DockerContext } from './dockerContext';

type WslDistros = DockerDaemonStatus['availableDistros'];

/**
 * Consulta o daemon dentro de uma distro WSL específica. A mensagem de erro varia conforme o
 * chamador (distro escolhida pelo usuário x distro encontrada por auto-detecção).
 */
async function checkWslDistroDaemon(
  distro: string,
  availableDistros: WslDistros,
  notRunningError: string
): Promise<DockerDaemonStatus> {
  try {
    const { stdout } = await execFileAsync(
      'wsl',
      ['-d', distro, '--', 'docker', 'version', '--format', '{{.Server.Version}}'],
      { timeout: 5000, windowsHide: true }
    );
    const version = stdout.trim();
    const wslIp = await wslService.getDistroIp(distro);
    return {
      installed: true,
      running: true,
      engine: 'docker',
      version: version ? `Docker (WSL: ${distro}) v${version}` : `Docker WSL (${distro})`,
      isWsl: true,
      wslDistro: distro,
      wslIp,
      availableDistros
    };
  } catch {
    const wslIp = await wslService.getDistroIp(distro);
    return {
      installed: true,
      running: false,
      engine: 'docker',
      isWsl: true,
      wslDistro: distro,
      wslIp,
      availableDistros,
      error: notRunningError
    };
  }
}

/**
 * Tenta o motor diretamente no Windows Host; devolve null se o daemon não responder.
 */
async function checkHostEngine(
  ctx: DockerContext,
  engine: 'docker' | 'podman',
  fallbackVersion: string,
  availableDistros: WslDistros
): Promise<DockerDaemonStatus | null> {
  try {
    const { stdout } = await execFileAsync(engine, ['version', '--format', '{{.Server.Version}}'], {
      timeout: 4000,
      windowsHide: true
    });
    const version = stdout.trim();
    ctx.detectedEngine = engine;
    ctx.useWsl = false;
    ctx.autoDetectedWsl = false;
    return {
      installed: true,
      running: true,
      engine,
      version: version || fallbackVersion,
      isWsl: false,
      availableDistros
    };
  } catch {
    return null;
  }
}

/**
 * Nenhum motor está respondendo — verifica se ao menos o binário está instalado no Windows,
 * para diferenciar "não instalado" de "instalado, porém com o serviço parado".
 */
async function isAnyBinaryInstalled(): Promise<boolean> {
  let anyBinaryInstalled = false;
  try {
    await execFileAsync('docker', ['--version'], { timeout: 3000, windowsHide: true });
    anyBinaryInstalled = true;
  } catch {
    try {
      await execFileAsync('podman', ['--version'], { timeout: 3000, windowsHide: true });
      anyBinaryInstalled = true;
    } catch {
      // Nenhum binário encontrado no Windows
    }
  }
  return anyBinaryInstalled;
}

/**
 * Verifica se o executável do Docker ou Podman está ativo no sistema ou dentro de uma distro WSL.
 */
export async function checkDockerStatus(ctx: DockerContext): Promise<DockerDaemonStatus> {
  const availableDistros = await wslService.listDistros();

  // 1. Se uma distro WSL específica foi selecionada manualmente pelo usuário (não apenas detectada
  // automaticamente como fallback), respeita a escolha sem voltar a testar o host Windows.
  if (ctx.useWsl && ctx.targetWslDistro && !ctx.autoDetectedWsl) {
    return checkWslDistroDaemon(
      ctx.targetWslDistro,
      availableDistros,
      `Docker não está respondendo dentro da distro WSL "${ctx.targetWslDistro}". Certifique-se de que o daemon está em execução (dockerd/service docker start).`
    );
  }

  // 2. Tentar Docker diretamente no Windows Host primeiro
  const dockerHost = await checkHostEngine(ctx, 'docker', 'Docker Host Ativo', availableDistros);
  if (dockerHost) return dockerHost;

  // 3. Se falhou no Windows Host, verificar Podman no Windows
  const podmanHost = await checkHostEngine(ctx, 'podman', 'Podman Host Ativo', availableDistros);
  if (podmanHost) return podmanHost;

  // 4. Windows não tem Docker/Podman rodando. Verificar se há Docker dentro de alguma distro WSL 2!
  const wslDistroWithDocker = await wslService.findDockerWslDistro();
  if (wslDistroWithDocker) {
    ctx.targetWslDistro = wslDistroWithDocker;
    ctx.useWsl = true;
    ctx.autoDetectedWsl = true;

    return checkWslDistroDaemon(
      wslDistroWithDocker,
      availableDistros,
      `Encontrada distro WSL "${wslDistroWithDocker}", mas o daemon do Docker não está ativo.`
    );
  }

  const anyBinaryInstalled = await isAnyBinaryInstalled();

  return {
    installed: anyBinaryInstalled,
    running: false,
    availableDistros,
    error: anyBinaryInstalled
      ? 'Docker/Podman está instalado, mas o serviço não está em execução. Inicie o Docker Desktop ou o daemon correspondente.'
      : 'Nenhum motor de containers (Docker/Podman no Windows ou Docker no WSL) foi encontrado em execução.'
  };
}

/**
 * Garante que o motor Docker esteja em execução.
 * Se uma distro WSL estiver configurada e o daemon estiver offline,
 * tenta auto-inicializar o serviço dockerd automaticamente.
 */
export async function ensureDockerRunning(
  ctx: DockerContext,
  distroOverride?: string
): Promise<{ running: boolean; error?: string }> {
  const targetDistro = distroOverride || (ctx.useWsl ? ctx.targetWslDistro : null);

  if (targetDistro) {
    const isAlreadyRunning = await wslService.testDockerInDistro(targetDistro);
    if (isAlreadyRunning) {
      return { running: true };
    }

    console.log(`[DockerService] Auto-healing: iniciando daemon Docker na distro WSL "${targetDistro}"...`);
    const startRes = await wslService.startDockerDaemon(targetDistro);
    if (startRes.success) {
      return { running: true };
    }
    return {
      running: false,
      error: startRes.message || `O Docker daemon está inativo na distro WSL "${targetDistro}".`
    };
  }

  const currentStatus = await ctx.checkDockerStatus();
  if (currentStatus.running) return { running: true };

  if (currentStatus.isWsl && currentStatus.wslDistro) {
    const startRes = await wslService.startDockerDaemon(currentStatus.wslDistro);
    if (startRes.success) return { running: true };
    return { running: false, error: startRes.message };
  }

  return {
    running: false,
    error: currentStatus.error || 'Motor de containers Docker/Podman offline.'
  };
}
