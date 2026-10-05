import { KarafFeatureInfo, KarafFeatureRepoInfo } from '../../../shared/types';
import { isSafeKarafCommand } from '../../utils/security';
import { parseFeatureRepoListOutput } from '../../utils/karafFeaturesUtils';
import { parseAllFeaturesOutput, parseInstalledFeaturesOutput } from '../../utils/karafListParsers';
import type { ChunkHandler, KarafActionResult, KarafContext, KarafCredentials } from './karafContext';

/**
 * Executa "feature:list -i" e retorna a lista estruturada de Features Karaf instaladas.
 */
export async function listInstalledFeatures(
  ctx: KarafContext,
  credentials?: KarafCredentials
): Promise<KarafFeatureInfo[]> {
  const dummyChunk = () => {};
  const res = await ctx.executeKarafCommand('feature:list -i', dummyChunk, credentials);
  if (res.code !== 0 || !res.stdout) return [];

  return parseInstalledFeaturesOutput(res.stdout);
}

/**
 * Lista todas as Features Karaf (instaladas e disponíveis em repositórios registrados).
 */
export async function listAllFeatures(
  ctx: KarafContext,
  installedOnly: boolean,
  credentials?: KarafCredentials
): Promise<KarafFeatureInfo[]> {
  const cmd = installedOnly ? 'feature:list -i' : 'feature:list';
  const dummyChunk = () => {};
  const res = await ctx.executeKarafCommand(cmd, dummyChunk, credentials);
  if (res.code !== 0 || !res.stdout) return [];

  return parseAllFeaturesOutput(res.stdout);
}

/**
 * Desinstala uma Feature Karaf de forma definitiva utilizando `feature:uninstall -r`.
 * A flag -r remove a feature e limpa/desmonta os bundles associados, impedindo
 * que retornem na reinicialização do container Karaf.
 */
export async function uninstallFeature(
  ctx: KarafContext,
  featureName: string,
  version: string | undefined,
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  const cleanName = featureName.trim();
  if (!cleanName || !isSafeKarafCommand(cleanName)) {
    return { success: false, output: 'Nome da feature inválido ou não seguro.' };
  }

  const cleanVer = version?.trim();
  const target = cleanVer && isSafeKarafCommand(cleanVer) ? `${cleanName}/${cleanVer}` : cleanName;
  const command = `feature:uninstall -r ${target}`;

  let output = '';
  const res = await ctx.executeKarafCommand(
    command,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    credentials
  );

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr
  };
}

/**
 * Instala / atualiza uma Feature Karaf utilizando `feature:install -r -u`.
 */
export async function installFeature(
  ctx: KarafContext,
  featureName: string,
  version: string | undefined,
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  const cleanName = featureName.trim();
  if (!cleanName || !isSafeKarafCommand(cleanName)) {
    return { success: false, output: 'Nome da feature inválido ou não seguro.' };
  }

  const cleanVer = version?.trim();
  const target = cleanVer && isSafeKarafCommand(cleanVer) ? `${cleanName}/${cleanVer}` : cleanName;
  const command = `feature:install -r -u ${target}`;

  let output = '';
  const res = await ctx.executeKarafCommand(
    command,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    credentials
  );

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr
  };
}

/**
 * Executa "feature:repo-list" e retorna a lista de repositórios Maven/XML registrados.
 */
export async function listFeatureRepositories(
  ctx: KarafContext,
  credentials?: KarafCredentials
): Promise<KarafFeatureRepoInfo[]> {
  const dummyChunk = () => {};
  const res = await ctx.executeKarafCommand('feature:repo-list', dummyChunk, credentials);
  if (res.code !== 0 || !res.stdout) return [];
  return parseFeatureRepoListOutput(res.stdout);
}

/**
 * Registra um novo repositório de features via "feature:repo-add <url>".
 */
export async function addFeatureRepository(
  ctx: KarafContext,
  url: string,
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  const cleanUrl = url.trim();
  if (!cleanUrl || !isSafeKarafCommand(cleanUrl)) {
    return { success: false, output: 'URL de repositório inválida ou com caracteres proibidos.' };
  }

  const command = `feature:repo-add "${cleanUrl}"`;
  let output = '';
  const res = await ctx.executeKarafCommand(
    command,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    credentials,
    120000
  );

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr
  };
}

/**
 * Remove um repositório de features via "feature:repo-remove <nameOrUrl>".
 */
export async function removeFeatureRepository(
  ctx: KarafContext,
  nameOrUrl: string,
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  const cleanTarget = nameOrUrl.trim();
  if (!cleanTarget || !isSafeKarafCommand(cleanTarget)) {
    return { success: false, output: 'Nome ou URL de repositório inválido.' };
  }

  const command = `feature:repo-remove "${cleanTarget}"`;
  let output = '';
  const res = await ctx.executeKarafCommand(
    command,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    credentials
  );

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr
  };
}

/**
 * Atualiza as features de um repositório via "feature:repo-refresh <nameOrUrl>".
 */
export async function refreshFeatureRepository(
  ctx: KarafContext,
  nameOrUrl: string | undefined,
  credentials: KarafCredentials | undefined,
  onChunk: ChunkHandler
): Promise<KarafActionResult> {
  const cleanTarget = (nameOrUrl || '').trim();
  if (cleanTarget && !isSafeKarafCommand(cleanTarget)) {
    return { success: false, output: 'Nome ou URL de repositório inválido.' };
  }

  const command = cleanTarget ? `feature:repo-refresh "${cleanTarget}"` : 'feature:repo-refresh';
  let output = '';
  const res = await ctx.executeKarafCommand(
    command,
    (chunk) => {
      output += chunk;
      onChunk(chunk);
    },
    credentials,
    60000
  );

  return {
    success: res.code === 0,
    output: output || res.stdout || res.stderr
  };
}
