import React, { useRef, useState } from 'react';
import { showToast } from '../../components/ToastHost';
import { showNotice } from '../../components/ui/confirmService';

interface ImportResult {
  success?: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * Exportar (seguro ou completo) e importar as configurações em JSON. A importação já grava no disco (ConfigService),
 * então depois dela a tela só precisa recarregar.
 */
export function useSettingsImportExport(reload: () => Promise<unknown>, onSettingsSaved?: () => void) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (message: string, ms: number) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), ms);
  };

  const handleExportSettings = async (sanitizePasswords: boolean) => {
    setExportMenuOpen(false);
    try {
      if (!window.electronAPI?.exportSettings) return;
      const json = await window.electronAPI.exportSettings(sanitizePasswords);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `dev-manager-settings-${sanitizePasswords ? 'seguro' : 'completo'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus(
        sanitizePasswords ? 'Configurações exportadas com segurança (senhas omitidas)!' : 'Backup completo de configurações exportado!',
        3500
      );
    } catch (err) {
      showToast(`Falha ao exportar configurações: ${err instanceof Error ? err.message : err}`, 'error');
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!window.electronAPI?.importSettings) return;
      const res = (await window.electronAPI.importSettings(text)) as ImportResult;
      if (res && res.success === false) throw new Error(res.error || 'Falha ao validar arquivo JSON');
      await reload();
      onSettingsSaved?.();
      if (res?.warnings?.length) {
        void showNotice({
          title: 'Configurações importadas, mas com atenção',
          message: `${res.warnings.join('\n')}\n\nRevise esses perfis antes de executá-los — eles rodam comandos no seu computador.`
        });
      }
      showStatus('Configurações importadas e aplicadas com sucesso!', 4000);
    } catch (err) {
      showToast(`Erro ao importar arquivo de configurações: ${err instanceof Error ? err.message : err}`, 'error');
    } finally {
      input.value = '';
    }
  };

  return { exportMenuOpen, setExportMenuOpen, statusMessage, fileInputRef, handleExportSettings, handleImportFileChange };
}
