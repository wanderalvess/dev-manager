import {
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest
} from '../../../shared/types';
import { isSafeKarafCommand } from '../../utils/security';
import { ChunkHandler, KarafActionResult, KarafContext, KarafCredentials, noopChunk } from './karafContext';

/** Mantém mvn:/file:/http(s): como estão e converte caminho local em file:/. */
export function normalizeBundleLocation(location: string): string {
  const loc = location.trim();
  if (/^(mvn|file|https?):/.test(loc)) return loc;
  return `file:/${loc.replace(/\\/g, '/')}`;
}

/**
 * Instala um novo bundle no Karaf a partir de coordenada Maven ou arquivo local.
 */
export async function installBundle(
  ctx: KarafContext,
  request: InstallBundleRequest,
  onChunk: ChunkHandler
): Promise<{ success: boolean; bundleId?: string; diag?: string; output: string }> {
  if (!(request.location || '').trim()) {
    return { success: false, output: 'Localização ou coordenada do bundle não informada.' };
  }
  const loc = normalizeBundleLocation(request.location);

  const flag = request.startImmediately !== false ? '-s ' : '';
  const cmd = `bundle:install ${flag}"${loc}"`;

  if (!isSafeKarafCommand(cmd)) {
    return { success: false, output: 'Comando de instalação contém caracteres inválidos.' };
  }

  onChunk(`> ${cmd}\r\n`);
  let output = '';
  const res = await ctx.executeKarafCommand(
    cmd,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    request.credentials
  );

  if (res.code !== 0) {
    return { success: false, output: output || res.stderr || 'Falha ao instalar bundle' };
  }

  // Tentar extrair o ID do novo bundle retornado pelo Karaf (ex: "Bundle ID: 123" ou apenas "123")
  const match = (res.stdout || '').match(/(?:Bundle ID:\s*|ID:\s*|^)\s*(\d+)/m);
  const newId = match ? match[1] : undefined;

  let diag: string | undefined;
  if (newId) {
    await ctx.executeKarafCommand(`bundle:refresh ${newId}`, noopChunk, request.credentials);
    const diagRes = await ctx.executeKarafCommand(`bundle:diag ${newId}`, noopChunk, request.credentials);
    if (diagRes.stdout && diagRes.stdout.trim().length > 0) {
      diag = diagRes.stdout.trim();
    }
  }

  return {
    success: true,
    bundleId: newId,
    diag,
    output: output || res.stdout
  };
}

/**
 * Desinstala um bundle existente do runtime OSGi e limpa fiações via bundle:refresh.
 */
export async function uninstallBundle(
  ctx: KarafContext,
  bundleId: string,
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  const cleanId = bundleId.trim();
  if (!/^\d+$/.test(cleanId)) {
    return { success: false, output: 'ID do bundle inválido.' };
  }

  let output = '';
  const res = await ctx.executeKarafCommand(
    `bundle:uninstall ${cleanId}`,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    credentials
  );

  if (res.code === 0) {
    await ctx.executeKarafCommand('bundle:refresh', (chunk) => {
      output += chunk;
      onChunk(chunk);
    }, credentials);
  }

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr
  };
}

/**
 * `bundle:update` seguido de refresh e start. Só é sucesso se o update e o start passarem: um bundle
 * atualizado que não inicia não pode ser reportado como reinstalado.
 */
async function updateRefreshAndStart(
  ctx: KarafContext,
  bundleId: string,
  location: string | undefined,
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  let output = '';
  const run = (cmd: string) =>
    ctx.executeKarafCommand(
      cmd,
      (chunk) => {
        output += chunk;
        onChunk(chunk);
      },
      credentials
    );

  const updateRes = await run(location ? `bundle:update ${bundleId} "${location}"` : `bundle:update ${bundleId}`);
  if (updateRes.code !== 0) {
    return { success: false, output: output || updateRes.stderr || 'Falha no bundle:update' };
  }

  onChunk('\r\nAtualizando fiações (bundle:refresh) e iniciando bundle...\r\n');
  await run(`bundle:refresh ${bundleId}`);
  const startRes = await run(`bundle:start ${bundleId}`);
  if (startRes.code !== 0) {
    const reason = startRes.stderr || 'bundle:start falhou';
    return { success: false, output: `${output}\nBundle atualizado, mas não iniciou: ${reason}`.trim() };
  }
  return { success: true, output };
}

/**
 * Reinstala / atualiza um bundle no runtime OSGi.
 * Opcionalmente executa mvn clean install previamente e recarrega o bundle via bundle:update.
 */
export async function reinstallBundle(
  ctx: KarafContext,
  request: ReinstallBundleRequest,
  onChunk: ChunkHandler
): Promise<{ success: boolean; diag?: string; output: string }> {
  const cleanId = request.bundleId.trim();
  if (!/^\d+$/.test(cleanId)) {
    return { success: false, output: 'ID do bundle inválido.' };
  }

  if (request.rebuild && request.projectPath) {
    onChunk('\r\nCompilando projeto Maven antes de reinstalar...\r\n');
    const buildRes = await ctx.runMavenBuild(request.projectPath, true, onChunk);
    if (buildRes.code !== 0) {
      return { success: false, output: 'Falha na compilação Maven prévia. Reinstalação cancelada.' };
    }
  }

  onChunk(`\r\nAtualizando bundle ${cleanId} no container OSGi...\r\n`);
  const location = request.location?.trim() ? normalizeBundleLocation(request.location) : undefined;
  const result = await updateRefreshAndStart(ctx, cleanId, location, request.credentials, onChunk);

  let diag: string | undefined;
  if (result.success) {
    const diagRes = await ctx.executeKarafCommand(`bundle:diag ${cleanId}`, noopChunk, request.credentials);
    if (diagRes.stdout && diagRes.stdout.trim().length > 0) {
      diag = diagRes.stdout.trim();
    }
  }
  return { ...result, diag };
}

/**
 * Atualiza a versão de um bundle existente especificando uma nova versão ou localização.
 */
export async function updateBundleVersion(
  ctx: KarafContext,
  request: UpdateBundleVersionRequest,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  const cleanId = request.bundleId.trim();
  if (!/^\d+$/.test(cleanId)) {
    return { success: false, output: 'ID do bundle inválido.' };
  }
  if (!request.newVersionOrLocation.trim()) {
    return { success: false, output: 'Nova versão ou localização não informada.' };
  }
  return updateRefreshAndStart(
    ctx,
    cleanId,
    normalizeBundleLocation(request.newVersionOrLocation),
    request.credentials,
    onChunk
  );
}
