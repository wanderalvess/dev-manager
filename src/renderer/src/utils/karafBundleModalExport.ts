import type { KarafBundleInfo } from '../../../shared/types';

export type KarafBundleExportFormat = 'json' | 'csv';

export interface KarafBundleExportPayload {
  content: string;
  mime: string;
}

const CSV_HEADERS = ['ID', 'Estado', 'Nome', 'SymbolicName', 'Versao', 'Nivel', 'Blueprint'];

function quoteCsv(value: string | undefined): string {
  return `"${(value || '').replace(/"/g, '""')}"`;
}

export function buildKarafBundleExportFilename(
  scopeFilter: string,
  format: KarafBundleExportFormat,
  now: Date = new Date()
): string {
  const dateStr = now.toISOString().slice(0, 10);
  return `karaf-bundles-${scopeFilter.toLowerCase()}-${dateStr}.${format}`;
}

export function buildKarafBundleExportPayload(
  bundles: KarafBundleInfo[],
  format: KarafBundleExportFormat
): KarafBundleExportPayload {
  if (format === 'json') {
    return { content: JSON.stringify(bundles, null, 2), mime: 'application/json' };
  }
  const rows = bundles.map((b) => [
    b.id,
    b.state,
    quoteCsv(b.name),
    quoteCsv(b.symbolicName),
    quoteCsv(b.version),
    b.level || '',
    b.blueprint || ''
  ]);
  return {
    content: [CSV_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\r\n'),
    mime: 'text/csv;charset=utf-8;'
  };
}

export function downloadKarafBundleExport(payload: KarafBundleExportPayload, filename: string): void {
  const blob = new Blob([payload.content], { type: payload.mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
