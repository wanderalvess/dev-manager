import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  FolderGit2,
  Package
} from 'lucide-react';
import { KarafFeatureInfo, KarafFeatureRepoInfo } from '../../../shared/types';
import { apiBridge } from '../services/apiBridge';
import {
  filterFeatures,
  filterFeatureRepos
} from '../utils/karafFeaturesUtils';

interface KarafFeaturesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'features' | 'repos';

export const KarafFeaturesManagerModal: React.FC<KarafFeaturesManagerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('features');
  const [features, setFeatures] = useState<KarafFeatureInfo[]>([]);
  const [repos, setRepos] = useState<KarafFeatureRepoInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [featureFilterMode, setFeatureFilterMode] = useState<'all' | 'installed' | 'winthor'>('winthor');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lista filtrada de features
  const filteredFeatures = useMemo(() => {
    return filterFeatures(features, { search: searchQuery, filterMode: featureFilterMode });
  }, [features, searchQuery, featureFilterMode]);

  // Lista filtrada de repositórios
  const filteredRepos = useMemo(() => {
    return filterFeatureRepos(repos, searchQuery);
  }, [repos, searchQuery]);

  // Ações de Feature
  const handleToggleInstallFeature = async (feat: KarafFeatureInfo) => {
    const isInstalled = feat.installed ?? (feat.state?.toLowerCase() === 'started' || feat.state?.toLowerCase() === 'installed');
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

  // Ações de Repositório
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
    if (!confirm(`Deseja remover o repositório "${repo.name}" do Karaf?`)) return;

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header com Abas */}
        <div className="flex flex-col border-b border-border bg-muted/20">
          <div className="flex items-center justify-between px-5 pt-3.5 pb-2.5">
            <div className="flex items-center space-x-3">
              <Boxes className="w-5 h-5 text-primary shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-foreground uppercase">
                    Features & Repositórios Maven
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-medium">
                    KARAF OSGi :8101
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                  Gerenciamento de repositórios XML e provisionamento de bundles do ecossistema WinThor.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={loadData}
                disabled={isLoading}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted border border-border/50 transition-colors cursor-pointer"
                title="Recarregar dados do Karaf"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
                title="Fechar (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Abas */}
          <div className="flex items-center px-5 space-x-2 border-t border-border/40 text-xs">
            <button
              onClick={() => {
                setActiveTab('features');
                setSearchQuery('');
              }}
              className={`px-3 py-2 font-mono font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
                activeTab === 'features'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Features</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-muted/80 border border-border/60 font-mono tabular-nums">
                {features.length}
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('repos');
                setSearchQuery('');
              }}
              className={`px-3 py-2 font-mono font-semibold border-b-2 flex items-center space-x-2 transition-colors cursor-pointer ${
                activeTab === 'repos'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Repositórios</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-muted/80 border border-border/60 font-mono tabular-nums">
                {repos.length}
              </span>
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-5 py-2 text-xs font-mono flex items-center justify-between border-b ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Barra de Filtros e Busca */}
        <div className="p-3 bg-muted/10 border-b border-border/60 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={
                activeTab === 'features'
                  ? 'Buscar por nome, namespace ou versão...'
                  : 'Buscar por nome ou coordenada maven:...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-colors font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {activeTab === 'features' && (
            <div className="flex items-center space-x-1 bg-muted/40 border border-border/80 rounded-md p-0.5 text-xs font-mono">
              <button
                onClick={() => setFeatureFilterMode('winthor')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  featureFilterMode === 'winthor'
                    ? 'bg-card text-foreground border border-border shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                WinThor / TOTVS
              </button>
              <button
                onClick={() => setFeatureFilterMode('installed')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  featureFilterMode === 'installed'
                    ? 'bg-card text-foreground border border-border shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Instaladas
              </button>
              <button
                onClick={() => setFeatureFilterMode('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                  featureFilterMode === 'all'
                    ? 'bg-card text-foreground border border-border shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todas ({features.length})
              </button>
            </div>
          )}

          {activeTab === 'repos' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleRefreshRepo()}
                disabled={actionInProgress !== null}
                className="px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors bg-card hover:bg-muted border border-border text-foreground cursor-pointer disabled:opacity-40"
                title="Recarregar todos os repositórios (feature:repo-refresh)"
              >
                <RefreshCw className="w-3 h-3 text-muted-foreground" />
                <span>Atualizar Todos</span>
              </button>

              <button
                onClick={() => setIsAddRepoOpen((prev) => !prev)}
                className="px-3 py-1.5 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Repositório</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Inline / Gaveta para Adicionar Repositório */}
        {activeTab === 'repos' && isAddRepoOpen && (
          <form
            onSubmit={handleAddRepo}
            className="p-3.5 bg-muted/20 border-b border-border flex flex-col space-y-2.5 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" /> Registrar Repositório Maven
              </span>
              <button
                type="button"
                onClick={() => setIsAddRepoOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Coordenada Maven (mvn:groupId/artifactId/version/xml/features) ou URI:
              </label>
              <input
                type="text"
                placeholder="mvn:br.com.totvs.winthor/features/1.0.0/xml/features"
                value={newRepoUrl}
                onChange={(e) => setNewRepoUrl(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <button
                type="button"
                onClick={() =>
                  setNewRepoUrl('mvn:br.com.totvs.winthor/winthor-features/LATEST/xml/features')
                }
                className="text-[10px] text-primary hover:underline cursor-pointer font-mono"
              >
                + Inserir template WinThor
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddRepoOpen(false)}
                  className="px-2.5 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newRepoUrl.trim() || actionInProgress === 'add_repo'}
                  className="px-3.5 py-1 rounded-md text-xs font-mono font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {actionInProgress === 'add_repo' ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Conteúdo das Listas */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {isLoading && (
            <div className="p-8 flex flex-col items-center justify-center text-muted-foreground text-xs font-mono">
              <RefreshCw className="w-5 h-5 animate-spin mb-2 text-primary" />
              <span>Consultando Karaf OSGi...</span>
            </div>
          )}

          {/* Lista de Features */}
          {!isLoading && activeTab === 'features' && (
            <>
              {filteredFeatures.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                  Nenhuma feature encontrada com os filtros selecionados.
                </div>
              ) : (
                <div className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden bg-background">
                  {filteredFeatures.map((feat) => {
                    const isInstalled = feat.installed ?? (feat.state?.toLowerCase() === 'started' || feat.state?.toLowerCase() === 'installed');
                    const isBusy = actionInProgress === `feat_${feat.name}`;

                    return (
                      <div
                        key={`${feat.name}-${feat.version}`}
                        className="px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors gap-3"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          {/* Pip de status */}
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isInstalled ? 'bg-emerald-500 shadow-xs' : 'bg-muted-foreground/30'
                            }`}
                            title={isInstalled ? 'Feature instalada' : 'Feature disponível'}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="text-xs font-bold text-foreground font-mono truncate">
                                {feat.name}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.2 bg-muted/80 rounded border border-border/70">
                                {feat.version || 'latest'}
                              </span>
                              {feat.name.toLowerCase().includes('winthor') && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                                  WinThor
                                </span>
                              )}
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                                  isInstalled
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'text-muted-foreground/80 border border-border/40'
                                }`}
                              >
                                {isInstalled ? 'INSTALADA' : 'DISPONÍVEL'}
                              </span>
                            </div>

                            {feat.repository && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">
                                repo: <span className="text-foreground/70">{feat.repository}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            onClick={() => handleToggleInstallFeature(feat)}
                            disabled={isBusy}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                              isInstalled
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                            title={isInstalled ? 'Desinstalar feature do Karaf' : 'Instalar feature no Karaf'}
                          >
                            {isBusy ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : isInstalled ? (
                              <Trash2 className="w-3 h-3" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span>
                              {isBusy ? 'PROCESSANDO...' : isInstalled ? 'DESINSTALAR' : 'INSTALAR'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Lista de Repositórios */}
          {!isLoading && activeTab === 'repos' && (
            <>
              {filteredRepos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs font-mono">
                  Nenhum repositório de features encontrado.
                </div>
              ) : (
                <div className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden bg-background">
                  {filteredRepos.map((repo) => {
                    const isBusy =
                      actionInProgress === `refresh_${repo.name}` || actionInProgress === `remove_${repo.name}`;

                    return (
                      <div
                        key={repo.name || repo.url}
                        className="px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors gap-3"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              repo.isWinThor ? 'bg-primary' : 'bg-slate-500'
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-foreground font-mono truncate">
                                {repo.name}
                              </span>
                              {repo.isWinThor && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                                  WinThor
                                </span>
                              )}
                            </div>

                            <p
                              className="text-[10px] text-muted-foreground font-mono mt-0.5 break-all select-all hover:text-foreground transition-colors"
                              title={repo.url}
                            >
                              {repo.url}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => handleRefreshRepo(repo.name || repo.url)}
                            disabled={isBusy}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted border border-border/40 transition-colors cursor-pointer disabled:opacity-40"
                            title="Recarregar repositório (feature:repo-refresh)"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                actionInProgress === `refresh_${repo.name}` ? 'animate-spin' : ''
                              }`}
                            />
                          </button>

                          <button
                            onClick={() => handleRemoveRepo(repo)}
                            disabled={isBusy}
                            className="p-1.5 text-rose-400 hover:text-rose-300 rounded-md hover:bg-rose-500/10 border border-border/40 hover:border-rose-500/30 transition-colors cursor-pointer disabled:opacity-40"
                            title="Remover repositório do Karaf"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/20 text-xs font-mono text-muted-foreground">
          <div className="flex items-center space-x-4 tabular-nums">
            <span>
              TOTAL: <strong className="text-foreground">{features.length}</strong>
            </span>
            <span>
              INSTALADAS:{' '}
              <strong className="text-emerald-400">
                {features.filter((f) => f.installed ?? (f.state?.toLowerCase() === 'started' || f.state?.toLowerCase() === 'installed')).length}
              </strong>
            </span>
            <span>
              REPOSITÓRIOS: <strong className="text-foreground">{repos.length}</strong>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md text-xs font-mono font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
