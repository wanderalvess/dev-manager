import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  X,
  Layers,
  Package,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  Trash2
} from 'lucide-react';
import {
  BundleDependencyCheckResult,
  KarafBundleInfo,
  KarafFeatureInfo
} from '../../../../../shared/types';

interface KarafUninstallModalProps {
  target: KarafBundleInfo | null;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const KarafUninstallModal: React.FC<KarafUninstallModalProps> = ({
  target,
  onClose,
  onSuccess
}) => {
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

    // Tentar inferir nome provável da feature a partir do bundle
    const rawName = target.symbolicName || target.name || '';
    const cleanCandidate = rawName
      .replace(/^(com\.br\.com\.pcsist\.winthor\.|br\.com\.totvs\.|com\.pcsist\.)/, '')
      .replace(/-service$|-impl$|-core$|-api$/, '');
    setUninstallFeatureName(cleanCandidate);
    setUninstallFeatureVersion(target.version || '');

    setIsCheckingUninstallDeps(true);

    // Carregar features instaladas para dar match inteligente e preencher o datalist
    if (window.electronAPI?.listKarafFeatures) {
      window.electronAPI.listKarafFeatures().then((res) => {
        const list: KarafFeatureInfo[] = Array.isArray(res) ? res : ((res as any)?.features || []);
        if (list.length > 0) {
          setInstalledFeaturesList(list);
          const needle = cleanCandidate.toLowerCase();
          const matched = list.find(
            (f: KarafFeatureInfo) =>
              f.name.toLowerCase() === needle ||
              needle.includes(f.name.toLowerCase()) ||
              f.name.toLowerCase().includes(needle)
          );
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

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Confirmar Desinstalação do Bundle</h4>
              <p className="text-[11px] text-muted-foreground">
                Verificação prévia de impacto e fiação de dependências OSGi
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

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Informações do Bundle */}
          <div className="p-3 bg-muted/30 border border-border rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-foreground">{target.name}</div>
              <div className="text-[10px] text-muted-foreground font-mono">
                ID: {target.id} · Versão: {target.version}
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 font-mono ${
                target.state === 'Active'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : target.state === 'Resolved'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                  : target.state === 'Installed'
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                target.state === 'Active' ? 'bg-emerald-500' : target.state === 'Resolved' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              {target.state}
            </span>
          </div>

          {/* Modo de Desinstalação */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Tipo de Desinstalação
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUninstallMode('feature')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  uninstallMode === 'feature'
                    ? 'border-rose-500/60 bg-rose-500/10 text-foreground ring-1 ring-rose-500/30'
                    : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-rose-500" />
                    Desinstalação Permanente
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                    Recomendado
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Executa <code className="text-rose-400 font-mono">feature:uninstall -r</code>. Não volta ao reiniciar o Karaf.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setUninstallMode('bundle')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  uninstallMode === 'bundle'
                    ? 'border-rose-500/60 bg-rose-500/10 text-foreground ring-1 ring-rose-500/30'
                    : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-500" />
                    Apenas Bundle (Memória)
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    OSGi
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Executa <code className="text-amber-400 font-mono">bundle:uninstall</code>. Pode retornar se Karaf reiniciar.
                </p>
              </button>
            </div>
          </div>

          {/* Se for modo feature: inputs de nome e versão da feature */}
          {uninstallMode === 'feature' && (
            <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Parâmetros da Feature Karaf
                </span>
                {installedFeaturesList.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {installedFeaturesList.length} features instaladas detectadas
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    Nome da Feature
                  </label>
                  <input
                    type="text"
                    list="karaf-installed-features-datalist"
                    value={uninstallFeatureName}
                    onChange={(e) => setUninstallFeatureName(e.target.value)}
                    placeholder="Ex: winthor-integracao-varejo"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                  />
                  <datalist id="karaf-installed-features-datalist">
                    {installedFeaturesList.map((f) => (
                      <option key={`${f.name}-${f.version}`} value={f.name}>
                        {f.name} {f.version ? `(${f.version})` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                    Versão (Opcional)
                  </label>
                  <input
                    type="text"
                    value={uninstallFeatureVersion}
                    onChange={(e) => setUninstallFeatureVersion(e.target.value)}
                    placeholder="Ex: 0.0.1-SNAPSHOT"
                    className="w-full px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="text-[10px] font-mono text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/50">
                Comando Karaf que será executado:
                <div className="text-rose-400 font-bold mt-0.5">
                  feature:uninstall -r {uninstallFeatureName || '<nome-feature>'}{uninstallFeatureVersion ? `/${uninstallFeatureVersion}` : ''}
                </div>
              </div>
            </div>
          )}

          {/* Status da checagem de dependências */}
          {isCheckingUninstallDeps ? (
            <div className="p-4 bg-muted/20 border border-border rounded-xl flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <RotateCw className="w-4 h-4 animate-spin text-primary" />
              <span>Inspecionando fiação de dependências OSGi via Karaf...</span>
            </div>
          ) : uninstallDepCheck ? (
            <div className="space-y-3">
              {/* Nível de Risco */}
              {uninstallDepCheck.riskLevel === 'HIGH' ? (
                <div className="p-3.5 bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/30 dark:border-rose-800/50 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>RISCO ALTO: Bundles dependentes ativos detectados!</span>
                  </div>
                  <p className="text-[11px] text-rose-700/90 dark:text-rose-300/90 leading-relaxed">
                    Existem {uninstallDepCheck.dependentBundles.length} bundle(s) que dependem diretamente deste módulo.
                    Ao desinstalar, esses módulos deixarão de funcionar no Karaf.
                  </p>

                  {/* Lista de dependentes */}
                  <div className="mt-2 bg-card/80 border border-rose-500/30 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                    {uninstallDepCheck.dependentBundles.map((dep) => (
                      <div key={dep.id} className="text-[10px] font-mono text-foreground flex items-center justify-between">
                        <span>
                          [{dep.id}] {dep.name} {dep.version ? `(${dep.version})` : ''}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold text-[9px]">{dep.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : uninstallDepCheck.riskLevel === 'MEDIUM' ? (
                <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 dark:border-amber-800/50 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>ATENÇÃO: Pacotes exportados podem estar em uso</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    Este bundle exporta {uninstallDepCheck.exportedPackages.length} pacotes OSGi. Nenhum bundle cliente foi
                    detectado com fiação direta no momento, mas dependências dinâmicas podem ser afetadas.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-800/50 rounded-xl text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Risco Baixo: Nenhuma dependência ativa encontrada. Seguro para desinstalar.</span>
                </div>
              )}

              {/* Confirmação explícita de risco se alto */}
              {uninstallDepCheck.riskLevel === 'HIGH' && (
                <label className="flex items-start gap-2.5 p-3 bg-muted/40 border border-border rounded-xl cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={confirmUninstallChecked}
                    onChange={(e) => setConfirmUninstallChecked(e.target.checked)}
                    className="mt-0.5 rounded border-border text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-foreground font-medium text-[11px]">
                    Estou ciente do impacto e confirmo que desejo desinstalar este bundle mesmo com bundles dependentes.
                  </span>
                </label>
              )}
            </div>
          ) : null}

          {/* Log ao vivo do bundle:uninstall + bundle:refresh */}
          {uninstallLog && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-slate-800">
              {uninstallLog}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUninstalling}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmUninstall}
            disabled={
              isUninstalling ||
              isCheckingUninstallDeps ||
              (uninstallDepCheck?.riskLevel === 'HIGH' && !confirmUninstallChecked)
            }
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-75 disabled:cursor-wait rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {isUninstalling ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Desinstalando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Desinstalação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
