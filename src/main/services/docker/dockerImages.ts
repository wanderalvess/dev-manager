import fs from 'fs';
import { isSafeDockerImageTag, isSafeLocalPath } from '../../utils/security';
import { runCapturedProcess } from '../../utils/process';
import type { DockerContext } from './dockerContext';

/**
 * Builda uma imagem de container a partir de um diretório de contexto, com saída em streaming.
 */
export async function buildImage(
  ctx: DockerContext,
  contextPath: string,
  imageTag: string,
  dockerfile: string | undefined,
  onChunk: (chunk: string) => void
): Promise<{ code: number; stdout: string; stderr: string }> {
  if (!isSafeLocalPath(contextPath) || !fs.existsSync(contextPath)) {
    const err = `[ERRO] Diretório de contexto do container não encontrado: ${contextPath}\r\n`;
    onChunk(err);
    return { code: 1, stdout: '', stderr: err };
  }
  if (!isSafeDockerImageTag(imageTag)) {
    const err = `[ERRO] Tag de imagem de container inválida: ${imageTag}\r\n`;
    onChunk(err);
    return { code: 1, stdout: '', stderr: err };
  }

  const { binary, finalArgs } = await ctx.resolveCommandAndArgs('build', [
    '-t',
    imageTag,
    ...(dockerfile && dockerfile.trim() ? ['-f', ctx.toWslPath(dockerfile.trim())] : []),
    ctx.toWslPath(contextPath)
  ]);

  onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);
  const result = await runCapturedProcess(binary, finalArgs, { cwd: contextPath, windowsHide: true }, onChunk);
  onChunk(
    result.code === 0
      ? `\r\n[SUCESSO] Imagem "${imageTag}" construída com sucesso!\r\n`
      : `\r\n[ERRO] Falha ao construir imagem "${imageTag}" (Código ${result.code}).\r\n`
  );
  return result;
}

/**
 * Envia (push) uma imagem de container para o registry configurado na tag, com saída em streaming.
 */
export async function pushImage(
  ctx: DockerContext,
  imageTag: string,
  onChunk: (chunk: string) => void
): Promise<{ code: number; stdout: string; stderr: string }> {
  if (!isSafeDockerImageTag(imageTag)) {
    const err = `[ERRO] Tag de imagem de container inválida: ${imageTag}\r\n`;
    onChunk(err);
    return { code: 1, stdout: '', stderr: err };
  }

  const { binary, finalArgs } = await ctx.resolveCommandAndArgs('push', [imageTag]);
  onChunk(`> ${binary} ${finalArgs.join(' ')}\r\n\r\n`);

  const result = await runCapturedProcess(binary, finalArgs, { windowsHide: true }, onChunk);
  onChunk(
    result.code === 0
      ? `\r\n[SUCESSO] Imagem "${imageTag}" enviada com sucesso!\r\n`
      : `\r\n[ERRO] Falha ao enviar imagem "${imageTag}" (Código ${result.code}).\r\n`
  );
  return result;
}
