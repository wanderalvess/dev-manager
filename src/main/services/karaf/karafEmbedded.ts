import { spawn } from 'child_process';
import path from 'path';
import { AppSettings } from '../../../shared/types';
import { execFileAsync } from '../../utils/security';
import { isWslKaraf, resolveKarafWslServer, killWslKarafProcesses } from '../../utils/karafWslUtils';
import type { ChunkHandler, KarafContext } from './karafContext';
import { readKarafInstallInfo } from './karafInstallInfo';
import { serviceBlockingStart } from './karafServiceGuard';

// --- Karaf Embutido no Painel ---
function startEmbeddedKarafWsl(ctx: KarafContext, settings: AppSettings, onLog: ChunkHandler): boolean {
  const wslServer = resolveKarafWslServer(settings);
  if (!wslServer) {
    onLog(`[ERRO] Script de inicialização do Karaf no WSL não encontrado.\r\n`);
    return false;
  }
  const { distro, linuxServerDir, scriptName } = wslServer;
  onLog(`[OK] Inicializando Karaf OSGi (WSL - ${distro}) em modo Debug (Console Embutido)...\r\n`);
  const debugPort = settings.karafDebugPort || 5005;
  const bashCmd = `export JAVA_DEBUG_PORT=${debugPort} && cd "${linuxServerDir}" && ./${scriptName} debug`;
  try {
    ctx.embeddedKarafProcess = spawn('wsl.exe', ['-d', distro, '--', 'bash', '-c', bashCmd], {
      detached: true
    });
    ctx.embeddedKarafProcess.stdout?.on('data', (data) => onLog(data.toString()));
    ctx.embeddedKarafProcess.stderr?.on('data', (data) => onLog(data.toString()));
    ctx.embeddedKarafProcess.on('close', (code) => {
      onLog(`\r\n[AVISO] Sessão do Karaf Debug (WSL) encerrada (Código: ${code}).\r\n`);
      ctx.embeddedKarafProcess = null;
    });
    ctx.embeddedKarafProcess.on('error', (err) => {
      onLog(`\r\n[ERRO] Falha no processo do Karaf no WSL: ${err.message}\r\n`);
      ctx.embeddedKarafProcess = null;
    });
    return true;
  } catch (err: any) {
    onLog(`[ERRO FATAL] Não foi possível iniciar o Karaf no WSL: ${err?.message || err}\r\n`);
    ctx.embeddedKarafProcess = null;
    return false;
  }
}

export function startEmbeddedKarafDebug(ctx: KarafContext, onLog: ChunkHandler): boolean {
  if (ctx.embeddedKarafProcess) {
    onLog('[INFO] Karaf já está em execução no console integrado.\r\n');
    return true;
  }

  const settings = ctx.getSettings();

  if (isWslKaraf(settings)) {
    return startEmbeddedKarafWsl(ctx, settings, onLog);
  }

  const karafBin = path.join(settings.karafPath, 'bin');
  const exeFile = ctx.getKarafServerExecutable();

  if (!exeFile) {
    onLog(`[ERRO] Script de inicialização do Karaf (karaf.bat/karaf) não encontrado em: ${karafBin}\r\n`);
    return false;
  }

  const blockedByService = serviceBlockingStart(readKarafInstallInfo(settings.karafPath));
  if (blockedByService) {
    onLog(`[ERRO] ${blockedByService}\r\n`);
    return false;
  }

  onLog(`[OK] Inicializando Karaf OSGi em modo Debug (Console Embutido)...\r\n`);

  try {
    const isWin = process.platform === 'win32';
    const childEnv = ctx.getResolvedJavaEnv();
    const cmdExe = childEnv.ComSpec || process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
    // A pasta do próprio script: ele pode estar em bin/, na raiz ou num caminho customizado (karafScript)
    const scriptDir = path.dirname(exeFile);
    ctx.embeddedKarafProcess = isWin
      ? spawn(cmdExe, ['/c', path.basename(exeFile), 'debug'], {
          cwd: scriptDir,
          shell: false,
          env: childEnv
        })
      : spawn(exeFile, ['debug'], {
          cwd: scriptDir,
          shell: false,
          detached: true,
          env: childEnv
        });

    ctx.embeddedKarafProcess.stdout?.on('data', (data) => {
      onLog(data.toString());
    });

    ctx.embeddedKarafProcess.stderr?.on('data', (data) => {
      onLog(data.toString());
    });

    ctx.embeddedKarafProcess.on('close', (code) => {
      onLog(`\r\n[AVISO] Sessão do Karaf Debug encerrada (Código: ${code}).\r\n`);
      ctx.embeddedKarafProcess = null;
    });

    ctx.embeddedKarafProcess.on('error', (err) => {
      onLog(`\r\n[ERRO] Falha no processo do Karaf: ${err.message}\r\n`);
      ctx.embeddedKarafProcess = null;
    });

    return true;
  } catch (err: any) {
    onLog(`[ERRO FATAL] Não foi possível iniciar o Karaf: ${err?.message || err}\r\n`);
    ctx.embeddedKarafProcess = null;
    return false;
  }
}

export function sendEmbeddedInput(ctx: KarafContext, input: string): boolean {
  if (ctx.embeddedKarafProcess && ctx.embeddedKarafProcess.stdin) {
    if (!input || typeof input !== 'string') return false;
    // Permite interrupção (Ctrl+C / ETX \x03) para cancelar comandos em execução como log:tail
    if (input === '\x03' || input === '^C') {
      ctx.embeddedKarafProcess.stdin.write('\x03');
      return true;
    }
    // eslint-disable-next-line no-control-regex -- remove intencionalmente caracteres de controle do input do terminal
    ctx.embeddedKarafProcess.stdin.write(input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') + '\n');
    return true;
  }
  return false;
}

/** Envia sinal de interrupção (Ctrl+C / ETX \x03) para o processo do console embutido Karaf. */
export function sendEmbeddedInterrupt(ctx: KarafContext): boolean {
  if (ctx.embeddedKarafProcess && ctx.embeddedKarafProcess.stdin) {
    try {
      ctx.embeddedKarafProcess.stdin.write('\x03');
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function stopEmbeddedKaraf(ctx: KarafContext): Promise<boolean> {
  if (!ctx.embeddedKarafProcess) return true;

  const settings = ctx.getSettings();
  if (isWslKaraf(settings)) {
    await killWslKarafProcesses(settings.karafWslDistro!);
  }

  try {
    if (ctx.embeddedKarafProcess.pid) {
      if (process.platform === 'win32') {
        await execFileAsync('taskkill.exe', ['/F', '/PID', String(ctx.embeddedKarafProcess.pid), '/T']);
      } else {
        process.kill(-ctx.embeddedKarafProcess.pid, 'SIGKILL');
      }
    }
    ctx.embeddedKarafProcess = null;
    return true;
  } catch {
    const killed = ctx.embeddedKarafProcess?.kill() ?? true;
    ctx.embeddedKarafProcess = null;
    return killed;
  }
}

export function isEmbeddedRunning(ctx: KarafContext): boolean {
  return ctx.embeddedKarafProcess !== null && !ctx.embeddedKarafProcess.killed;
}
