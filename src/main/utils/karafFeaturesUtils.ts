import { KarafFeatureRepoInfo } from '../../shared/types';

/**
 * Analisa a saída do comando feature:repo-list e extrai a lista estruturada de repositórios registrados.
 */
export function parseFeatureRepoListOutput(stdout: string): KarafFeatureRepoInfo[] {
  if (!stdout) return [];
  const lines = stdout.split(/\r?\n/);
  const repos: KarafFeatureRepoInfo[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('===') ||
      trimmed.startsWith('---') ||
      trimmed.startsWith('───') ||
      trimmed.toLowerCase().includes('repository |') ||
      trimmed.toLowerCase().includes('repository │') ||
      trimmed.toLowerCase().startsWith('repository ')
    ) {
      continue;
    }

    if (trimmed.includes('|') || trimmed.includes('│')) {
      const parts = trimmed.split(/[|│]/).map((p) => p.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const url = parts[1];
        if (name.toLowerCase() === 'repository' || !url) continue;

        const isWinthor = /winthor|totvs/i.test(name) || /winthor|totvs/i.test(url);
        repos.push({ name, url, isWinthor });
        continue;
      }
    }

    // Formato com espaços (a coluna mais larga fica separada por apenas 1 espaço da URI)
    const spaceMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\s+(mvn:[^\s]+|file:[^\s]+|http[s]?:[^\s]+)/);
    if (spaceMatch) {
      const name = spaceMatch[1];
      const url = spaceMatch[2];
      const isWinthor = /winthor|totvs/i.test(name) || /winthor|totvs/i.test(url);
      repos.push({ name, url, isWinthor });
    }
  }

  return repos;
}
