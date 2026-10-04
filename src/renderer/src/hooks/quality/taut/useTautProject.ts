import { useState, useEffect } from 'react';
import type {
  AppSettings,
  TautProjectStatus,
  TautCoverageReport,
  TautSpecSummary
} from '../../../../../shared/types';
import { api } from '../../../services/apiBridge';
import { showToast } from '../../../components/ToastHost';

export function useTautProject(settings: AppSettings | null) {
  const [projectStatus, setProjectStatus] = useState<TautProjectStatus | null>(null);
  const [coverageReport, setCoverageReport] = useState<TautCoverageReport | null>(null);
  const [specs, setSpecs] = useState<TautSpecSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCoverage, setLoadingCoverage] = useState<boolean>(false);
  const [syncingEnv, setSyncingEnv] = useState<boolean>(false);

  // Carrega status inicial
  const loadProjectData = async () => {
    setLoading(true);
    try {
      if (api.tautGetStatus) {
        const st = await api.tautGetStatus();
        setProjectStatus(st);
      }
      if (api.tautListSpecs) {
        const list = await api.tautListSpecs();
        setSpecs(list || []);
      }
    } catch (err: any) {
      console.warn('[TautAutomationPanel] Erro ao carregar projeto:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCoverage = async () => {
    setLoadingCoverage(true);
    try {
      if (api.tautGetCoverage) {
        const cov = await api.tautGetCoverage();
        setCoverageReport(cov);
      }
    } catch (err: any) {
      showToast(`Erro ao analisar cobertura: ${err.message}`, 'error');
    } finally {
      setLoadingCoverage(false);
    }
  };

  useEffect(() => {
    loadProjectData();
    loadCoverage();
  }, [settings?.tautProjectPath]);

  // Sincronizar .env com a conexão Oracle ativa
  const handleSyncEnv = async () => {
    setSyncingEnv(true);
    try {
      if (api.tautSyncEnv) {
        const res = await api.tautSyncEnv();
        showToast(res.message, 'success');
        loadProjectData();
      }
    } catch (err: any) {
      showToast(`Falha ao sincronizar .env: ${err.message}`, 'error');
    } finally {
      setSyncingEnv(false);
    }
  };

  return {
    projectStatus,
    coverageReport,
    specs,
    loading,
    loadingCoverage,
    syncingEnv,
    loadProjectData,
    loadCoverage,
    handleSyncEnv
  };
}
