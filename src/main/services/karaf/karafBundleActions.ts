import {
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest
} from '../../../shared/types';
import { isSafeKarafCommand } from '../../utils/security';
import { ChunkHandler, KarafActionResult, KarafContext, KarafCredentials } from './karafContext';

/**
 * Instala um novo bundle no Karaf a partir de coordenada Maven ou arquivo local.
 */
export async function installBundle(
  ctx: KarafContext,
  request: InstallBundleRequest,
  onChunk: ChunkHandler
): Promise<{ success: boolean; bundleId?: string; state?: string; diag?: string; output: string }> {
  let loc = (request.location || '').trim();
  if (!loc) {
    return { success: false, output: 'Localização ou coordenada do bundle não informada.' };
  }

  // Normaliza caminhos de arquivo locais no Windows para file:/
  if (!loc.startsWith('mvn:') && !loc.startsWith('file:') && !loc.startsWith('http:') && !loc.startsWith('https:')) {
    loc = `file:/${loc.replace(/\\/g, '/')}`;
  }

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
    await ctx.executeKarafCommand(`bundle:refresh ${newId}`, () => {}, request.credentials);
    const diagRes = await ctx.executeKarafCommand(`bundle:diag ${newId}`, () => {}, request.credentials);
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
 * Reinstala / atualiza um bundle no runtime OSGi.
 * Opcionalmente executa mvn clean install previamente e recarrega o bundle via bundle:update.
 */
export async function reinstallBundle(
  ctx: KarafContext,
  request: ReinstallBundleRequest,
  onChunk: ChunkHandler
): Promise<{ success: boolean; state?: string; diag?: string; output: string }> {
  const cleanId = request.bundleId.trim();
  if (!/^\d+$/.test(cleanId)) {
    return { success: false, output: 'ID do bundle inválido.' };
  }

  // 1. Compilação Maven opcional se solicitado
  if (request.rebuild && request.projectPath) {
    onChunk(`\r\n[1/3] Compilando projeto Maven antes de reinstalar...\r\n`);
    const buildRes = await ctx.runMavenBuild(request.projectPath, true, onChunk);
    if (buildRes.code !== 0) {
      return { success: false, output: 'Falha na compilação Maven prévia. Reinstalação cancelada.' };
    }
  }

  // 2. Atualização do bundle via Karaf
  onChunk(`\r\n[2/3] Atualizando bundle ${cleanId} no container OSGi...\r\n`);
  let updateCmd = `bundle:update ${cleanId}`;
  if (request.location && request.location.trim()) {
    let loc = request.location.trim();
    if (!loc.startsWith('mvn:') && !loc.startsWith('file:') && !loc.startsWith('http:')) {
      loc = `file:/${loc.replace(/\\/g, '/')}`;
    }
    updateCmd = `bundle:update ${cleanId} "${loc}"`;
  }

  let output = '';
  const updateRes = await ctx.executeKarafCommand(
    updateCmd,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    request.credentials
  );

  if (updateRes.code !== 0) {
    return { success: false, output: output || updateRes.stderr || 'Falha no bundle:update' };
  }

  // 3. Atualizar fiações e garantir inicialização
  onChunk(`\r\n[3/3] Atualizando fiações (bundle:refresh) e iniciando bundle...\r\n`);
  await ctx.executeKarafCommand(`bundle:refresh ${cleanId}`, onChunk, request.credentials);
  await ctx.executeKarafCommand(`bundle:start ${cleanId}`, onChunk, request.credentials);

  // Checagem de diagnóstico
  let diag: string | undefined;
  const diagRes = await ctx.executeKarafCommand(`bundle:diag ${cleanId}`, () => {}, request.credentials);
  if (diagRes.stdout && diagRes.stdout.trim().length > 0) {
    diag = diagRes.stdout.trim();
  }

  return {
    success: true,
    diag,
    output
  };
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

  let target = request.newVersionOrLocation.trim();
  if (!target) {
    return { success: false, output: 'Nova versão ou localização não informada.' };
  }

  if (!target.startsWith('mvn:') && !target.startsWith('file:') && !target.startsWith('http:')) {
    target = `file:/${target.replace(/\\/g, '/')}`;
  }

  const cmd = `bundle:update ${cleanId} "${target}"`;
  let output = '';
  const res = await ctx.executeKarafCommand(
    cmd,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    request.credentials
  );

  if (res.code === 0) {
    await ctx.executeKarafCommand(`bundle:refresh ${cleanId}`, (chunk) => {
      output += chunk;
      onChunk(chunk);
    }, request.credentials);
    await ctx.executeKarafCommand(`bundle:start ${cleanId}`, (chunk) => {
      output += chunk;
      onChunk(chunk);
    }, request.credentials);
  }

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr
  };
}
