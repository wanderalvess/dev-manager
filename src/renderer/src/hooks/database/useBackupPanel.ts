import { useEffect, useRef } from 'react';
import type { AppSettings, DatabaseConnectionConfig } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { buildBackupHistoryCsv, buildBackupHistoryCsvFilename } from '../../utils/backupModalUtils';
import { useBackupActions } from './useBackupActions';
import { useBackupData } from './useBackupData';
import { useBackupForm } from './useBackupForm';
import { useBackupWebhooks } from './useBackupWebhooks';

interface UseBackupPanelParams {
  isActive: boolean;
  activeConnection: DatabaseConnectionConfig | null;
  connections: DatabaseConnectionConfig[];
  settings: AppSettings | null;
  onSettingsUpdate?: (updater: (prev: AppSettings | null) => AppSettings | null) => void;
}

/** Orquestra formulário, dados, ações e webhooks da tela de Backup & Restauração. */
export function useBackupPanel({
  isActive,
  activeConnection,
  connections,
  settings,
  onSettingsUpdate
}: UseBackupPanelParams) {
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

  // Settings e conexão ativa mudam durante o uso (ex.: o próprio backup grava lastRunAt em settings).
  // O formulário só é reinicializado ao abrir o modal ou trocar de conexão; depender do objeto settings
  // aqui zerava o resultado do backup e o que o usuário estava digitando a cada atualização.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const activeConnectionRef = useRef(activeConnection);
  activeConnectionRef.current = activeConnection;
  const activeConnectionId = activeConnection?.id ?? null;

  // A página fica montada (escondida) ao trocar de tela: voltar a ela não pode apagar o que o
  // usuário editou. O formulário só é recarregado da config salva quando a conexão muda.
  const initializedConnectionId = useRef<string | null>(null);
  const backupFolderRef = useRef(form.backupFolder);
  backupFolderRef.current = form.backupFolder;

  useEffect(() => {
    const connection = activeConnectionRef.current;
    if (!isActive || !connection) return;

    if (initializedConnectionId.current === connection.id) {
      // Mesma conexão: só atualiza a lista de arquivos e o histórico, que podem ter mudado fora daqui.
      const folder = backupFolderRef.current.trim();
      if (folder) refreshBackupFiles(folder);
      refreshBackupHistory(connection.id);
      return;
    }
    initializedConnectionId.current = connection.id;

    loadWebhooks(settingsRef.current?.backupWebhooks || []);
    const folder = resetFormFromSettings(connection, settingsRef.current);
    resetResults();

    if (folder) refreshBackupFiles(folder);
    else clearBackupFiles();
    refreshBackupHistory(connection.id);
  }, [isActive, activeConnectionId, loadWebhooks, resetFormFromSettings, resetResults, refreshBackupFiles, clearBackupFiles, refreshBackupHistory]);

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
