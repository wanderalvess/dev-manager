import type { WshFeatureCheck, WshInstallerInfo, WshUpdatePrepareResult, WshUpdateVerdict } from '../../../shared/wshUpdate';

export function formatMegabytes(bytes: number | undefined): string {
  return bytes ? `${(bytes / 1048576).toFixed(bytes >= 10 * 1048576 ? 0 : 1)} MB` : '—';
}

/** "2026-11-26T20:27:29Z" → "26/11/2026" (data do servidor, no fuso do computador). */
export function formatPublishedDate(iso: string | undefined): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Nome do arquivo de um caminho do Windows ou do Linux (\x5c é a barra invertida). */
export function fileNameOf(filePath: string): string {
  return filePath.split(/[/\x5c]/).pop() || filePath;
}

export interface VerdictView {
  label: string;
  tone: 'success' | 'info' | 'warning' | 'muted';
}

export function verdictView(verdict: WshUpdateVerdict | undefined): VerdictView {
  switch (verdict) {
    case 'newer':
      return { label: 'Mais nova que a atual', tone: 'success' };
    case 'same':
      return { label: 'Mesma versão da atual', tone: 'info' };
    case 'older':
      return { label: 'Mais antiga que a atual', tone: 'warning' };
    default:
      return { label: 'Versão atual desconhecida', tone: 'muted' };
  }
}

export interface InstallerRow {
  version: string;
  /** "26/11/2026 · 96 MB" */
  meta: string;
  tag?: 'em uso' | 'mais recente';
}

/** Linhas da lista de versões publicadas: a em uso e a mais recente ganham etiqueta. */
export function installerRows(installers: WshInstallerInfo[] | undefined, currentVersion: string | undefined): InstallerRow[] {
  return (installers ?? []).map((i, index) => ({
    version: i.version,
    meta: [formatPublishedDate(i.updated), i.sizeBytes ? formatMegabytes(i.sizeBytes) : ''].filter(Boolean).join(' · '),
    tag: i.version === currentVersion ? 'em uso' : index === 0 ? 'mais recente' : undefined
  }));
}

/** Features que o jar novo exige e o WTA não tem (ou tem em versão menor): o WSH encerraria ao subir. */
export function missingFeatures(checks: WshFeatureCheck[] | undefined): WshFeatureCheck[] {
  return (checks ?? []).filter((c) => !c.ok);
}

/** Texto da pergunta de confirmação antes de trocar o jar. */
export function applyConfirmation(prepared: WshUpdatePrepareResult, container: string, currentVersion: string | undefined): { message: string; tone: 'warning' | 'danger' } {
  const origin = prepared.source === 'local' ? ' (arquivo escolhido no computador)' : '';
  const lines = [`O jar do ${container} passa de ${currentVersion ?? 'versão desconhecida'} para ${prepared.version}${origin}. O jar atual fica guardado ao lado, e o container será reiniciado.`];
  const missing = missingFeatures(prepared.checks);
  if (missing.length) {
    lines.push(`Atenção: o WTA não tem ${missing.map((m) => `${m.service} ${m.version}`).join(', ')}. O WSH deve encerrar ao subir.`);
  } else if (prepared.checksError) {
    lines.push(`Não consegui conferir as features do WTA (${prepared.checksError}).`);
  }
  if (prepared.verdict === 'older') lines.push('A versão escolhida é mais antiga que a atual.');
  const risky = missing.length > 0 || prepared.verdict === 'older';
  return { message: lines.join('\n'), tone: risky ? 'danger' : 'warning' };
}

/** Só libera "Atualizar" com um jar preparado e nada em andamento (mudar a escolha descarta o preparado). */
export function canApplyUpdate(prepared: WshUpdatePrepareResult | null, busy: boolean): boolean {
  return !busy && !!prepared?.success;
}
