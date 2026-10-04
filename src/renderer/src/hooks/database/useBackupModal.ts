import { useEffect } from 'react';
import type { AppSettings, DatabaseConnectionConfig } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { buildBackupHistoryCsv, buildBackupHistoryCsvFilename } from '../../utils/backupModalUtils';
import { useBackupActions } from './useBackupActions';
import { useBackupData } from './useBackupData';
import { useBackupForm } from './useBackupForm';
import { useBackupWebhooks } from './useBackupWebhooks';

interface UseBackupModalParams {
  isOpen: boolean;
  activeConnection: DatabaseConnectionConfig | null;
  connections: DatabaseConnectionConfig[];
  settings: AppSettings | null;
  onSettingsUpdate?: (updater: (prev: AppSettings | null) => AppSettings | null) => void;
}

/** Orquestra formulário, dados, ações e webhooks do modal de Backup & Restauração. */
export function useBackupModal({
  isOpen,
  activeConnection,
  connections,
  settings,
  onSettingsUpdate
}: UseBackupModalParams) {
  const form = useBackupForm(activeConnection);
  const data = useBackupData();
  const webhooks = useBackupWebhooks({ onSettingsUpdate });
  const actions = useBackupActions({
    activeConnection,
    connections,
    form,
    refreshBackupFiles: data.refreshBackupFiles,
    refreshBackupHistory: data.refreshBackupHistory,
    onSettingsUpdate
  });
  const { copy: copyCellToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  const { resetFormFromSettings } = form;
  const { loadWebhooks } = webhooks;
  const { resetResults } = actions;
  const { refreshBackupFiles, refreshBackupHistory, clearBackupFiles } = data;

  // Inicializa valores ao abrir o modal com base na conexão ativa
  useEffect(() => {
    if (!isOpen || !activeConnection) return;

    loadWebhooks(settings?.backupWebhooks || []);
    const folder = resetFormFromSettings(activeConnection, settings);
    resetResults();

    if (folder) refreshBackupFiles(folder);
    else clearBackupFiles();
    refreshBackupHistory(activeConnection.id);
  }, [isOpen, activeConnection, settings, loadWebhooks, resetFormFromSettings, resetResults, refreshBackupFiles, clearBackupFiles, refreshBackupHistory]);

  const handleExportBackupHistoryCsv = () => {
    if (data.backupHistory.length === 0) return;

    const csv = buildBackupHistoryCsv(data.backupHistory);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildBackupHistoryCsvFilename(activeConnection?.name, new Date());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { form, data, webhooks, actions, copyCellToClipboard, copyFeedback, handleExportBackupHistoryCsv };
}
