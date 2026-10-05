import { useState, useEffect } from 'react';
import type {
  BundleDependencyCheckResult,
  KarafBundleInfo,
  KarafFeatureInfo
} from '../../../../shared/types';
import {
  findMatchingFeature,
  inferFeatureNameFromBundle,
  normalizeFeatureList
} from '../../utils/karafUninstallModalUtils';

interface UseKarafUninstallModalParams {
  target: KarafBundleInfo | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export function useKarafUninstallModal({ target, onClose, onSuccess }: UseKarafUninstallModalParams) {
  const [uninstallDepCheck, setUninstallDepCheck] = useState<BundleDependencyCheckResult | null>(null);
  const [isCheckingUninstallDeps, setIsCheckingUninstallDeps] = useState(false);
  const [confirmUninstallChecked, setConfirmUninstallChecked] = useState(false);
  const [isUninstalling, setIsUninstalling] = useState(false);
  const [uninstallLog, setUninstallLog] = useState<string | null>(null);
  const [uninstallMode, setUninstallMode] = useState<'feature' | 'bundle'>('feature');
  const [uninstallFeatureName, setUninstallFeatureName] = useState('');
  const [uninstallFeatureVersion, setUninstallFeatureVersion] = useState('');
  const [installedFeaturesList, setInstalledFeaturesList] = useState<KarafFeatureInfo[]>([]);

  useEffect(() => {
    if (!target) {
      setUninstallDepCheck(null);
      setUninstallLog(null);
      setConfirmUninstallChecked(false);
      return;
    }

    setUninstallDepCheck(null);
    setConfirmUninstallChecked(false);
    setUninstallLog(null);
    setUninstallMode('feature');

    const cleanCandidate = inferFeatureNameFromBundle(target);
    setUninstallFeatureName(cleanCandidate);
    setUninstallFeatureVersion(target.version || '');

    setIsCheckingUninstallDeps(true);

    // Carregar features instaladas para dar match inteligente e preencher o datalist
    if (window.electronAPI?.listKarafFeatures) {
      window.electronAPI.listKarafFeatures().then((res) => {
        const list = normalizeFeatureList(res);
        if (list.length > 0) {
          setInstalledFeaturesList(list);
          const matched = findMatchingFeature(list, cleanCandidate);
          if (matched) {
            setUninstallFeatureName(matched.name);
            if (matched.version) setUninstallFeatureVersion(matched.version);
          }
        }
      }).catch((err) => console.error('Erro ao listar features no modal de uninstall:', err));
    }

    if (window.electronAPI?.checkKarafBundleDeps) {
      window.electronAPI.checkKarafBundleDeps(target.id)
        .then((check) => setUninstallDepCheck(check))
        .catch((err) => console.error('Erro ao checar dependências para desinstalação:', err))
        .finally(() => setIsCheckingUninstallDeps(false));
    } else {
      setIsCheckingUninstallDeps(false);
    }
  }, [target]);

  const handleConfirmUninstall = async () => {
    if (!target) return;
    setIsUninstalling(true);
    setUninstallLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setUninstallLog((prev) => (prev || '') + chunk);
    });
    try {
      if (uninstallMode === 'feature') {
        if (!uninstallFeatureName.trim()) {
          alert('Informe o nome da feature para desinstalar.');
          setIsUninstalling(false);
          return;
        }
        if (!window.electronAPI?.uninstallKarafFeature) {
          alert('API de desinstalação de feature não disponível.');
          setIsUninstalling(false);
          return;
        }
        const res = await window.electronAPI.uninstallKarafFeature(
          uninstallFeatureName.trim(),
          uninstallFeatureVersion.trim() || undefined
        );
        if (!res.success) {
          alert(`Falha na desinstalação da Feature: ${res.output}`);
        } else {
          await onSuccess();
          onClose();
        }
      } else {
        if (!window.electronAPI?.uninstallKarafBundle) return;
        const res = await window.electronAPI.uninstallKarafBundle(target.id);
        if (!res.success) {
          alert(`Falha na desinstalação do Bundle: ${res.output}`);
        } else {
          await onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      alert(`Erro: ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setIsUninstalling(false);
    }
  };

  return {
    uninstallDepCheck,
    isCheckingUninstallDeps,
    confirmUninstallChecked,
    setConfirmUninstallChecked,
    isUninstalling,
    uninstallLog,
    uninstallMode,
    setUninstallMode,
    uninstallFeatureName,
    setUninstallFeatureName,
    uninstallFeatureVersion,
    setUninstallFeatureVersion,
    installedFeaturesList,
    handleConfirmUninstall
  };
}
