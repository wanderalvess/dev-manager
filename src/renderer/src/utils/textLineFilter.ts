/** Filtra um texto multi-linha (ex: log) pelas linhas que contêm `searchTerm`, case-insensitive. */
export function filterTextLines(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  const needle = searchTerm.trim().toLowerCase();
  return text
    .split(/\r?\n/)
    .filter((line) => line.toLowerCase().includes(needle))
    .join('\n');
}
