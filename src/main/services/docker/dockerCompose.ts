import fs from 'fs';
import type { ComposeServiceStatus } from '../../../shared/types';
import { execFileAsync, isValidIdentifier, isSafeLocalPath } from '../../utils/security';
import { runCapturedProcess } from '../../utils/process';
import { parseComposeStatus } from '../../utils/dockerOutputParsers';
import type { DockerContext } from './dockerContext';

/**
 * Sobe os serviços definidos em um docker-compose.yml.
 */
export async function composeUp(
  ctx: DockerContext,
  composeFilePath: string,
  options: { profile?: string; detach?: boolean; build?: boolean } | undefined,
  onChunk: (chunk: string) => void
): Promise<{ code: number; stdout: string; stderr: string }> {
  if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
    const err = `[ERRO] Arquivo docker-compose não encontrado: ${composeFilePath}\r\n`;
    onChunk(err);
    return { code: 1, stdout: '', stderr: err };
  }

  const args = ['compose', '-f', ctx.toWslPath(composeFilePath)];
  if (options?.profile && isValidIdentifier(options.profile)) {
    args.push('--profile', options.profile);
  }
  args.push('up');
  if (options?.detach !== false) args.push('-d');
  if (options?.build === true) args.push('--build');

  const { binary, finalArgs } = await ctx.resolveCommandAndArgs(args[0], args.slice(1));
  onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);
  const result = await runCapturedProcess(binary, finalArgs, { windowsHide: true }, onChunk);
  onChunk(
    result.code === 0
      ? `\r\n[SUCESSO] Serviços do compose iniciados com sucesso!\r\n`
      : `\r\n[ERRO] Falha ao subir serviços do compose (Código ${result.code}).\r\n`
  );
  return result;
}

/**
 * Derruba os serviços definidos em um docker-compose.yml (com suporte a remoção de volumes com -v).
 */
export async function composeDown(
  ctx: DockerContext,
  composeFilePath: string,
  options: { profile?: string; volumes?: boolean } | undefined,
  onChunk: (chunk: string) => void
): Promise<{ code: number; stdout: string; stderr: string }> {
  if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
    const err = `[ERRO] Arquivo docker-compose não encontrado: ${composeFilePath}\r\n`;
    onChunk(err);
    return { code: 1, stdout: '', stderr: err };
  }

  const args = ['compose', '-f', ctx.toWslPath(composeFilePath)];
  if (options?.profile && isValidIdentifier(options.profile)) {
    args.push('--profile', options.profile);
  }
  args.push('down');
  if (options?.volumes === true) {
    args.push('-v');
  }

  const { binary, finalArgs } = await ctx.resolveCommandAndArgs(args[0], args.slice(1));
  onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);
  const result = await runCapturedProcess(binary, finalArgs, { windowsHide: true }, onChunk);
  onChunk(
    result.code === 0
      ? `\r\n[SUCESSO] Serviços do compose derrubados!\r\n`
      : `\r\n[ERRO] Falha ao derrubar serviços do compose (Código ${result.code}).\r\n`
  );
  return result;
}

/**
 * Reinicia os serviços definidos em um docker-compose.yml.
 */
export async function composeRestart(
  ctx: DockerContext,
  composeFilePath: string,
  options: { profile?: string } | undefined,
  onChunk: (chunk: string) => void
): Promise<{ code: number; stdout: string; stderr: string }> {
  if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
    const err = `[ERRO] Arquivo docker-compose não encontrado: ${composeFilePath}\r\n`;
    onChunk(err);
    return { code: 1, stdout: '', stderr: err };
  }

  const args = ['compose', '-f', ctx.toWslPath(composeFilePath)];
  if (options?.profile && isValidIdentifier(options.profile)) {
    args.push('--profile', options.profile);
  }
  args.push('restart');

  const { binary, finalArgs } = await ctx.resolveCommandAndArgs(args[0], args.slice(1));
  onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);
  const result = await runCapturedProcess(binary, finalArgs, { windowsHide: true }, onChunk);
  onChunk(
    result.code === 0
      ? `\r\n[SUCESSO] Serviços do compose reiniciados com sucesso!\r\n`
      : `\r\n[ERRO] Falha ao reiniciar serviços do compose (Código ${result.code}).\r\n`
  );
  return result;
}

/**
 * Obtém os logs agregados dos serviços do docker-compose.yml.
 */
export async function getComposeLogs(
  ctx: DockerContext,
  composeFilePath: string,
  options?: { profile?: string; lines?: number }
): Promise<string> {
  if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) {
    return 'Arquivo docker-compose não encontrado.';
  }

  const lines = Math.min(Math.max(options?.lines || 200, 10), 1000);
  const args = ['compose', '-f', ctx.toWslPath(composeFilePath)];
  if (options?.profile && isValidIdentifier(options.profile)) {
    args.push('--profile', options.profile);
  }
  args.push('logs', '--tail', String(lines));

  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs(args[0], args.slice(1));
    const { stdout, stderr } = await execFileAsync(binary, finalArgs, {
      timeout: 15000,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    });
    return stdout || stderr || '(Sem logs no momento)';
  } catch (err: any) {
    return err.stderr || err.stdout || `Erro ao obter logs do compose: ${err.message}`;
  }
}

/**
 * Lista o status dos serviços de um docker-compose.yml.
 */
export async function composeStatus(
  ctx: DockerContext,
  composeFilePath: string,
  profile?: string
): Promise<ComposeServiceStatus[]> {
  if (!isSafeLocalPath(composeFilePath) || !fs.existsSync(composeFilePath)) return [];

  try {
    const args = ['compose', '-f', ctx.toWslPath(composeFilePath)];
    if (profile && isValidIdentifier(profile)) args.push('--profile', profile);
    args.push('ps', '--format', 'json');

    const { binary, finalArgs } = await ctx.resolveCommandAndArgs(args[0], args.slice(1));
    const { stdout } = await execFileAsync(binary, finalArgs, { timeout: 8000, windowsHide: true });
    return parseComposeStatus(stdout);
  } catch {
    return [];
  }
}
