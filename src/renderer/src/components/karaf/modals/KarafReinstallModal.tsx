import React, { useState, useEffect } from 'react';
import { RotateCcw, X, RotateCw } from 'lucide-react';
import { showToast } from '../../ToastHost';
import {
  BundleDependencyCheckResult,
  GitProjectInfo,
  KarafBundleInfo,
  ReinstallBundleRequest
} from '../../../../../shared/types';

interface KarafReinstallModalProps {
  target: KarafBundleInfo | null;
  projects: GitProjectInfo[];
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const KarafReinstallModal: React.FC<KarafReinstallModalProps> = ({
  target,
  projects,
  onClose,
  onSuccess
}) => {
  const [reinstallDepCheck, setReinstallDepCheck] = useState<BundleDependencyCheckResult | null>(null);
  const [isCheckingReinstallDeps, setIsCheckingReinstallDeps] = useState(false);
  const [rebuildBeforeReinstall, setRebuildBeforeReinstall] = useState(false);
  const [reinstallProjectPath, setReinstallProjectPath] = useState('');
  const [isReinstalling, setIsReinstalling] = useState(false);
  const [reinstallLog, setReinstallLog] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setReinstallDepCheck(null);
      setReinstallLog(null);
      return;
    }

    setRebuildBeforeReinstall(false);
    setReinstallLog(null);

    // Mapear projeto pelo nome/artifactId
    const matchedProject = projects.find((p) => {
      const pName = p.name.toLowerCase();
      const bName = (target.symbolicName || target.name).toLowerCase();
      return bName.includes(pName) || pName.includes(bName);
    });
    setReinstallProjectPath(matchedProject?.path || '');

    if (window.electronAPI?.checkKarafBundleDeps) {
      setIsCheckingReinstallDeps(true);
      window.electronAPI.checkKarafBundleDeps(target.id)
        .then((check) => setReinstallDepCheck(check))
        .catch((err) => console.error('Erro ao checar dependências para reinstalação:', err))
        .finally(() => setIsCheckingReinstallDeps(false));
    }
  }, [target, projects]);

  const handleConfirmReinstall = async () => {
    if (!target || !window.electronAPI?.reinstallKarafBundle) return;
    setIsReinstalling(true);
    setReinstallLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setReinstallLog((prev) => (prev || '') + chunk);
    });
    try {
      const req: ReinstallBundleRequest = {
        bundleId: target.id,
        projectPath: rebuildBeforeReinstall && reinstallProjectPath ? reinstallProjectPath : undefined,
        rebuild: rebuildBeforeReinstall && Boolean(reinstallProjectPath)
      };

      const res = await window.electronAPI.reinstallKarafBundle(req);
      if (!res.success) {
        showToast(`Falha na reinstalação: ${res.output}`, 'error');
      } else {
        await onSuccess();
        onClose();
      }
    } catch (err: any) {
      showToast(`Erro: ${err?.message || err}`, 'error');
    } finally {
      unsubscribe?.();
      setIsReinstalling(false);
    }
  };

  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Confirmar Reinstalação do Bundle</h4>
              <p className="text-[11px] text-muted-foreground">
                Recarrega a compilação local, atualiza fiações e reinicia o componente
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
          <div className="p-3 bg-muted/30 border border-border rounded-xl">
            <div className="text-xs font-bold text-foreground">{target.name}</div>
            <div className="text-2xs text-muted-foreground font-mono">
              ID: {target.id} · Versão: {target.version}
            </div>
          </div>

          {/* Checagem de dependentes que serão reconectados */}
          {isCheckingReinstallDeps ? (
            <div className="p-3 bg-muted/20 border border-border rounded-xl flex items-center justify-center space-x-2 text-xs text-muted-foreground">
              <RotateCw className="w-4 h-4 animate-spin text-primary" />
              <span>Verificando fiação de dependências para reconexão...</span>
            </div>
          ) : reinstallDepCheck ? (
            <div className="p-3 bg-muted/30 border border-border rounded-xl space-y-1.5 text-xs">
              <span className="font-semibold text-foreground block">
                {reinstallDepCheck.dependentBundles.length > 0
                  ? `${reinstallDepCheck.dependentBundles.length} bundle(s) clientes serão temporariamente reconectados.`
                  : 'Nenhum bundle cliente ativo dependente no momento.'}
              </span>
              <p className="text-[11px] text-muted-foreground">
                O Karaf executará <code className="font-mono text-foreground">bundle:update</code> seguido de{' '}
                <code className="font-mono text-foreground">bundle:refresh</code> e{' '}
                <code className="font-mono text-foreground">bundle:start</code>.
              </p>
            </div>
          ) : null}

          {/* Opção de Rebuild Maven */}
          {reinstallProjectPath && (
            <label className="flex items-start gap-2.5 p-3 bg-muted/40 border border-border rounded-xl cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={rebuildBeforeReinstall}
                onChange={(e) => setRebuildBeforeReinstall(e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-foreground font-medium block">
                  Executar compilação Maven (<code className="font-mono text-primary">mvn clean install -DskipTests</code>) antes de reinstalar
                </span>
                <span className="text-2xs text-muted-foreground font-mono block mt-0.5 truncate">
                  Pasta: {reinstallProjectPath}
                </span>
              </div>
            </label>
          )}

          {/* Log ao vivo do bundle:update + bundle:refresh + bundle:start */}
          {reinstallLog && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-slate-800">
              {reinstallLog}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isReinstalling}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmReinstall}
            disabled={isReinstalling}
            className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {isReinstalling ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Reinstalando...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirmar Reinstalação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
