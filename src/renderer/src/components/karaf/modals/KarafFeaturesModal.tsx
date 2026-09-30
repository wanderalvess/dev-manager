import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  X,
  Search,
  UploadCloud,
  RotateCw,
  Sparkles,
  Play,
  Trash2,
  Info
} from 'lucide-react';
import { KarafFeatureInfo } from '../../../../../shared/types';

interface KarafFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBundlesChanged: () => Promise<void> | void;
}

export const KarafFeaturesModal: React.FC<KarafFeaturesModalProps> = ({
  isOpen,
  onClose,
  onBundlesChanged
}) => {
  const [featuresList, setFeaturesList] = useState<KarafFeatureInfo[]>([]);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [featuresSearch, setFeaturesSearch] = useState('');
  const [featuresFilter, setFeaturesFilter] = useState<'ALL' | 'WINTHOR' | 'SYSTEM'>('ALL');
  const [featureActionLoading, setFeatureActionLoading] = useState<string | null>(null);
  const [featureLog, setFeatureLog] = useState<string | null>(null);
  const [isFeatureInstallOpen, setIsFeatureInstallOpen] = useState(false);
  const [newFeatureInstallName, setNewFeatureInstallName] = useState('');
  const [newFeatureInstallVersion, setNewFeatureInstallVersion] = useState('');

  const handleRefreshFeatures = useCallback(async () => {
    if (!window.electronAPI?.listKarafFeatures) return;
    setIsLoadingFeatures(true);
    try {
      const res = await window.electronAPI.listKarafFeatures();
      const list = Array.isArray(res) ? res : ((res as any)?.features || []);
      setFeaturesList(list);
    } catch (err: any) {
      console.error('Erro ao listar features:', err);
      setFeaturesList([]);
    } finally {
      setIsLoadingFeatures(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFeatureLog(null);
      handleRefreshFeatures();
    }
  }, [isOpen, handleRefreshFeatures]);

  const handleUninstallFeatureDirect = async (feat: KarafFeatureInfo) => {
    const featIdent = `${feat.name}${feat.version ? `/${feat.version}` : ''}`;
    if (!confirm(`Deseja realmente desinstalar permanentemente a feature "${featIdent}"?\n\nIsso executará "feature:uninstall -r" e removerá a feature do Karaf e seus bundles.`)) {
      return;
    }
    setFeatureActionLoading(feat.name);
    setFeatureLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setFeatureLog((prev) => (prev || '') + chunk);
    });
    try {
      const res = await window.electronAPI.uninstallKarafFeature(feat.name, feat.version);
      if (!res.success) {
        alert(`Erro ao desinstalar feature: ${res.output}`);
      } else {
        await handleRefreshFeatures();
        await onBundlesChanged();
      }
    } catch (err: any) {
      alert(`Falha: ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setFeatureActionLoading(null);
    }
  };

  const handleInstallFeatureDirect = async () => {
    if (!newFeatureInstallName.trim()) {
      alert('Informe o nome da feature.');
      return;
    }
    setFeatureActionLoading('installing_new');
    setFeatureLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setFeatureLog((prev) => (prev || '') + chunk);
    });
    try {
      const res = await window.electronAPI.installKarafFeature(
        newFeatureInstallName.trim(),
        newFeatureInstallVersion.trim() || undefined
      );
      if (!res.success) {
        alert(`Erro ao instalar feature: ${res.output}`);
      } else {
        setIsFeatureInstallOpen(false);
        setNewFeatureInstallName('');
        setNewFeatureInstallVersion('');
        await handleRefreshFeatures();
        await onBundlesChanged();
      }
    } catch (err: any) {
      alert(`Falha: ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setFeatureActionLoading(null);
    }
  };

  const filteredFeatures = useMemo(() => {
    return featuresList.filter((f) => {
      if (featuresFilter === 'WINTHOR' && !f.isWinthor) return false;
      if (featuresFilter === 'SYSTEM' && f.isWinthor) return false;
      if (featuresSearch.trim()) {
        const q = featuresSearch.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.version.toLowerCase().includes(q) ||
          (f.description && f.description.toLowerCase().includes(q)) ||
          (f.repository && f.repository.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [featuresList, featuresFilter, featuresSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[85] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-500">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-foreground">
                  Features Karaf Instaladas
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  {featuresList.length} total
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {featuresList.filter((f) => f.isWinthor).length} WinThor
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gerencie o ciclo de vida permanente das features (<code className="text-indigo-400">feature:list -i</code>). A desinstalação via <code className="text-rose-400">feature:uninstall -r</code> impede que bundles retornem ao reiniciar o Karaf.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 border-b border-border bg-card/60 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={featuresSearch}
                onChange={(e) => setFeaturesSearch(e.target.value)}
                placeholder="Filtrar por nome, versão, repositório..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              {featuresSearch && (
                <button
                  type="button"
                  onClick={() => setFeaturesSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filtro WinThor / Sistema / Todas */}
            <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => setFeaturesFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  featuresFilter === 'ALL'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todas ({featuresList.length})
              </button>
              <button
                type="button"
                onClick={() => setFeaturesFilter('WINTHOR')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  featuresFilter === 'WINTHOR'
                    ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                WinThor ({featuresList.filter((f) => f.isWinthor).length})
              </button>
              <button
                type="button"
                onClick={() => setFeaturesFilter('SYSTEM')}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  featuresFilter === 'SYSTEM'
                    ? 'bg-background text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sistema ({featuresList.filter((f) => !f.isWinthor).length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFeatureInstallOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                isFeatureInstallOpen
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-400'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Instalar Feature</span>
            </button>

            <button
              type="button"
              onClick={handleRefreshFeatures}
              disabled={isLoadingFeatures}
              className="px-3 py-1.5 rounded-xl font-medium text-xs bg-muted hover:bg-muted/80 border border-border text-foreground transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Recarregar lista de features do Karaf"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingFeatures ? 'animate-spin text-primary' : ''}`} />
              <span className="hidden sm:inline">Recarregar</span>
            </button>
          </div>
        </div>

        {/* Painel expansível de Instalação Manual de Feature */}
        {isFeatureInstallOpen && (
          <div className="p-4 bg-muted/25 border-b border-border animate-fade-in shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-foreground">Instalar Feature Karaf</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                Executa <code className="text-indigo-400">feature:install -r -u &lt;feature&gt;</code>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  Nome da Feature <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFeatureInstallName}
                  onChange={(e) => setNewFeatureInstallName(e.target.value)}
                  placeholder="Ex: winthor-integracao-varejo ou hub-carga-dados"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                  Versão (Opcional)
                </label>
                <input
                  type="text"
                  value={newFeatureInstallVersion}
                  onChange={(e) => setNewFeatureInstallVersion(e.target.value)}
                  placeholder="Ex: 0.0.1-SNAPSHOT"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-muted-foreground">
                Comando:{' '}
                <span className="text-indigo-400 font-bold">
                  feature:install -r -u {newFeatureInstallName || '<feature>'}{newFeatureInstallVersion ? `/${newFeatureInstallVersion}` : ''}
                </span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFeatureInstallOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleInstallFeatureDirect}
                  disabled={!newFeatureInstallName.trim() || featureActionLoading === 'installing_new'}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {featureActionLoading === 'installing_new' ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Instalando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Instalar Feature</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Log das Ações de Feature */}
        {featureLog && (
          <div className="p-3 bg-slate-950 border-b border-slate-800 text-slate-200 font-mono text-xs max-h-40 overflow-y-auto whitespace-pre-wrap shrink-0">
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-800 text-[10px] text-slate-400">
              <span className="font-bold text-indigo-400">Log da Execução do Comando Karaf:</span>
              <button
                type="button"
                onClick={() => setFeatureLog(null)}
                className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                Limpar
              </button>
            </div>
            {featureLog}
          </div>
        )}

        {/* Tabela de Features */}
        <div className="flex-1 overflow-y-auto min-h-[250px]">
          {isLoadingFeatures ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
              <RotateCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Consultando features instaladas no Karaf (feature:list -i)...</span>
            </div>
          ) : filteredFeatures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <Layers className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-semibold text-foreground">Nenhuma feature encontrada</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {featuresSearch
                  ? `Nenhum resultado corresponde a "${featuresSearch}".`
                  : 'Nenhuma feature com o filtro selecionado.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs border-b border-border z-10 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Feature</th>
                  <th className="py-2.5 px-3">Versão</th>
                  <th className="py-2.5 px-3">Repositório</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                {filteredFeatures.map((feat) => {
                  const isLoadingThis = featureActionLoading === feat.name;
                  return (
                    <tr
                      key={`${feat.name}-${feat.version}`}
                      className={`hover:bg-muted/40 transition-colors ${
                        feat.isWinthor ? 'bg-indigo-500/5' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{feat.name}</span>
                          {feat.isWinthor && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                              WinThor
                            </span>
                          )}
                          {feat.required && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Required
                            </span>
                          )}
                        </div>
                        {feat.description && (
                          <p className="text-[10px] text-muted-foreground font-sans truncate max-w-md mt-0.5">
                            {feat.description}
                          </p>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground">
                        {feat.version || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground max-w-[200px] truncate" title={feat.repository}>
                        {feat.repository || '—'}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1 ${
                            feat.state?.toLowerCase() === 'started'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              feat.state?.toLowerCase() === 'started' ? 'bg-emerald-400' : 'bg-muted-foreground'
                            }`}
                          />
                          {feat.state}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleUninstallFeatureDirect(feat)}
                          disabled={isLoadingThis}
                          className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                          title={`Desinstalar permanentemente feature:uninstall -r ${feat.name}/${feat.version}`}
                        >
                          {isLoadingThis ? (
                            <RotateCw className="w-3 h-3 animate-spin text-rose-400" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span>Desinstalar (-r)</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            Desinstalar com <code className="text-rose-400 font-bold">-r</code> purga a feature e seus bundles exclusivos do Karaf permanentemente.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
