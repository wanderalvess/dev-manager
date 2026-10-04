import type { KarafFeatureInfo } from '../../../shared/types';

/**
 * Uma feature conta como instalada quando o backend informa `installed`; caso contrário
 * inferimos pelo estado textual (o Karaf reporta Started/Installed).
 */
export function isFeatureInstalled(feat: KarafFeatureInfo): boolean {
  return (
    feat.installed ?? (feat.state?.toLowerCase() === 'started' || feat.state?.toLowerCase() === 'installed')
  );
}

export function countInstalledFeatures(features: KarafFeatureInfo[]): number {
  return features.filter((f) => isFeatureInstalled(f)).length;
}
