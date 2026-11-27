import type { WshFeatureCheck, WshUpdatePrepareResult, WshUpdateVerdict } from '../../../shared/wshUpdate';

export function formatMegabytes(bytes: number | undefined): string {
  return bytes ? `${(bytes / 1048576).toFixed(bytes >= 10 * 1048576 ? 0 : 1)} MB` : '—';
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

/** Features que o jar novo exige e o WTA não tem (ou tem em versão menor): o WSH encerraria ao subir. */
export function missingFeatures(checks: WshFeatureCheck[] | undefined): WshFeatureCheck[] {
  return (checks ?? []).filter((c) => !c.ok);
}

/** Texto da pergunta de confirmação antes de trocar o jar. */
export function applyConfirmation(prepared: WshUpdatePrepareResult, container: string, currentVersion: string | undefined): { message: string; tone: 'warning' | 'danger' } {
  const lines = [`O jar do ${container} passa de ${currentVersion ?? 'versão desconhecida'} para ${prepared.version}. O jar atual fica guardado ao lado, e o container será reiniciado.`];
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

/** A tela só libera "Atualizar" depois de preparar a versão que está digitada. */
export function canApplyUpdate(prepared: WshUpdatePrepareResult | null, typedVersion: string, busy: boolean): boolean {
  return !busy && !!prepared?.success && prepared.version === typedVersion.trim();
}
