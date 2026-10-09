import React, { useState, useEffect, useMemo } from 'react';
import type { KarafFeatureInfo, KarafFeatureRepoInfo } from '../../../../shared/types';
import { apiBridge } from '../../services/apiBridge';
import { filterFeatures, filterFeatureRepos } from '../../utils/karafFeaturesUtils';
import { isFeatureInstalled } from '../../utils/karafFeaturesModalUtils';
import { requestConfirm } from '../../components/ui/confirmService';

export type KarafFeaturesManagerTab = 'installed' | 'features' | 'repos';
export type KarafFeatureFilterMode = 'all' | 'installed' | 'winthor';
export type KarafFeaturesFeedback = { type: 'success' | 'error'; text: string } | null;

export function useKarafFeaturesManager(isOpen: boolean) {
  const [activeTab, setActiveTab] = useState<KarafFeaturesManagerTab>('installed');
  const [features, setFeatures] = useState<KarafFeatureInfo[]>([]);
  const [repos, setRepos] = useState<KarafFeatureRepoInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [featureFilterMode, setFeatureFilterMode] = useState<KarafFeatureFilterMode>('winthor');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<KarafFeaturesFeedback>(null);

  // Formulário para adicionar repositório
  const [isAddRepoOpen, setIsAddRepoOpen] = useState<boolean>(false);
  const [newRepoUrl, setNewRepoUrl] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [featList, repoList] = await Promise.all([
        apiBridge.listAllKarafFeatures ? apiBridge.listAllKarafFeatures(false) : apiBridge.listKarafFeatures(),
        apiBridge.listKarafFeatureRepos()
      ]);
      setFeatures(featList || []);
      setRepos(repoList || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Falha ao carregar dados do Karaf: ${err?.message || err}` });
    } finally {
      setIsLoading(false);
    }
  };

  // O catálogo e os repositórios só são consultados quando uma dessas abas é aberta (cada consulta é um comando SSH)
  const needsCatalog = isOpen && activeTab !== 'installed';
  useEffect(() => {
    if (needsCatalog) {
      loadData();
    }
  }, [needsCatalog]);

  const filteredFeatures = useMemo(() => {
    return filterFeatures(features, { search: searchQuery, filterMode: featureFilterMode });
  }, [features, searchQuery, featureFilterMode]);

  const filteredRepos = useMemo(() => {
    return filterFeatureRepos(repos, searchQuery);
  }, [repos, searchQuery]);

  const handleToggleInstallFeature = async (feat: KarafFeatureInfo) => {
    const isInstalled = isFeatureInstalled(feat);
    const actionKey = `feat_${feat.name}`;
    setActionInProgress(actionKey);
    setFeedback(null);

    try {
      if (isInstalled) {
        const res = await apiBridge.uninstallKarafFeature(feat.name, feat.version);
        if (res.success) {
          setFeedback({ type: 'success', text: `Feature "${feat.name}" desinstalada com sucesso.` });
          await loadData();
        } else {
          setFeedback({ type: 'error', text: `Erro ao desinstalar: ${res.output}` });
        }
      } else {
        const res = await apiBridge.installKarafFeature(feat.name, feat.version);
        if (res.success) {
          setFeedback({ type: 'success', text: `Feature "${feat.name}" instalada com sucesso!` });
          await loadData();
        } else {
          setFeedback({ type: 'error', text: `Erro ao instalar: ${res.output}` });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Operação falhou: ${err?.message || err}` });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRefreshRepo = async (repoNameOrUrl?: string) => {
    const actionKey = `refresh_${repoNameOrUrl || 'all'}`;
    setActionInProgress(actionKey);
    setFeedback(null);
    try {
      const res = await apiBridge.refreshKarafFeatureRepo(repoNameOrUrl);
      if (res.success) {
        setFeedback({
          type: 'success',
          text: repoNameOrUrl ? `Repositório "${repoNameOrUrl}" atualizado.` : 'Todos os repositórios atualizados.'
        });
        await loadData();
      } else {
        setFeedback({ type: 'error', text: `Erro ao atualizar repositório: ${res.output}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Falha na requisição: ${err?.message || err}` });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveRepo = async (repo: KarafFeatureRepoInfo) => {
    const confirmed = await requestConfirm({
      title: 'Remover repositório?',
      message: `Deseja remover o repositório "${repo.name}" do Karaf?`,
      confirmLabel: 'Remover',
      tone: 'warning'
    });
    if (!confirmed) return;

    const actionKey = `remove_${repo.name}`;
    setActionInProgress(actionKey);
    setFeedback(null);
    try {
      const res = await apiBridge.removeKarafFeatureRepo(repo.name || repo.url);
      if (res.success) {
        setFeedback({ type: 'success', text: `Repositório "${repo.name}" removido com sucesso.` });
        await loadData();
      } else {
        setFeedback({ type: 'error', text: `Erro ao remover repositório: ${res.output}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Falha ao remover repositório: ${err?.message || err}` });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;

    setActionInProgress('add_repo');
    setFeedback(null);
    try {
      const res = await apiBridge.addKarafFeatureRepo(newRepoUrl.trim());
      if (res.success) {
        setFeedback({ type: 'success', text: 'Repositório de features adicionado com sucesso!' });
        setNewRepoUrl('');
        setIsAddRepoOpen(false);
        await loadData();
      } else {
        setFeedback({ type: 'error', text: `Erro ao registrar repositório: ${res.output}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: `Falha ao adicionar repositório: ${err?.message || err}` });
    } finally {
      setActionInProgress(null);
    }
  };

  return {
    activeTab,
    setActiveTab,
    features,
    repos,
    isLoading,
    searchQuery,
    setSearchQuery,
    featureFilterMode,
    setFeatureFilterMode,
    actionInProgress,
    feedback,
    setFeedback,
    isAddRepoOpen,
    setIsAddRepoOpen,
    newRepoUrl,
    setNewRepoUrl,
    filteredFeatures,
    filteredRepos,
    loadData,
    handleToggleInstallFeature,
    handleRefreshRepo,
    handleRemoveRepo,
    handleAddRepo
  };
}
