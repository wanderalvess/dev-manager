import {
  BundleDependencyCheckResult,
  KarafBundleDetails,
  KarafBundleInfo
} from '../../../shared/types';
import { parseBundleListOutput } from '../../utils/karafListParsers';
import { parseCapabilitiesWiredBundles, parseClauseList, parseManifestHeaders } from '../../utils/karafManifestUtils';
import type { KarafContext, KarafCredentials } from './karafContext';
import { noopChunk } from './karafContext';

/**
 * Executa 'bundle:list -s' e retorna a lista de bundles OSGi estruturada.
 */
export async function listBundlesParsed(
  ctx: KarafContext,
  credentials?: KarafCredentials
): Promise<KarafBundleInfo[]> {
  const res = await ctx.executeKarafCommand('bundle:list -s', noopChunk, credentials);
  if (res.code !== 0 || !res.stdout) return [];

  return parseBundleListOutput(res.stdout);
}

/**
 * Obtém detalhes estruturados do bundle inspecionando cabeçalhos do manifesto
 * e fiações de capacidades OSGi.
 */
export async function getBundleDetails(
  ctx: KarafContext,
  bundleId: string,
  credentials?: KarafCredentials
): Promise<KarafBundleDetails | null> {
  const cleanId = bundleId.trim();
  if (!/^\d+$/.test(cleanId)) return null;

  const headersRes = await ctx.executeKarafCommand(`bundle:headers ${cleanId}`, noopChunk, credentials);
  const capsRes = await ctx.executeKarafCommand(`bundle:capabilities ${cleanId}`, noopChunk, credentials);

  const rawHeaders = parseManifestHeaders(headersRes.stdout);
  const dependentBundles = parseCapabilitiesWiredBundles(capsRes.stdout);

  const symbolicName = rawHeaders['Bundle-SymbolicName']?.split(';')[0]?.trim() || '';
  const name = rawHeaders['Bundle-Name']?.trim() || symbolicName || `Bundle ${cleanId}`;
  const version = rawHeaders['Bundle-Version']?.trim() || '0.0.0';
  const location = rawHeaders['Bundle-Update-Location'] || rawHeaders['Bundle-Location'] || '';

  const exportedPackages = parseClauseList(rawHeaders['Export-Package']);
  const importedPackages = parseClauseList(rawHeaders['Import-Package']);
  const requiredBundles = parseClauseList(rawHeaders['Require-Bundle']);

  // Diagnóstico se o bundle estiver em estado não-ativo ou se diag estiver disponível
  let diag: string | undefined;
  const diagRes = await ctx.executeKarafCommand(`bundle:diag ${cleanId}`, noopChunk, credentials);
  if (diagRes.stdout && diagRes.stdout.trim().length > 0) {
    diag = diagRes.stdout.trim();
  }

  return {
    id: cleanId,
    name,
    symbolicName,
    version,
    state: 'Active', // Atualizado pelo chamador se houver lista
    location,
    exportedPackages,
    importedPackages,
    requiredBundles,
    dependentBundles,
    rawHeaders,
    diag
  };
}

/**
 * Verifica dependências de um bundle existente antes de desinstalar ou alterar,
 * alertando sobre potenciais impactos no runtime OSGi.
 */
export async function checkBundleDependencies(
  ctx: KarafContext,
  bundleId: string,
  credentials?: KarafCredentials
): Promise<BundleDependencyCheckResult> {
  const cleanId = bundleId.trim();
  const details = await ctx.getBundleDetails(cleanId, credentials);

  if (!details) {
    return {
      bundleId: cleanId,
      alreadyInstalled: false,
      dependentBundles: [],
      exportedPackages: [],
      riskLevel: 'LOW',
      warningMessage: 'Bundle não encontrado no runtime OSGi.',
      canProceed: true
    };
  }

  const hasDependents = details.dependentBundles.length > 0;
  const hasExports = details.exportedPackages.length > 0;

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let warningMessage = 'Nenhum bundle dependente detectado. É seguro prosseguir com a operação.';

  if (hasDependents) {
    riskLevel = 'HIGH';
    warningMessage = `Atenção: ${details.dependentBundles.length} bundle(s) dependem diretamente deste módulo. Desinstalá-lo quebrará esses módulos ativos.`;
  } else if (hasExports) {
    riskLevel = 'MEDIUM';
    warningMessage = `Este bundle exporta ${details.exportedPackages.length} pacote(s) OSGi. Outros módulos que utilizem essas classes podem ser afetados.`;
  }

  return {
    bundleId: cleanId,
    name: details.name,
    symbolicName: details.symbolicName,
    targetVersion: details.version,
    alreadyInstalled: true,
    dependentBundles: details.dependentBundles,
    exportedPackages: details.exportedPackages,
    riskLevel,
    warningMessage,
    canProceed: true
  };
}

/**
 * Verifica dependências e conflitos antes de instalar um novo bundle ou outra versão.
 * Identifica se já existe uma versão instalada e avalia o impacto da substituição.
 */
export async function checkInstallDependencies(
  ctx: KarafContext,
  target: { location?: string; symbolicName?: string; version?: string },
  credentials?: KarafCredentials
): Promise<BundleDependencyCheckResult> {
  const installed = await ctx.listBundlesParsed(credentials);
  const targetLoc = (target.location || '').trim();

  // Tentar extrair artifactId ou symbolicName a partir de mvn:groupId/artifactId/version
  let derivedName = (target.symbolicName || '').trim().toLowerCase();
  if (!derivedName && targetLoc.startsWith('mvn:')) {
    const parts = targetLoc.replace(/^mvn:/, '').split('/');
    if (parts.length >= 2) {
      derivedName = parts[1].toLowerCase();
    }
  }

  // Busca se já existe um bundle com mesmo nome ou symbolicName no container.
  // Checa os dois campos (não só symbolicName): o artifactId Maven do target
  // costuma bater com o "Name" exibido pelo bundle:list, mas raramente bate
  // com o Bundle-SymbolicName OSGi completo (ex: "br.com.totvs.winthor.faturamento"
  // vs artifactId "rotina-faturamento-service") — usar só um dos dois deixava
  // colisões reais passando batido.
  const matchesDerivedName = (value?: string): boolean => {
    const v = (value || '').toLowerCase();
    return !!derivedName && !!v && (v === derivedName || v.includes(derivedName) || derivedName.includes(v));
  };
  const existing = installed.find(
    (b) => matchesDerivedName(b.symbolicName) || matchesDerivedName(b.name)
  );

  if (existing) {
    const existingDetails = await ctx.getBundleDetails(existing.id, credentials);
    const dependents = existingDetails?.dependentBundles || [];
    const hasDependents = dependents.length > 0;

    return {
      bundleId: existing.id,
      targetUrl: target.location,
      targetVersion: target.version || 'desconhecida',
      name: existing.name,
      symbolicName: existing.symbolicName,
      alreadyInstalled: true,
      existingBundle: existing,
      dependentBundles: dependents,
      exportedPackages: existingDetails?.exportedPackages || [],
      riskLevel: hasDependents ? 'HIGH' : 'MEDIUM',
      warningMessage: `O bundle "${existing.name}" já está instalado (versão atual: ${existing.version}, nova versão alvo: ${target.version || 'desconhecida'}). ${
        hasDependents
          ? `${dependents.length} bundle(s) dependente(s) serão reconectados.`
          : 'Nenhum dependente ativo no momento.'
      }`,
      canProceed: true
    };
  }

  return {
    targetUrl: target.location,
    targetVersion: target.version,
    alreadyInstalled: false,
    dependentBundles: [],
    exportedPackages: [],
    riskLevel: 'LOW',
    warningMessage: 'Novo bundle no container OSGi. Nenhuma colisão com versão existente detectada.',
    canProceed: true
  };
}
