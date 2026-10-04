import type { TautCoverageReport, TautSpecSummary } from '../../../shared/types';

export type TautCoverageStatusFilter = 'all' | 'automated' | 'pending';

export function toggleTautTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}

/** Junta as tags selecionadas com as digitadas (separadas por vírgula), sem duplicar. */
export function buildEffectiveTagsString(selectedTags: string[], customTagInput: string): string {
  const list = [...selectedTags];
  if (customTagInput.trim()) {
    customTagInput.split(',').forEach((t) => {
      const clean = t.trim();
      if (clean && !list.includes(clean)) list.push(clean);
    });
  }
  return list.join(',');
}

export function filterCoverageItems(
  report: TautCoverageReport | null,
  search: string,
  statusFilter: TautCoverageStatusFilter
): TautCoverageReport['items'] {
  if (!report) return [];
  return report.items.filter((item) => {
    const matchSearch =
      !search ||
      item.key.toLowerCase().includes(search.toLowerCase()) ||
      (item.filePath && item.filePath.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchSearch && matchStatus;
  });
}

export function countSpecTests(specs: Pick<TautSpecSummary, 'testCount'>[]): number {
  return specs.reduce((acc, s) => acc + s.testCount, 0);
}
