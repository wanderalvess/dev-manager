import { KarafBundleInfo, KarafFeatureInfo } from '../../shared/types';

/**
 * Mapeia a coluna de estado textual do Karaf (ex: "Active", "Resolved") para o
 * enum tipado de KarafBundleInfo. Compartilhado pelos dois formatos de saída
 * de "bundle:list" (colunas por pipe e por colchetes) parseados em listBundlesParsed.
 */
export function parseBundleState(stateStr: string): KarafBundleInfo['state'] {
  if (/Active/i.test(stateStr)) return 'Active';
  if (/Resolved/i.test(stateStr)) return 'Resolved';
  if (/Installed/i.test(stateStr)) return 'Installed';
  if (/Starting/i.test(stateStr)) return 'Starting';
  if (/Stopping/i.test(stateStr)) return 'Stopping';
  return 'Unknown';
}

/** Analisa a saída de "bundle:list -s" (stdout já validado como não vazio). */
export function parseBundleListOutput(stdout: string): KarafBundleInfo[] {
  const lines = stdout.split(/\r?\n/);
  const bundles: KarafBundleInfo[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('START LEVEL') ||
      trimmed.includes('ID |') ||
      trimmed.includes('ID │') ||
      trimmed.startsWith('===')
    ) {
      continue;
    }

    // Formato colunas por pipe (| ou │)
    if (trimmed.includes('|') || trimmed.includes('│')) {
      const parts = trimmed.split(/[|│]/).map((p) => p.trim());
      if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
        const id = parts[0];
        const version = parts[parts.length - 2] || '';
        const name = parts[parts.length - 1] || '';
        bundles.push({ id, state: parseBundleState(parts[1]), level: parts[2], version, name, symbolicName: name });
        continue;
      }
    }

    // Formato colchetes: [ 123] [Active     ] [            ] [   80] My Name (1.0.0)
    const bracketMatch = trimmed.match(
      /^\[\s*(\d+)\]\s*\[([^\]]+)\]\s*(?:\[([^\]]*)\])?\s*\[\s*(\d+)\s*\]\s*(.+?)(?:\s*\(([^)]+)\))?$/
    );
    if (bracketMatch) {
      const id = bracketMatch[1];
      const blueprint = bracketMatch[3]?.trim();
      const level = bracketMatch[4]?.trim();
      const name = bracketMatch[5]?.trim() || '';
      const version = bracketMatch[6]?.trim() || '';

      bundles.push({ id, state: parseBundleState(bracketMatch[2].trim()), blueprint, level, name, version, symbolicName: name });
    }
  }

  return bundles;
}

/** Analisa a saída de "feature:list -i" (todas as linhas listadas são marcadas como instaladas). */
export function parseInstalledFeaturesOutput(stdout: string): KarafFeatureInfo[] {
  const lines = stdout.split(/\r?\n/);
  const features: KarafFeatureInfo[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('===') ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('───') ||
      trimmed.includes('Name |') ||
      trimmed.includes('Name │') ||
      trimmed.toLowerCase().startsWith('name ')
    ) {
      continue;
    }

    // Formato colunas por pipe (| ou │)
    if (trimmed.includes('|') || trimmed.includes('│')) {
      const parts = trimmed.split(/[|│]/).map((p) => p.trim());
      if (parts.length >= 4) {
        const name = parts[0];
        if (name.toLowerCase() === 'name') continue;

        const version = parts[1] || '';
        const required = parts[2]?.toLowerCase() === 'x' || parts[2]?.toLowerCase() === 'true';
        const state = parts[3] || 'Started';
        const repository = parts[4] || '';
        const description = parts.slice(5).join(' ') || '';

        const isWinthor = /winthor|totvs/i.test(name) || /winthor|totvs/i.test(repository);

        features.push({
          name,
          version,
          required,
          state,
          repository,
          description,
          isWinthor,
          installed: true
        });
      }
    }
  }

  return features;
}

/** Analisa a saída de "feature:list" (instaladas e disponíveis). */
export function parseAllFeaturesOutput(stdout: string): KarafFeatureInfo[] {
  const lines = stdout.split(/\r?\n/);
  const features: KarafFeatureInfo[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('===') ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('───') ||
      trimmed.includes('Name |') ||
      trimmed.includes('Name │') ||
      trimmed.toLowerCase().startsWith('name ')
    ) {
      continue;
    }

    if (trimmed.includes('|') || trimmed.includes('│')) {
      const parts = trimmed.split(/[|│]/).map((p) => p.trim());
      if (parts.length >= 4) {
        const name = parts[0];
        if (name.toLowerCase() === 'name') continue;

        const version = parts[1] || '';
        const required = parts[2]?.toLowerCase() === 'x' || parts[2]?.toLowerCase() === 'true';
        const state = parts[3] || 'Uninstalled';
        const repository = parts[4] || '';
        const description = parts.slice(5).join(' ') || '';
        const isWinthor = /winthor|totvs/i.test(name) || /winthor|totvs/i.test(repository);

        const isInstalled = state.toLowerCase() === 'started' || state.toLowerCase() === 'installed';

        features.push({
          name,
          version,
          required,
          state,
          repository,
          description,
          isWinthor,
          installed: isInstalled
        });
      }
    }
  }

  return features;
}
