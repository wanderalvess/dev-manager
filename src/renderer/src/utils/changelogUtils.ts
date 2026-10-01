export interface ChangelogVersion {
  version: string;
  date?: string;
  title: string;
  content: string;
  rawHeader: string;
}

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

/**
 * Analisa e particiona todo o conteúdo de um CHANGELOG.md em uma lista ordenada de versões individuais.
 * Retorna uma lista com a versão mais recente em primeiro lugar (index 0).
 */
export function parseChangelogVersions(content: string | null | undefined): ChangelogVersion[] {
  if (!content) return [];
  const lines = content.split('\n');
  const headerIndices: { lineIndex: number; version: string; date?: string; rawHeader: string }[] = [];

  const headerRegex = /^##\s*\[([^\]]+)\](?:\s*-\s*([^\n\r]+))?/;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const match = trimmed.match(headerRegex);
    if (match) {
      headerIndices.push({
        lineIndex: index,
        version: match[1].trim(),
        date: match[2]?.trim(),
        rawHeader: trimmed
      });
    }
  });

  if (headerIndices.length === 0) return [];

  return headerIndices.map((header, i) => {
    const start = header.lineIndex;
    const end = i < headerIndices.length - 1 ? headerIndices[i + 1].lineIndex : lines.length;
    const sectionLines = lines.slice(start, end);
    const content = sectionLines.join('\n').trim();
    const title = header.rawHeader.replace(/^##\s*/, '').trim();

    return {
      version: header.version,
      date: header.date,
      title,
      content,
      rawHeader: header.rawHeader
    };
  });
}

/**
 * Extrai a seção de uma versão específica do CHANGELOG.md pelo número de versão (ex: "1.22.0").
 */
export function extractChangelogByVersion(
  content: string | null | undefined,
  targetVersion: string
): string | null {
  if (!content || !targetVersion) return null;
  const versions = parseChangelogVersions(content);
  const found = versions.find(
    (v) => v.version.toLowerCase() === targetVersion.toLowerCase().replace(/^v/, '')
  );
  return found ? found.content : null;
}

