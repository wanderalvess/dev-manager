import { useEffect, useState } from 'react';
import type { Routine801CatalogResponse } from '../../../../shared/types';
import {
  ROUTINE801_DEFAULT_URL,
  buildCatalogFailureMessage,
  getCatalogFailureDetail
} from '../../utils/routine801ModalUtils';

const EMPTY_CATALOG: Routine801CatalogResponse = { repositorios: [], funcionalidades: [] };

export const useRoutine801Catalog = (isOpen: boolean) => {
  const [updatesCatalog, setUpdatesCatalog] = useState<Routine801CatalogResponse>(EMPTY_CATALOG);
  const [installsCatalog, setInstallsCatalog] = useState<Routine801CatalogResponse>(EMPTY_CATALOG);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [serverUrlInput, setServerUrlInput] = useState<string>(ROUTINE801_DEFAULT_URL);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionHealth, setConnectionHealth] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchCatalogs = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || serverUrlInput).trim();
    setIsLoading(true);
    setErrorBanner(null);
    try {
      if (window.electronAPI?.routine801GetUpdates && window.electronAPI?.routine801GetInstallations) {
        const [updatesData, installsData] = await Promise.allSettled([
          window.electronAPI.routine801GetUpdates(targetUrl),
          window.electronAPI.routine801GetInstallations(targetUrl)
        ]);

        let hasSuccess = false;
        if (updatesData.status === 'fulfilled') {
          setUpdatesCatalog(updatesData.value);
          hasSuccess = true;
        } else {
          console.warn('[Rotina 801] Falha ao obter atualizações:', updatesData.reason);
        }

        if (installsData.status === 'fulfilled') {
          setInstallsCatalog(installsData.value);
          hasSuccess = true;
        } else {
          console.warn('[Rotina 801] Falha ao obter instalações:', installsData.reason);
        }

        if (!hasSuccess) {
          const detail = getCatalogFailureDetail(updatesData, installsData);
          setErrorBanner(buildCatalogFailureMessage(targetUrl, detail));
          setConnectionHealth({ ok: false, message: detail });
        } else {
          setConnectionHealth({ ok: true, message: 'Conectado e respondendo' });
        }
      }
    } catch (err: any) {
      setErrorBanner(`Erro ao carregar catálogo: ${err?.message || err}`);
      setConnectionHealth({ ok: false, message: 'Erro de conexão' });
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega a URL configurada e consulta o catálogo ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadInitialCatalog = async () => {
      let activeUrl = serverUrlInput;
      if (window.electronAPI?.getSettings) {
        try {
          const st = await window.electronAPI.getSettings();
          const configuredUrl = st.routine801Url || st.wtaUrl || ROUTINE801_DEFAULT_URL;
          if (!cancelled) {
            setServerUrlInput(configuredUrl);
            activeUrl = configuredUrl;
          }
        } catch (e) {
          console.warn('[Rotina 801] Erro ao carregar configurações:', e);
        }
      }
      if (!cancelled) {
        fetchCatalogs(activeUrl);
      }
    };

    loadInitialCatalog();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionHealth(null);
    try {
      if (window.electronAPI?.routine801CheckServer) {
        const res = await window.electronAPI.routine801CheckServer(serverUrlInput);
        setConnectionHealth({ ok: res.ok, message: res.message });
      }
    } catch (err: any) {
      setConnectionHealth({ ok: false, message: err?.message || 'Falha no teste de conexão.' });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveServerUrl = async () => {
    try {
      if (window.electronAPI?.saveSettings && window.electronAPI?.getSettings) {
        const current = await window.electronAPI.getSettings();
        await window.electronAPI.saveSettings({ ...current, routine801Url: serverUrlInput.trim() });
      }
      setIsConfigOpen(false);
      fetchCatalogs(serverUrlInput.trim());
    } catch (err: any) {
      setErrorBanner(`Falha ao salvar URL: ${err?.message || err}`);
    }
  };

  return {
    updatesCatalog,
    installsCatalog,
    isLoading,
    errorBanner,
    setErrorBanner,
    isConfigOpen,
    setIsConfigOpen,
    serverUrlInput,
    setServerUrlInput,
    isTestingConnection,
    connectionHealth,
    fetchCatalogs,
    handleTestConnection,
    handleSaveServerUrl
  };
};
