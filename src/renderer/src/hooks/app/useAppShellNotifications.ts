import { useEffect } from 'react';
import { showToast } from '../../components/ToastHost';

// Toasts globais para eventos IPC em segundo plano, mesmo fora da aba de origem.
export function useAppShellNotifications(): void {
  // Resultado de backups agendados
  useEffect(() => {
    if (!window.electronAPI?.onBackupScheduleResult) return;
    return window.electronAPI.onBackupScheduleResult(({ connectionName, result }) => {
      if (result.success) {
        showToast(`Backup agendado de "${connectionName}" concluído com sucesso.`, 'success');
      } else {
        showToast(`Falha no backup agendado de "${connectionName}": ${result.message}`, 'error');
      }
    });
  }, []);

  // Resultado de deploys/builds Karaf
  useEffect(() => {
    if (!window.electronAPI?.onKarafDeployResult) return;
    return window.electronAPI.onKarafDeployResult((result) => {
      if (result.success) {
        showToast('Deploy Karaf concluído com sucesso.', 'success');
      } else {
        showToast(`Falha no deploy Karaf: ${result.error || 'erro desconhecido'}`, 'error');
      }
    });
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onKarafBuildResult) return;
    return window.electronAPI.onKarafBuildResult((result) => {
      showToast(`Falha na compilação Maven (código ${result.code}).`, 'error');
    });
  }, []);

  // Watcher de auto-reindex do RAG terminou uma reindexação em segundo plano
  useEffect(() => {
    if (!window.electronAPI?.onDocsReindexComplete) return;
    return window.electronAPI.onDocsReindexComplete((status) => {
      showToast(`Documentação reindexada automaticamente (${status.totalChunks} trechos).`, 'success');
    });
  }, []);
}
