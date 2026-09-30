import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  X,
  FolderOpen,
  RotateCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  BundleDependencyCheckResult,
  GitProjectInfo,
  InstallBundleRequest,
  KarafBundleInfo
} from '../../../../../shared/types';

interface KarafInstallModalProps {
  isOpen: boolean;
  updatingTargetBundle: KarafBundleInfo | null;
  projects: GitProjectInfo[];
  initialCoords?: string;
  initialVersion?: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const KarafInstallModal: React.FC<KarafInstallModalProps> = ({
  isOpen,
  updatingTargetBundle,
  projects,
  initialCoords = '',
  initialVersion = '',
  onClose,
  onSuccess
}) => {
  const [installSourceType, setInstallSourceType] = useState<'project' | 'mvn' | 'file'>('project');
  const [selectedProjectPath, setSelectedProjectPath] = useState('');
  const [mvnCoordinate, setMvnCoordinate] = useState('');
  const [filePath, setFilePath] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [installStartImmediately, setInstallStartImmediately] = useState(true);
  const [installDepCheck, setInstallDepCheck] = useState<BundleDependencyCheckResult | null>(null);
  const [isCheckingInstallDeps, setIsCheckingInstallDeps] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installLog, setInstallLog] = useState<string | null>(null);

  const updateFromSelectedProject = (proj: GitProjectInfo) => {
    if (proj.pomInfo) {
      const { groupId, artifactId, version, modules } = proj.pomInfo;
      const serviceModule = modules?.find((m) => m.includes('service')) || modules?.[0] || artifactId;
      setMvnCoordinate(`mvn:${groupId}/${serviceModule}/${version}`);
      setTargetVersion(version);
    } else {
      setMvnCoordinate(`mvn:com.suaempresa/${proj.name}/1.0.0-SNAPSHOT`);
      setTargetVersion('1.0.0-SNAPSHOT');
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setInstallDepCheck(null);
    setInstallLog(null);

    if (updatingTargetBundle) {
      setInstallSourceType('mvn');
      setMvnCoordinate(`mvn:${updatingTargetBundle.symbolicName || updatingTargetBundle.name}/${updatingTargetBundle.version}`);
      setTargetVersion(updatingTargetBundle.version);
    } else if (initialCoords) {
      setInstallSourceType('mvn');
      setMvnCoordinate(initialCoords);
      if (initialVersion) setTargetVersion(initialVersion);
    } else {
      setInstallSourceType('project');
      if (projects.length > 0) {
        setSelectedProjectPath(projects[0].path);
        updateFromSelectedProject(projects[0]);
      }
    }
  }, [isOpen, updatingTargetBundle, initialCoords, initialVersion, projects]);

  const handleSelectFile = async () => {
    if (window.electronAPI?.selectFile) {
      const picked = await window.electronAPI.selectFile({
        filters: [{ name: 'Arquivos JAR OSGi', extensions: ['jar'] }]
      });
      if (picked) {
        setFilePath(picked);
      }
    }
  };

  const getComputedLocation = (): string => {
    if (installSourceType === 'mvn') return mvnCoordinate.trim();
    if (installSourceType === 'file') return filePath.trim();
    if (installSourceType === 'project') {
      const proj = projects.find((p) => p.path === selectedProjectPath);
      if (proj?.pomInfo) {
        const { groupId, artifactId, modules } = proj.pomInfo;
        const v = targetVersion.trim() || proj.pomInfo.version || '1.0.0-SNAPSHOT';
        const serviceModule = modules?.find((m) => m.includes('service')) || modules?.[0] || artifactId;
        return `mvn:${groupId}/${serviceModule}/${v}`;
      }
      return mvnCoordinate.trim();
    }
    return '';
  };

  const handleCheckInstallImpact = async () => {
    const loc = getComputedLocation();
    if (!loc) {
      alert('Informe a localização ou coordenada Maven do bundle.');
      return;
    }
    setIsCheckingInstallDeps(true);
    setInstallDepCheck(null);
    try {
      if (window.electronAPI?.checkKarafInstallDeps) {
        const check = await window.electronAPI.checkKarafInstallDeps({
          location: loc,
          version: targetVersion.trim()
        });
        setInstallDepCheck(check);
      }
    } catch (err: any) {
      console.error('Erro na checagem de instalação:', err);
    } finally {
      setIsCheckingInstallDeps(false);
    }
  };

  const handleConfirmInstall = async () => {
    const loc = getComputedLocation();
    if (!loc) {
      alert('Informe a coordenada ou arquivo do bundle.');
      return;
    }

    setIsInstalling(true);
    setInstallLog('');
    const unsubscribe = window.electronAPI?.onKarafLogChunk?.((chunk) => {
      setInstallLog((prev) => (prev || '') + chunk);
    });
    try {
      if (updatingTargetBundle && window.electronAPI?.updateKarafBundleVersion) {
        const res = await window.electronAPI.updateKarafBundleVersion({
          bundleId: updatingTargetBundle.id,
          newVersionOrLocation: loc
        });
        if (!res?.success) {
          setInstallLog((prev) => `${prev || ''}\r\n[ERRO] ${res?.output || 'Falha ao atualizar versão do bundle'}`);
        } else {
          setInstallLog((prev) => `${prev || ''}\r\n[SUCESSO] Bundle [${updatingTargetBundle.id}] atualizado com sucesso!`);
          await onSuccess();
        }
      } else {
        const req: InstallBundleRequest = {
          location: loc,
          version: targetVersion.trim() || undefined,
          startImmediately: installStartImmediately
        };

        const res = await window.electronAPI?.installKarafBundle(req);
        if (!res?.success) {
          setInstallLog((prev) => `${prev || ''}\r\n[ERRO] ${res?.output || 'Falha ao instalar bundle'}`);
        } else {
          setInstallLog((prev) => `${prev || ''}\r\n[SUCESSO] Bundle instalado com ID: ${res.bundleId || 'concluído'}`);
          await onSuccess();
        }
      }
    } catch (err: any) {
      setInstallLog((prev) => `${prev || ''}\r\n[ERRO FATAL] ${err?.message || err}`);
    } finally {
      unsubscribe?.();
      setIsInstalling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-fade-in">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                {updatingTargetBundle
                  ? `Atualizar Versão: [${updatingTargetBundle.id}] ${updatingTargetBundle.name}`
                  : 'Instalar Bundle / Outra Versão'}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {updatingTargetBundle
                  ? 'Atualização in-place no Karaf (bundle:update) preservando ID e reconectando fiações'
                  : 'Implantação de componentes OSGi com verificação prévia de colisão e dependências'}
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
          {/* Seletor de Origem */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Origem do Bundle</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setInstallSourceType('project')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  installSourceType === 'project'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Projeto do Workspace
              </button>
              <button
                type="button"
                onClick={() => setInstallSourceType('mvn')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  installSourceType === 'mvn'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Coordenada Maven
              </button>
              <button
                type="button"
                onClick={() => setInstallSourceType('file')}
                className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                  installSourceType === 'file'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                Arquivo .JAR Local
              </button>
            </div>
          </div>

          {/* Campos específicos por origem */}
          {installSourceType === 'project' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Projeto Git do Workspace
                </label>
                <select
                  value={selectedProjectPath}
                  onChange={(e) => {
                    setSelectedProjectPath(e.target.value);
                    const proj = projects.find((p) => p.path === e.target.value);
                    if (proj) updateFromSelectedProject(proj);
                  }}
                  className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.path} value={p.path}>
                      {p.name} {p.pomInfo?.version ? `[v.${p.pomInfo.version}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Versão Alvo a Instalar
                </label>
                <input
                  type="text"
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  placeholder="Ex: 1.0.0-SNAPSHOT, 2.0.1"
                  className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>

              <div className="text-[11px] text-muted-foreground font-mono bg-muted/30 p-2 rounded-lg truncate">
                URL Calculada: <span className="text-foreground">{getComputedLocation()}</span>
              </div>
            </div>
          )}

          {installSourceType === 'mvn' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Coordenada Maven (mvn:groupId/artifactId/version)
                </label>
                <input
                  type="text"
                  value={mvnCoordinate}
                  onChange={(e) => setMvnCoordinate(e.target.value)}
                  placeholder="mvn:com.suaempresa/meu-servico/1.5.0"
                  className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Versão Alvo (opcional para filtro)
                </label>
                <input
                  type="text"
                  value={targetVersion}
                  onChange={(e) => setTargetVersion(e.target.value)}
                  placeholder="Ex: 1.5.0"
                  className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
            </div>
          )}

          {installSourceType === 'file' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-muted-foreground">
                  Caminho do Arquivo JAR
                </label>
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FolderOpen className="w-3 h-3" /> Selecionar Arquivo .JAR
                </button>
              </div>
              <input
                type="text"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="C:\caminho\para\meu-bundle.jar"
                className="w-full bg-input/50 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          )}

          {/* Opções de Instalação */}
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={installStartImmediately}
                onChange={(e) => setInstallStartImmediately(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span>
                Iniciar bundle após instalação (<code className="font-mono text-primary">-s</code>)
              </span>
            </label>

            <button
              type="button"
              onClick={handleCheckInstallImpact}
              disabled={isCheckingInstallDeps || !getComputedLocation()}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              {isCheckingInstallDeps ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              )}
              <span>Verificar Dependências</span>
            </button>
          </div>

          {/* Relatório da Verificação de Instalação */}
          {installDepCheck && (
            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
              <div className="font-bold flex items-center gap-2">
                {installDepCheck.alreadyInstalled ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                <span className="text-foreground">
                  {installDepCheck.alreadyInstalled ? 'Substituição de Versão Detectada' : 'Novo Bundle no Container'}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{installDepCheck.warningMessage}</p>

              {installDepCheck.dependentBundles.length > 0 && (
                <div className="mt-2 bg-background/50 border border-border rounded-lg p-2 max-h-28 overflow-y-auto space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                    Bundles clientes afetados na reconexão:
                  </span>
                  {installDepCheck.dependentBundles.map((dep) => (
                    <div key={dep.id} className="text-[10px] font-mono text-foreground">
                      [{dep.id}] {dep.name} {dep.version ? `(${dep.version})` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Log do comando */}
          {installLog && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-slate-800">
              {installLog}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isInstalling}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmInstall}
            disabled={isInstalling || !getComputedLocation()}
            className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {isInstalling ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>{updatingTargetBundle ? 'Atualizando Versão...' : 'Instalando...'}</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{updatingTargetBundle ? 'Confirmar Atualização de Versão' : 'Confirmar Instalação'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
