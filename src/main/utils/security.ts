import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

export const execFileAsync = util.promisify(execFile);

/**
 * Valida se uma string é um nome de serviço ou processo seguro (sem metacaracteres de shell ou quebra de linha).
 */
export function isValidIdentifier(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  return /^[a-zA-Z0-9_\-. ]+$/.test(name.trim());
}

/**
 * Valida se uma URL utiliza protocolo http:// ou https:// seguro.
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valida se um comando destinado ao Karaf OSGi é seguro (sem quebras de linha ou encadeamento de shell).
 */
export function isSafeKarafCommand(command: string): boolean {
  if (!command || typeof command !== 'string') return false;
  const trimmed = command.trim();
  if (!trimmed || trimmed.length > 1000) return false;
  // Bloqueia quebras de linha e operadores de encadeamento de shell
  if (/[\r\n;&|<>`$]/.test(trimmed)) return false;
  return true;
}

/**
 * Valida se uma tag/referência de imagem Docker é segura (sem metacaracteres de shell).
 * Aceita registry/namespace/repo:tag (ex: meuregistro.com:5000/ns/app:1.0.0).
 */
export function isSafeDockerImageTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') return false;
  const trimmed = tag.trim();
  if (!trimmed || trimmed.length > 256) return false;
  return /^[a-zA-Z0-9][a-zA-Z0-9_.\-/:]*$/.test(trimmed);
}

/**
 * Valida se um caminho é local e seguro (rejeitando caminhos de rede UNC \\servidor\share e bytes nulos).
 */
export function isSafeLocalPath(targetPath: string): boolean {
  if (!targetPath || typeof targetPath !== 'string') return false;
  if (targetPath.includes('\0')) return false;
  const trimmed = targetPath.trim();
  // Bloqueia caminhos UNC de rede no Windows
  if (trimmed.startsWith('\\\\') || trimmed.startsWith('//')) return false;
  return true;
}

/**
 * Valida se o caminho informado existe e está dentro de um diretório base permitido.
 */
export function isSafePath(targetPath: string, allowedBaseDir?: string): boolean {
  if (!isSafeLocalPath(targetPath)) return false;
  try {
    const normalizedTarget = path.normalize(path.resolve(targetPath));
    if (allowedBaseDir) {
      const normalizedBase = path.normalize(path.resolve(allowedBaseDir));
      const targetCheck = process.platform === 'win32' ? normalizedTarget.toLowerCase() : normalizedTarget;
      const baseCheck = process.platform === 'win32' ? normalizedBase.toLowerCase() : normalizedBase;
      // Exige que o alvo seja o próprio diretório base ou esteja dentro dele (com separador),
      // evitando que "C:\...\projects-evil" passe no prefixo de "C:\...\projects".
      return targetCheck === baseCheck || targetCheck.startsWith(baseCheck + path.sep);
    }
    return fs.existsSync(normalizedTarget);
  } catch {
    return false;
  }
}
