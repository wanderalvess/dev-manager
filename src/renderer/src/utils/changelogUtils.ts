/**
 * Extrai apenas a seção da versão mais recente de um CHANGELOG.md no formato Keep a Changelog
 * (`## [x.y.z] - data`), para exibir um resumo "novidades desta versão" sem o histórico inteiro.
 * Retorna `null` se nenhum cabeçalho de versão for encontrado.
 */
export function extractLatestChangelogSection(content: string | null | undefined): string | null {
  if (!content) return null;
  const lines = content.split('\n');
  const startIndex = lines.findIndex((line) => /^##\s*\[/.test(line.trim()));
  if (startIndex === -1) return null;

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^##\s*\[/.test(lines[i].trim())) {
      endIndex = i;
      break;
    }
  }

  return lines.slice(startIndex, endIndex).join('\n').trim();
}

/** Extrai só o número de versão do cabeçalho (ex: "## [1.14.0] - 2026-09-23" -> "1.14.0"). */
export function extractChangelogVersion(section: string | null | undefined): string | null {
  if (!section) return null;
  const match = section.match(/^##\s*\[([^\]]+)\]/);
  return match ? match[1] : null;
}
