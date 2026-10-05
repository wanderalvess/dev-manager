import { KarafBundleDependent } from '../../shared/types';

/**
 * Utilitário: quebra cláusulas de pacotes do manifesto OSGi respeitando aspas e parênteses.
 */
export function parseClauseList(val?: string): string[] {
  if (!val || typeof val !== 'string') return [];
  const results: string[] = [];
  let current = '';
  let inQuotes = false;
  let inParentheses = 0;

  for (let i = 0; i < val.length; i++) {
    const char = val[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === '(' || char === '[') {
      inParentheses++;
    } else if (char === ')' || char === ']') {
      if (inParentheses > 0) inParentheses--;
    }

    if (char === ',' && !inQuotes && inParentheses === 0) {
      const trimmed = current.trim();
      if (trimmed) results.push(trimmed);
      current = '';
    } else {
      current += char;
    }
  }
  const lastTrimmed = current.trim();
  if (lastTrimmed) results.push(lastTrimmed);

  return results;
}

/**
 * Utilitário: analisa saída do comando bundle:headers e extrai mapa de chaves/valores.
 */
export function parseManifestHeaders(stdout: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!stdout) return headers;
  const lines = stdout.split(/\r?\n/);
  let currentKey = '';

  for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
    if (match) {
      currentKey = match[1].trim();
      headers[currentKey] = match[2].trim();
    } else if (currentKey && (line.startsWith('\t') || line.startsWith('  '))) {
      const continuation = line.trim();
      if (continuation) {
        headers[currentKey] = headers[currentKey]
          ? `${headers[currentKey]} ${continuation}`
          : continuation;
      }
    }
  }

  return headers;
}

/**
 * Utilitário: analisa saída de bundle:capabilities e extrai lista de bundles dependentes conectados.
 */
export function parseCapabilitiesWiredBundles(stdout: string): KarafBundleDependent[] {
  const dependents: KarafBundleDependent[] = [];
  if (!stdout) return dependents;

  const lines = stdout.split(/\r?\n/);
  let inWiredSection = false;
  let currentReason = 'osgi.wiring';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('osgi.')) {
      currentReason = trimmed.split(';')[0] || 'osgi.wiring';
      inWiredSection = false;
    }

    if (trimmed.toLowerCase().includes('wired to:')) {
      inWiredSection = true;
      continue;
    }

    if (inWiredSection) {
      if (!line.startsWith(' ') && !line.startsWith('\t') && !trimmed.startsWith('[')) {
        inWiredSection = false;
        continue;
      }

      const match = trimmed.match(/^\[\s*(\d+)\s*\]\s*([^([\r\n]+)(?:\s*\(([^)]+)\))?/);
      if (match) {
        const id = match[1].trim();
        const name = match[2].trim();
        const version = match[3]?.trim();
        if (!dependents.some((d) => d.id === id)) {
          dependents.push({
            id,
            name: name || `Bundle ${id}`,
            version,
            reason: currentReason
          });
        }
      }
    }
  }

  return dependents;
}
