import path from 'path';
import fs from 'fs';
import { getKarafSshPort } from '../../../shared/types';
import { checkPortOpen } from '../../utils/network';
import { isWslKaraf, resolveKarafWslClient, resolveKarafWslServer } from '../../utils/karafWslUtils';
import type { KarafContext } from './karafContext';

export function getKarafClientExecutable(ctx: KarafContext): string | null {
  const settings = ctx.getSettings();
  if (!settings.karafPath) return null;
  if (isWslKaraf(settings)) {
    const wslClient = resolveKarafWslClient(settings);
    if (wslClient) return wslClient.linuxClientPath;
  }
  const candidates = [
    path.join(settings.karafPath, 'bin', 'client.bat'),
    path.join(settings.karafPath, 'bin', 'client.sh'),
    path.join(settings.karafPath, 'bin', 'client'),
    path.join(settings.karafPath, 'bin', 'karaf-client')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

export function getKarafServerExecutable(ctx: KarafContext): string | null {
  const settings = ctx.getSettings();
  if (!settings.karafPath) return null;
  if (isWslKaraf(settings)) {
    const wslServer = resolveKarafWslServer(settings);
    if (wslServer) return `${wslServer.linuxServerDir}/${wslServer.scriptName}`;
  }

  // Se o desenvolvedor informou um script customizado nas configurações:
  if (settings.karafScript && settings.karafScript.trim()) {
    const custom = settings.karafScript.trim();
    if (path.isAbsolute(custom) && fs.existsSync(custom)) {
      return custom;
    }
    const inBin = path.join(settings.karafPath, 'bin', custom);
    if (fs.existsSync(inBin)) {
      return inBin;
    }
    const inRoot = path.join(settings.karafPath, custom);
    if (fs.existsSync(inRoot)) {
      return inRoot;
    }
  }

  const candidates = [
    path.join(settings.karafPath, 'bin', 'winthor.bat'),
    path.join(settings.karafPath, 'bin', 'karaf.bat'),
    path.join(settings.karafPath, 'bin', 'karaf.sh'),
    path.join(settings.karafPath, 'bin', 'karaf'),
    path.join(settings.karafPath, 'winthor.bat'),
    path.join(settings.karafPath, 'karaf.bat')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

/**
 * Verifica se o contêiner Apache Karaf/OSGi está rodando e escutando na porta SSH (padrão 8101).
 * Essencial antes de disparar deploys ou comandos via client.bat para evitar timeouts ou falsos positivos.
 */
export async function isKarafRunning(ctx: KarafContext, sshPort?: number): Promise<boolean> {
  const settings = ctx.getSettings();
  const port = sshPort || getKarafSshPort(settings);
  const isOpenLocal = await checkPortOpen(port, '127.0.0.1', 800);
  if (isOpenLocal) return true;

  if (isWslKaraf(settings)) {
    try {
      const { wslService } = await import('../WslService');
      const distroIp = await wslService.getDistroIp(settings.karafWslDistro);
      if (distroIp) {
        return await checkPortOpen(port, distroIp, 800);
      }
    } catch {
      // Fallback silencioso
    }
  }

  return false;
}
