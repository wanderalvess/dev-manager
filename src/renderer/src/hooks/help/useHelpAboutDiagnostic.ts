import { useMemo } from 'react';
import type { SystemAppInfo } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { helpAboutBuildDiagnosticReport, helpAboutMemoryUsagePercent } from '../../utils/helpAboutUtils';

/** Estado derivado da aba Sobre: uso de RAM e cópia do relatório de diagnóstico. */
export function useHelpAboutDiagnostic(appInfo: SystemAppInfo | null) {
  const { copy: copyDiag, copiedKey: copiedDiagKey } = useCopyToClipboard(2500);
  const copiedDiag = copiedDiagKey === 'diag';

  const memoryUsagePercent = useMemo(() => helpAboutMemoryUsagePercent(appInfo), [appInfo]);

  const handleCopyDiagnostic = () => {
    if (!appInfo) return;
    copyDiag(helpAboutBuildDiagnosticReport(appInfo), 'diag');
  };

  return { copiedDiag, memoryUsagePercent, handleCopyDiagnostic };
}
