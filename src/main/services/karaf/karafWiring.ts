import type { KarafBundleInfo } from '../../../shared/types';
import { noopChunk, type KarafContext, type KarafCredentials } from './karafContext';

export interface WiringConflict {
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
  bundleIds: string[];
}

export interface WiringReport {
  healthy: boolean;
  summary: {
    totalBundles: number;
    activeBundles: number;
    nonActiveBundlesCount: number;
    duplicateSymbolicNamesCount: number;
    highSeverityConflicts: number;
  };
  conflicts: WiringConflict[];
  unresolvedDiagnostics: Array<{ id: string; name: string; state: string; diag?: string }>;
  duplicates: Array<{
    symbolicName: string;
    instances: Array<{ id: string; version: string; state: string }>;
    hasMultipleActive: boolean;
  }>;
}

/** Máximo de bundles não ativos que recebem `bundle:diag` (cada um é um comando SSH). */
const MAX_DIAGNOSED_BUNDLES = 5;

/** Agrupa por symbolicName e devolve só os que têm mais de uma versão instalada. */
export function findDuplicateBundles(bundles: KarafBundleInfo[]): WiringReport['duplicates'] {
  const byName = new Map<string, KarafBundleInfo[]>();
  for (const b of bundles) {
    const key = (b.symbolicName || b.name || '').trim();
    if (!key || key.startsWith('Bundle ')) continue;
    byName.set(key, [...(byName.get(key) ?? []), b]);
  }
  return Array.from(byName.entries())
    .filter(([, list]) => list.length > 1)
    .map(([symbolicName, list]) => ({
      symbolicName,
      instances: list.map((b) => ({ id: b.id, version: b.version, state: b.state })),
      hasMultipleActive: list.filter((b) => b.state === 'Active').length > 1
    }));
}

export function buildWiringConflicts(
  duplicates: WiringReport['duplicates'],
  nonActive: KarafBundleInfo[]
): WiringConflict[] {
  const conflicts: WiringConflict[] = [];
  for (const dup of duplicates) {
    if (dup.hasMultipleActive) {
      conflicts.push({
        severity: 'high',
        title: `Múltiplas versões ativas de ${dup.symbolicName}`,
        description: `O bundle '${dup.symbolicName}' possui ${dup.instances.length} versões instaladas sendo mais de uma no estado 'Active'. Isso pode causar ClassCastException ou conflito de export/import package OSGi.`,
        recommendation: `Desinstale a versão obsoleta com 'bundle:uninstall <ID>' ou use a ferramenta 'karaf_uninstall_bundle'.`,
        bundleIds: dup.instances.map((i) => i.id)
      });
    } else {
      conflicts.push({
        severity: 'medium',
        title: `Múltiplas instâncias instaladas de ${dup.symbolicName}`,
        description: `Existem ${dup.instances.length} versões registradas (${dup.instances.map((i) => `${i.version} [${i.state}]`).join(', ')}).`,
        recommendation: `Verifique se as versões inativas são necessárias ou remova-as para economizar memória e evitar ambiguidades.`,
        bundleIds: dup.instances.map((i) => i.id)
      });
    }
  }
  for (const b of nonActive) {
    conflicts.push({
      severity: b.state === 'Installed' || b.state === 'Resolved' ? 'medium' : 'low',
      title: `Bundle ${b.id} (${b.symbolicName || b.name}) em estado '${b.state}'`,
      description: `O bundle não está ativo no runtime OSGi.`,
      recommendation: `Execute 'bundle:diag ${b.id}' para verificar dependências ausentes (Unsatisfied Requirements) ou 'bundle:start ${b.id}' para iniciá-lo.`,
      bundleIds: [b.id]
    });
  }
  return conflicts;
}

/**
 * Detecta bundles não ativos e versões duplicadas do mesmo symbolicName. Devolve `null` quando a
 * lista de bundles não pôde ser obtida (Karaf offline ou credenciais erradas).
 */
export async function detectWiringConflicts(
  ctx: KarafContext,
  credentials?: KarafCredentials
): Promise<WiringReport | null> {
  const bundles = await ctx.listBundlesParsed(credentials);
  if (!bundles || bundles.length === 0) return null;

  const nonActive = bundles.filter((b) => b.state !== 'Active');
  const duplicates = findDuplicateBundles(bundles);

  const unresolvedDiagnostics: WiringReport['unresolvedDiagnostics'] = [];
  for (const b of nonActive.slice(0, MAX_DIAGNOSED_BUNDLES)) {
    const diagRes = await ctx.executeKarafCommand(`bundle:diag ${b.id}`, noopChunk, credentials).catch(() => null);
    unresolvedDiagnostics.push({
      id: b.id,
      name: b.symbolicName || b.name,
      state: b.state,
      diag: diagRes?.stdout?.trim() || undefined
    });
  }

  const conflicts = buildWiringConflicts(duplicates, nonActive);
  const highSeverityConflicts = conflicts.filter((c) => c.severity === 'high').length;

  return {
    healthy: highSeverityConflicts === 0 && nonActive.length === 0,
    summary: {
      totalBundles: bundles.length,
      activeBundles: bundles.length - nonActive.length,
      nonActiveBundlesCount: nonActive.length,
      duplicateSymbolicNamesCount: duplicates.length,
      highSeverityConflicts
    },
    conflicts,
    unresolvedDiagnostics,
    duplicates
  };
}
