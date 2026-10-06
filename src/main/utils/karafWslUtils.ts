import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { AppSettings } from '../../shared/types';
import { execFileAsync, isValidIdentifier } from './security';

/**
 * Verifica se o Apache Karaf está configurado para execução dentro do WSL.
 */
export function isWslKaraf(settings: Partial<AppSettings>): boolean {
  return settings.karafEnvironment === 'wsl' && Boolean(settings.karafWslDistro && settings.karafWslDistro.trim());
}

/**
 * Converte e normaliza caminhos entre o host Windows e o filesystem da distribuição WSL.
 */
export function normalizeWslPath(inputPath: string, distro?: string): { linuxPath: string; windowsUncPath: string } {
  if (!inputPath || !inputPath.trim()) {
    return { linuxPath: '', windowsUncPath: '' };
  }

  const clean = inputPath.trim();

  // Caso 1: Caminho UNC do WSL (\\wsl.localhost\Ubuntu\home\... ou \\wsl$\Ubuntu\home\...)
  const uncMatch = clean.match(/^\\\\(?:wsl\.localhost|wsl\$)\\([^\\]+)(.*)$/i);
  if (uncMatch) {
    const extractedDistro = uncMatch[1];
    const subPath = uncMatch[2] ? uncMatch[2].replace(/\\/g, '/') : '/';
    const linuxPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
    const windowsUncPath = `\\\\wsl.localhost\\${extractedDistro}${linuxPath.replace(/\//g, '\\')}`;
    return { linuxPath, windowsUncPath };
  }

  // Caso 2: Caminho Linux absoluto (/home/usuario/karaf ou /opt/karaf)
  if (clean.startsWith('/')) {
    const linuxPath = clean;
    const targetDistro = distro?.trim() || '';
    const windowsUncPath = targetDistro
      ? `\\\\wsl.localhost\\${targetDistro}${clean.replace(/\//g, '\\')}`
      : clean;
    return { linuxPath, windowsUncPath };
  }

  // Caso 3: Caminho Windows com letra de unidade (ex: C:\karaf)
  const driveMatch = clean.match(/^([a-zA-Z]):\\(.*)$/);
  if (driveMatch) {
    const driveLetter = driveMatch[1].toLowerCase();
    const subPath = driveMatch[2].replace(/\\/g, '/');
    const linuxPath = `/mnt/${driveLetter}/${subPath}`;
    return { linuxPath, windowsUncPath: clean };
  }

  return { linuxPath: clean.replace(/\\/g, '/'), windowsUncPath: clean };
}

/**
 * Localiza o executável client do Karaf na distro WSL.
 */
export function resolveKarafWslClient(settings: AppSettings): { distro: string; linuxClientPath: string } | null {
  if (!isWslKaraf(settings)) return null;

  const distro = settings.karafWslDistro!.trim();
  const { linuxPath, windowsUncPath } = normalizeWslPath(settings.karafPath, distro);
  if (!linuxPath) return null;

  // No host Windows, checamos via UNC se os arquivos de binário existem
  const candidates = ['client', 'client.sh', 'client.bat', 'karaf-client'];
  let foundBinary = 'client';

  for (const c of candidates) {
    const uncCandidate = path.join(windowsUncPath, 'bin', c);
    if (fs.existsSync(uncCandidate)) {
      foundBinary = c;
      break;
    }
  }

  const linuxClientPath = `${linuxPath.replace(/\/+$/, '')}/bin/${foundBinary}`;
  return { distro, linuxClientPath };
}

/**
 * Localiza o script de inicialização do Karaf na distro WSL.
 */
export function resolveKarafWslServer(settings: AppSettings): { distro: string; linuxServerDir: string; scriptName: string } | null {
  if (!isWslKaraf(settings)) return null;

  const distro = settings.karafWslDistro!.trim();
  const { linuxPath, windowsUncPath } = normalizeWslPath(settings.karafPath, distro);
  if (!linuxPath) return null;

  const candidates = ['karaf', 'winthor.bat', 'karaf.bat', 'karaf.sh'];
  let scriptName = 'karaf';

  // Se o usuário configurou um script customizado
  if (settings.karafScript && settings.karafScript.trim()) {
    scriptName = path.basename(settings.karafScript.trim());
  } else {
    for (const c of candidates) {
      const uncCandidate = path.join(windowsUncPath, 'bin', c);
      if (fs.existsSync(uncCandidate)) {
        scriptName = c;
        break;
      }
    }
  }

  const linuxServerDir = `${linuxPath.replace(/\/+$/, '')}/bin`;
  return { distro, linuxServerDir, scriptName };
}

/**
 * Retorna o caminho UNC Windows do arquivo de log do Karaf no WSL para o Log Watcher.
 */
export function resolveKarafWslLogPath(settings: AppSettings): string | null {
  if (!isWslKaraf(settings)) return null;
  const distro = settings.karafWslDistro!.trim();
  const { windowsUncPath } = normalizeWslPath(settings.karafPath, distro);
  if (!windowsUncPath) return null;

  const uncCandidates = [
    path.join(windowsUncPath, 'data', 'log', 'karaf.log'),
    path.join(windowsUncPath, 'data', 'log', 'winthor.log')
  ];

  for (const c of uncCandidates) {
    if (fs.existsSync(c)) return c;
  }
  return uncCandidates[0];
}

/**
 * Constrói comando wsl.exe para executar o Karaf client.
 */
export function buildWslClientArgs(distro: string, linuxClientPath: string, clientArgs: string[]): { command: string; args: string[] } {
  return {
    command: 'wsl.exe',
    args: ['-d', distro, '--', linuxClientPath, ...clientArgs]
  };
}

/**
 * Inicia o servidor Karaf em modo Debug dentro do WSL em uma janela do terminal (WT ou CMD).
 */
export function launchWslServerDebug(
  settings: AppSettings,
  hasWt: boolean,
  launchMode?: 'wt' | 'cmd',
  customDebugPort?: number
): boolean {
  const resolved = resolveKarafWslServer(settings);
  if (!resolved) return false;

  const { distro, linuxServerDir, scriptName } = resolved;
  if (!isValidIdentifier(distro)) return false;
  // linuxServerDir e scriptName vêm das configurações e entram num `bash -c "..."`: aspas, $, crases e `;`
  // fechariam a string e executariam comando arbitrário dentro do WSL.
  if (!/^[A-Za-z0-9_\-./ ~]+$/.test(linuxServerDir) || !/^[A-Za-z0-9_\-.]+$/.test(scriptName)) {
    console.error('[karafWslUtils] Caminho ou script do Karaf no WSL contém caracteres não permitidos.');
    return false;
  }

  const debugPort = customDebugPort || settings.karafDebugPort || 5005;
  const title = `Karaf Debug (WSL - ${distro})`;

  // O comando dentro do Bash no WSL: navega até a pasta bin e executa o karaf debug
  const bashCmd = `export JAVA_DEBUG_PORT=${debugPort} && cd "${linuxServerDir}" && ./${scriptName} debug`;
  const useWt = launchMode === 'wt' || (!launchMode && hasWt);

  try {
    if (useWt) {
      const wtArgs = [
        '-w', 'dev-manager', 'new-tab',
        '--title', title,
        'wsl.exe', '-d', distro, '--',
        'bash', '-c', `${bashCmd}; echo ''; echo 'Sessão encerrada. Pressione Enter para fechar...'; read -r`
      ];

      const wtProc = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
      wtProc.on('error', () => {
        spawn(
          'cmd.exe',
          ['/c', 'start', title, 'cmd.exe', '/k', `wsl.exe -d ${distro} -- bash -c "${bashCmd}"`],
          { detached: true, stdio: 'ignore' }
        ).unref();
      });
      wtProc.unref();
    } else {
      spawn(
        'cmd.exe',
        ['/c', 'start', title, 'cmd.exe', '/k', `wsl.exe -d ${distro} -- bash -c "${bashCmd}"`],
        { detached: true, stdio: 'ignore' }
      ).unref();
    }
    return true;
  } catch (err) {
    console.error('[karafWslUtils] Erro ao iniciar Karaf no WSL:', err);
    return false;
  }
}

/**
 * Encerra processos do Karaf rodando dentro da distro WSL.
 */
export async function killWslKarafProcesses(distro: string): Promise<boolean> {
  if (!distro || !isValidIdentifier(distro)) return false;
  try {
    await execFileAsync('wsl.exe', ['-d', distro, '--', 'pkill', '-f', 'karaf'], { timeout: 5000 });
    return true;
  } catch {
    // pkill retorna exit code 1 se nenhum processo correspondente for encontrado
    return false;
  }
}
