import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  DownloadCloud,
  FileUp,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Globe,
  RefreshCw,
  Search,
  RotateCcw,
  Trash2,
  Layers,
  Star,
  Clock,
  History,
  Activity
} from 'lucide-react';
import {
  RoutineDownloadResult,
  CcwCatalogItem,
  RoutineBackupEntry,
  RoutineRollbackResult,
  BatchRoutineItemProgress,
  BatchRoutineDownloadResult
} from '../../../shared/types';
import { normalizeRoutineTarget, buildCcwDownloadUrl } from '../../../shared/ccwRoutineCommon';

interface CcwRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRoutineName?: string;
  initialTab?: 'download' | 'file' | 'catalog' | 'rollback' | 'batch';
  appPath?: string;
}

export const CcwRoutineModal: React.FC<CcwRoutineModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialRoutineName = '',
  initialTab = 'download',
  appPath = ''
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'file' | 'catalog' | 'rollback' | 'batch'>(initialTab);

  // Aba 1: Download Direto
  const [routineInput, setRoutineInput] = useState<string>('');
  const [winthorVersion, setWinthorVersion] = useState<string>('30');
  const [targetModule, setTargetModule] = useState<string>('');
  const [backupExisting, setBackupExisting] = useState<boolean>(true);
  const [customDownloadUrl, setCustomDownloadUrl] = useState<string>('');

  // Aba 2: Arquivo Local
  const [localFilePath, setLocalFilePath] = useState<string>('');
  const [localRoutineName, setLocalRoutineName] = useState<string>('');
  const [localTargetModule, setLocalTargetModule] = useState<string>('');
  const [localBackup, setLocalBackup] = useState<boolean>(true);

  // Aba 3: Catálogo CCW
  const [catalogItems, setCatalogItems] = useState<CcwCatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogMessage, setCatalogMessage] = useState<string>('');
  const [catalogAuthCookie, setCatalogAuthCookie] = useState<string>('');

  // Status de execução
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<RoutineDownloadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Aba 4: Histórico & Rollback (.bak)
  const [rollbackRoutine, setRollbackRoutine] = useState<string>(initialRoutineName || '');
  const [backups, setBackups] = useState<RoutineBackupEntry[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState<boolean>(false);
  const [restoringBackupPath, setRestoringBackupPath] = useState<string | null>(null);
  const [deletingBackupPath, setDeletingBackupPath] = useState<string | null>(null);
  const [confirmingRestorePath, setConfirmingRestorePath] = useState<string | null>(null);
  const [confirmingDeletePath, setConfirmingDeletePath] = useState<string | null>(null);
  const [rollbackSuccessMsg, setRollbackSuccessMsg] = useState<string | null>(null);
  const [copiedEstimatedUrl, setCopiedEstimatedUrl] = useState<boolean>(false);

  // Aba 5: Atualização em Lote (Batch)
  const [batchTargetType, setBatchTargetType] = useState<'favorites' | 'module' | 'custom'>('favorites');
  const [batchModuleFolder, setBatchModuleFolder] = useState<string>('MOD-001');
  const [batchCustomCodes, setBatchCustomCodes] = useState<string>('');
  const [batchWinthorVersion, setBatchWinthorVersion] = useState<string>('30');
  const [batchBackupExisting, setBatchBackupExisting] = useState<boolean>(true);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchProgressList, setBatchProgressList] = useState<BatchRoutineItemProgress[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchRoutineDownloadResult | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const fetchBackups = useCallback(async (routineNameOrCode: string) => {
    if (!routineNameOrCode.trim() || !Boolean(window.electronAPI?.listRoutineBackups)) {
      setBackups([]);
      return;
    }
    setIsLoadingBackups(true);
    setRollbackSuccessMsg(null);
    setConfirmingRestorePath(null);
    setConfirmingDeletePath(null);
    try {
      const items = await window.electronAPI.listRoutineBackups(routineNameOrCode.trim());
      setBackups(items || []);
    } catch (err: any) {
      console.warn('Erro ao listar backups:', err);
      setBackups([]);
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  const handleRestoreBackup = async (entry: RoutineBackupEntry) => {
    if (!Boolean(window.electronAPI?.restoreRoutineBackup)) return;
    const backupPath = entry.backupFilePath || entry.fullPath;
    const targetPath = entry.targetRoutinePath;
    if (!backupPath || !targetPath) return;

    if (confirmingRestorePath !== backupPath) {
      setConfirmingRestorePath(backupPath);
      setConfirmingDeletePath(null);
      return;
    }

    setConfirmingRestorePath(null);
    setRestoringBackupPath(backupPath);
    setRollbackSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await window.electronAPI.restoreRoutineBackup(backupPath, targetPath);
      if (res.success) {
        const verStr = typeof res.restoredVersion === 'string'
          ? (res.restoredVersion ? ` (v${res.restoredVersion})` : '')
          : res.restoredVersion?.fileVersion ? ` (v${res.restoredVersion.fileVersion})` : '';
        setRollbackSuccessMsg(`Versão restaurada com sucesso${verStr}! Cópia pré-rollback salva como segurança.`);
        onSuccess();
        await fetchBackups(rollbackRoutine);
      } else {
        setErrorMsg(res.message || 'Falha ao restaurar versão do backup.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado ao restaurar backup.');
    } finally {
      setRestoringBackupPath(null);
    }
  };

  const handleDeleteBackup = async (entry: RoutineBackupEntry) => {
    if (!Boolean(window.electronAPI?.deleteRoutineBackup)) return;
    const backupPath = entry.backupFilePath || entry.fullPath;
    if (!backupPath) return;

    if (confirmingDeletePath !== backupPath) {
      setConfirmingDeletePath(backupPath);
      setConfirmingRestorePath(null);
      return;
    }

    setConfirmingDeletePath(null);
    setDeletingBackupPath(backupPath);
    try {
      const res = await window.electronAPI.deleteRoutineBackup(backupPath);
      if (res.success) {
        await fetchBackups(rollbackRoutine);
      } else {
        setErrorMsg(res.error || 'Falha ao excluir backup.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao excluir backup.');
    } finally {
      setDeletingBackupPath(null);
    }
  };

  const handleStartBatchDownload = async () => {
    if (!Boolean(window.electronAPI?.downloadRoutinesBatch)) return;

    setIsBatchRunning(true);
    setBatchSummary(null);
    setBatchError(null);
    setBatchProgressList([]);

    const codes =
      batchTargetType === 'custom'
        ? batchCustomCodes
            .split(/[,;\s\n]+/)
            .map((c) => c.trim())
            .filter(Boolean)
        : undefined;

    try {
      const res = await window.electronAPI.downloadRoutinesBatch({
        targetType: batchTargetType,
        winthorVersion: batchWinthorVersion.trim() || '30',
        moduleFolder: batchTargetType === 'module' ? batchModuleFolder : undefined,
        routineCodes: codes,
        backupExisting: batchBackupExisting
      });

      setBatchSummary(res);
      if (res.success) {
        onSuccess();
      } else {
        setBatchError(res.message || 'Falha no download em lote.');
      }
    } catch (err: any) {
      setBatchError(err?.message || 'Erro inesperado no download em lote.');
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Listener de eventos de progresso do batch
  useEffect(() => {
    if (!Boolean(window.electronAPI?.onRoutineBatchProgress)) return;
    const unsubscribe = window.electronAPI.onRoutineBatchProgress((progress) => {
      setBatchProgressList((prev) => {
        const targetCode = (progress.routineCodeOrName || progress.routine || progress.routineCode || '').toUpperCase();
        const idx = prev.findIndex((p) => (p.routineCodeOrName || p.routine || p.routineCode || '').toUpperCase() === targetCode);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = progress;
          return updated;
        }
        return [...prev, progress];
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialRoutineName) {
        setRoutineInput(initialRoutineName);
        setRollbackRoutine(initialRoutineName);
      }
      if (initialTab) {
        setActiveTab(initialTab);
      }
      setResult(null);
      setErrorMsg(null);
      setRollbackSuccessMsg(null);
      setBatchSummary(null);
      setBatchError(null);
      setBatchProgressList([]);

      if (initialTab === 'rollback' && initialRoutineName) {
        fetchBackups(initialRoutineName);
      }
    }
  }, [isOpen, initialRoutineName, initialTab, fetchBackups]);

  if (!isOpen) return null;

  const normalized = normalizeRoutineTarget(routineInput);
  const estimatedDownloadUrl = normalized.baseName
    ? buildCcwDownloadUrl(undefined, normalized.baseName, winthorVersion)
    : '';

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineInput.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      if (window.electronAPI?.downloadCcwRoutine) {
        const res = await window.electronAPI.downloadCcwRoutine({
          routineCodeOrName: routineInput.trim(),
          winthorVersion: winthorVersion.trim() || '30',
          targetModule: targetModule.trim() || undefined,
          backupExisting,
          customDownloadUrl: customDownloadUrl.trim() || undefined
        });

        if (res.success) {
          setResult(res);
          onSuccess();
        } else {
          setErrorMsg(res.message || res.error || 'Falha ao baixar rotina.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado durante o download.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectLocalFile = async () => {
    if (!window.electronAPI?.selectFile) return;
    try {
      const file = await window.electronAPI.selectFile({
        filters: [{ name: 'Rotinas WinThor (.EXE, .ZIP)', extensions: ['exe', 'zip'] }]
      });
      if (file) {
        setLocalFilePath(file);
        const fileName = file.split(/[\\/]/).pop() || '';
        const norm = normalizeRoutineTarget(fileName);
        if (norm.baseName) {
          setLocalRoutineName(norm.baseName);
        }
      }
    } catch (err: any) {
      console.warn('Erro ao selecionar arquivo:', err);
    }
  };

  const handleInstallLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localFilePath.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      if (window.electronAPI?.installLocalRoutineFile) {
        const res = await window.electronAPI.installLocalRoutineFile(
          localFilePath.trim(),
          localRoutineName.trim() || undefined,
          localTargetModule.trim() || undefined,
          localBackup
        );

        if (res.success) {
          setResult(res);
          onSuccess();
        } else {
          setErrorMsg(res.message || res.error || 'Falha ao instalar arquivo local.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro inesperado ao instalar arquivo local.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadCatalog = async () => {
    if (!window.electronAPI?.getCcwCatalog) return;
    setIsLoadingCatalog(true);
    setCatalogMessage('');
    try {
      const res = await window.electronAPI.getCcwCatalog(catalogAuthCookie.trim() || undefined);
      if (res.success && res.items) {
        setCatalogItems(res.items);
      } else {
        setCatalogMessage(res.message || 'Não foi possível carregar a árvore de rotinas.');
      }
    } catch (err: any) {
      setCatalogMessage(err?.message || 'Erro ao consultar Central de Controle.');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const filteredCatalog = catalogItems.filter((item) => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      item.rotina.toLowerCase().includes(q) ||
      item.moduloDesc.toLowerCase().includes(q) ||
      (item.versaoCorrente && item.versaoCorrente.includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="cockpit-panel border border-border/80 w-full max-w-2xl rounded-xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-card/80 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <DownloadCloud className="w-4 h-4 text-primary shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-foreground tracking-tight">
                  Central de Controle WinThor
                </h3>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 uppercase tracking-wider">
                  CCW
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Destino:</span>
                <span className="text-foreground font-semibold font-mono">{appPath || 'C:\\Winthor\\Prod'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dock de Abas - Segmented Console Switch */}
        <div className="px-4 pt-2.5 pb-2 bg-muted/20 border-b border-border/80 shrink-0">
          <div className="bg-background/80 p-0.5 rounded-lg border border-border/70 flex items-center gap-1 overflow-x-auto shadow-inner">
            <button
              type="button"
              onClick={() => { setActiveTab('download'); setResult(null); setErrorMsg(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'download'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'
              }`}
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${activeTab === 'download' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>Download CCW</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('file'); setResult(null); setErrorMsg(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'
              }`}
            >
              <FileUp className={`w-3.5 h-3.5 ${activeTab === 'file' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>Arquivo Local</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('catalog'); setResult(null); setErrorMsg(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'catalog'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${activeTab === 'catalog' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>Árvore CCW</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('rollback');
                setResult(null);
                setErrorMsg(null);
                if (rollbackRoutine) fetchBackups(rollbackRoutine);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'rollback'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${activeTab === 'rollback' ? 'text-amber-500' : 'text-muted-foreground'}`} />
              <span>Histórico &amp; Rollback</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('batch'); setResult(null); setErrorMsg(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-card text-foreground shadow-xs border border-border/80'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'batch' ? 'text-primary' : 'text-muted-foreground'}`} />
              <span>Atualização em Lote</span>
            </button>
          </div>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Alertas de Sucesso e Erro */}
          {result && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{result.message}</span>
              </div>
              {result.installedPath && (
                <div className="text-[11px] font-mono text-muted-foreground pl-6 break-all">
                  Instalado em: <span className="text-foreground font-bold">{result.installedPath}</span>
                </div>
              )}
              {result.backupPath && (
                <div className="text-[11px] font-mono text-muted-foreground pl-6 break-all">
                  Backup criado: <span className="text-foreground font-semibold">{result.backupPath}</span>
                </div>
              )}
              {result.extractedFiles && result.extractedFiles.length > 0 && (
                <div className="text-[10px] text-muted-foreground pl-6">
                  Arquivos gravados ({result.extractedFiles.length}): {result.extractedFiles.join(', ')}
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Falha na operação</span>
                <span className="text-[11px] mt-0.5 block opacity-90">{errorMsg}</span>
              </div>
            </div>
          )}

          {/* TAB 1: DOWNLOAD DIRETO */}
          {activeTab === 'download' && (
            <form onSubmit={handleDownload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Código ou Nome da Rotina <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 132, PCSIS132, PC1406, PCINFTAB"
                    value={routineInput}
                    onChange={(e) => setRoutineInput(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
                  />
                  {normalized.baseName && (
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Identificado como: <span className="text-primary font-bold">{normalized.baseName}.EXE</span>
                      {normalized.code && ` (Rotina ${normalized.code})`}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Versão WinThor
                  </label>
                  <select
                    value={winthorVersion}
                    onChange={(e) => setWinthorVersion(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs cursor-pointer"
                  >
                    <option value="30">30 (Padrão)</option>
                    <option value="31">31</option>
                    <option value="29">29</option>
                    <option value="28">28</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Pasta de Módulo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-detectar (ex: MOD-001, Raiz)"
                    value={targetModule}
                    onChange={(e) => setTargetModule(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Se vazio, o Dev Manager detecta automaticamente se a rotina já existe em alguma subpasta ou calcula pelo código.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    URL Customizada (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="Deixe em branco para usar URL oficial da CCW"
                    value={customDownloadUrl}
                    onChange={(e) => setCustomDownloadUrl(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
                  />
                  <p className="text-[10px] text-muted-foreground truncate" title={estimatedDownloadUrl}>
                    URL padrão: {estimatedDownloadUrl || 'https://centraldecontrole.pcinformatica.com.br/api/rotinas/downloadRotina/...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="backupExistingCheck"
                  checked={backupExisting}
                  onChange={(e) => setBackupExisting(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <label htmlFor="backupExistingCheck" className="text-xs text-foreground flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Criar backup automático (.bak) do executável anterior antes de substituir</span>
                </label>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Destino: {appPath || 'C:\\Winthor\\Prod'}
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || !routineInput.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Baixando &amp; Atualizando...</span>
                    </>
                  ) : (
                    <>
                      <DownloadCloud className="w-4 h-4" />
                      <span>Baixar e Atualizar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ARQUIVO LOCAL */}
          {activeTab === 'file' && (
            <form onSubmit={handleInstallLocal} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground">
                  Arquivo Baixado (.EXE ou .ZIP) <span className="text-primary">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    readOnly
                    placeholder="Selecione o arquivo no computador..."
                    value={localFilePath}
                    className="flex-1 bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground font-mono shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleSelectLocalFile}
                    className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span>Procurar...</span>
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Se você já baixou o arquivo manualmente pelo navegador (ex: na pasta Downloads), selecione-o aqui para que o Dev Manager extraia e instale na pasta certa.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Nome da Rotina / Identificador
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PCSIS132 (auto-detectado se vazio)"
                    value={localRoutineName}
                    onChange={(e) => setLocalRoutineName(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Pasta de Módulo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-detectar (ex: MOD-001)"
                    value={localTargetModule}
                    onChange={(e) => setLocalTargetModule(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="localBackupCheck"
                  checked={localBackup}
                  onChange={(e) => setLocalBackup(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <label htmlFor="localBackupCheck" className="text-xs text-foreground flex items-center gap-1.5 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Criar backup automático (.bak) da versão existente antes de substituir</span>
                </label>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
                <span className="text-[11px] text-muted-foreground font-mono">
                  Destino: {appPath || 'C:\\Winthor\\Prod'}
                </span>
                <button
                  type="submit"
                  disabled={isSubmitting || !localFilePath.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Instalando...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      <span>Instalar no Prod</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ÁRVORE CCW */}
          {activeTab === 'catalog' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-foreground block">Portal Central de Controle</span>
                  <span className="text-[11px] text-muted-foreground block">
                    Acesse a árvore de rotinas diretamente no navegador web da PC Informática:
                  </span>
                </div>
                <a
                  href="https://centraldecontrole.pcinformatica.com.br/#/main-suporte/arvore-rotinas"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Portal CCW</span>
                </a>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-foreground">
                    Consulta da API da Central de Controle
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadCatalog}
                    disabled={isLoadingCatalog}
                    className="px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-lg text-xs font-bold text-foreground flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingCatalog ? 'animate-spin text-primary' : ''}`} />
                    <span>Carregar Árvore</span>
                  </button>
                </div>

                <input
                  type="password"
                  placeholder="Cookie de sessão (suukie=...) ou configure nas Configurações"
                  value={catalogAuthCookie}
                  onChange={(e) => setCatalogAuthCookie(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl px-3.5 py-1.5 text-xs text-foreground placeholder-muted-foreground font-mono"
                />
              </div>

              {catalogMessage && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                  {catalogMessage}
                </div>
              )}

              {catalogItems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar rotinas na árvore..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground font-mono"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {filteredCatalog.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-2 hover:border-primary/40 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-foreground">{item.rotina}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                              {item.moduloDesc}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex gap-2">
                            <span>Corrente: <b>{item.versaoCorrente || 'N/A'}</b></span>
                            {item.versaoNova && <span>Nova: <b>{item.versaoNova}</b></span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRoutineInput(item.rotina);
                            setActiveTab('download');
                          }}
                          className="px-2.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <DownloadCloud className="w-3 h-3" />
                          <span>Baixar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTÓRICO & ROLLBACK */}
          {activeTab === 'rollback' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Gerenciador de Rollback de Rotinas (.bak)
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Restaure versões anteriores criadas automaticamente antes de atualizações ou substituições de executáveis.
                </span>
              </div>

              {/* Busca da rotina */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Código ou nome da rotina (ex: 132, PCSIS132)..."
                    value={rollbackRoutine}
                    onChange={(e) => setRollbackRoutine(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        fetchBackups(rollbackRoutine);
                      }
                    }}
                    className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchBackups(rollbackRoutine)}
                  disabled={isLoadingBackups || !rollbackRoutine.trim()}
                  className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>Buscar Backups</span>
                </button>
              </div>

              {/* Feedback de sucesso do rollback */}
              {rollbackSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in duration-150">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{rollbackSuccessMsg}</span>
                </div>
              )}

              {/* Lista de backups */}
              {isLoadingBackups ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="font-mono">Escaneando backups no diretório...</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="p-5 rounded-xl bg-card/30 border border-border/70 text-center space-y-1.5 shadow-2xs">
                  <History className="w-6 h-6 text-muted-foreground/60 mx-auto" />
                  <div className="text-xs font-bold font-mono text-foreground">
                    {rollbackRoutine.trim()
                      ? `Nenhum backup (.bak) encontrado para "${rollbackRoutine}"`
                      : 'Informe o código da rotina e clique em "Buscar Backups"'}
                  </div>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    Cópias .bak são criadas automaticamente sempre que uma rotina é atualizada pela CCW ou substituída localmente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-bold text-foreground font-mono">
                      {backups.length} cópia(s) encontrada(s)
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Mais recente para mais antiga
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {backups.map((entry, entryIdx) => {
                      const backupPath = entry.backupFilePath || entry.fullPath;
                      const isRestoring = restoringBackupPath === backupPath;
                      const isDeleting = deletingBackupPath === backupPath;
                      const isConfirmingRestore = confirmingRestorePath === backupPath;
                      const isConfirmingDelete = confirmingDeletePath === backupPath;

                      return (
                        <div
                          key={backupPath || entryIdx}
                          className={`p-3 rounded-xl bg-card border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-2xs ${
                            isConfirmingRestore
                              ? 'border-amber-500/60 bg-amber-500/5'
                              : isConfirmingDelete
                              ? 'border-destructive/60 bg-destructive/5'
                              : 'border-border/80 hover:border-primary/40'
                          }`}
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold font-mono text-foreground truncate max-w-xs" title={entry.fileName}>
                                {entry.fileName}
                              </span>
                              {entry.isPreRollback && (
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 uppercase tracking-wider">
                                  <span>Pré-Rollback</span>
                                </span>
                              )}
                              {entry.version?.fileVersion && (
                                <span
                                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-2xs"
                                  title={`Versão do Executável (PE Header): FileVersion ${entry.version.fileVersion}${entry.version.productVersion ? ` / ProductVersion ${entry.version.productVersion}` : ''}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>v{entry.version.fileVersion}</span>
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {entry.sizeFormatted}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <Clock className="w-3 h-3 text-muted-foreground/70" />
                                {entry.dateFormatted}
                              </span>
                              <span className="truncate text-[10px] font-mono opacity-80" title={entry.targetRoutinePath || ''}>
                                Destino: {entry.targetRoutinePath ? entry.targetRoutinePath.split(/[\\/]/).pop() : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isConfirmingRestore ? (
                              <div className="flex items-center gap-1 animate-in fade-in duration-100">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreBackup(entry)}
                                  disabled={isRestoring || isDeleting}
                                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs animate-pulse"
                                  title="Confirmar restauração desta versão"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Confirmar?</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingRestorePath(null)}
                                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRestoreBackup(entry)}
                                disabled={isRestoring || isDeleting}
                                className="px-2.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                title="Restaurar esta versão para o arquivo executável ativo"
                              >
                                <RotateCcw className={`w-3 h-3 ${isRestoring ? 'animate-spin' : ''}`} />
                                <span>{isRestoring ? 'Restaurando...' : 'Restaurar'}</span>
                              </button>
                            )}

                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1 animate-in fade-in duration-100">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBackup(entry)}
                                  disabled={isRestoring || isDeleting}
                                  className="px-2 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                                  title="Confirmar exclusão definitiva do backup"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Excluir?</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingDeletePath(null)}
                                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleDeleteBackup(entry)}
                                disabled={isRestoring || isDeleting}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Excluir este arquivo .bak definitivamente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ATUALIZAÇÃO EM LOTE */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Atualização em Lote de Rotinas (Batch Download)
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Baixe e atualize automaticamente um grupo de rotinas com criação prévia de cópias .bak.
                </span>
              </div>

              {/* Seletor de Tipo de Alvo com Acabamento Tátil */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setBatchTargetType('favorites')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    batchTargetType === 'favorites'
                      ? 'bg-primary/10 border-primary/80 ring-1 ring-primary/40 text-foreground shadow-xs'
                      : 'bg-card border-border/80 hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                    </div>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 uppercase tracking-wider">
                      Recomendado
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <span className="text-xs font-bold block text-foreground">Rotinas Favoritas</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Atualiza todas as rotinas marcadas com estrela no catálogo.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchTargetType('module')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    batchTargetType === 'module'
                      ? 'bg-primary/10 border-primary/80 ring-1 ring-primary/40 text-foreground shadow-xs'
                      : 'bg-card border-border/80 hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-1 rounded-md bg-primary/10 text-primary border border-primary/30">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <span className="text-xs font-bold block text-foreground">Módulo Específico</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Atualiza todas as rotinas de uma pasta funcional (ex: MOD-001).
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBatchTargetType('custom')}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    batchTargetType === 'custom'
                      ? 'bg-primary/10 border-primary/80 ring-1 ring-primary/40 text-foreground shadow-xs'
                      : 'bg-card border-border/80 hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="p-1 rounded-md bg-primary/10 text-primary border border-primary/30">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <span className="text-xs font-bold block text-foreground">Lista Customizada</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      Informe uma lista livre de códigos ou nomes (ex: 132, 529).
                    </span>
                  </div>
                </button>
              </div>

              {/* Campos dinâmicos conforme alvo */}
              {batchTargetType === 'module' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Módulo Funcional de Destino</label>
                  <select
                    value={batchModuleFolder}
                    onChange={(e) => setBatchModuleFolder(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono cursor-pointer shadow-2xs"
                  >
                    {Array.from({ length: 30 }, (_, i) => {
                      const modNum = String(i + 1).padStart(3, '0');
                      return (
                        <option key={modNum} value={`MOD-${modNum}`}>
                          MOD-{modNum} (Módulo {i + 1})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {batchTargetType === 'custom' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Códigos ou Nomes das Rotinas</label>
                  <textarea
                    rows={2}
                    placeholder="Digite os códigos separados por vírgula ou espaço (ex: 132, 529, 1406, PCSIS1700)..."
                    value={batchCustomCodes}
                    onChange={(e) => setBatchCustomCodes(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground font-mono resize-none shadow-2xs"
                  />
                </div>
              )}

              {/* Configurações do Lote */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-card border border-border/80">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Versão do WinThor na CCW</label>
                  <input
                    type="text"
                    value={batchWinthorVersion}
                    onChange={(e) => setBatchWinthorVersion(e.target.value)}
                    placeholder="30"
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground block font-mono">Padrão TOTVS: 30 (ou 31, 29)</span>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <input
                    type="checkbox"
                    id="batchBackupExisting"
                    checked={batchBackupExisting}
                    onChange={(e) => setBatchBackupExisting(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="batchBackupExisting" className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Gerar cópias .bak antes de substituir</span>
                  </label>
                </div>
              </div>

              {/* Botão de Ação */}
              <button
                type="button"
                onClick={handleStartBatchDownload}
                disabled={isBatchRunning}
                className="w-full py-2.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-primary/25 disabled:opacity-50"
              >
                {isBatchRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executando Download em Lote...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>Iniciar Atualização em Lote</span>
                  </>
                )}
              </button>

              {/* Feedback de Erro do Batch */}
              {batchError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{batchError}</span>
                </div>
              )}

              {/* Resumo do Batch Concluído */}
              {batchSummary && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-150 ${
                    batchSummary.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {batchSummary.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{batchSummary.message}</span>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground pl-6">
                    Total: <b className="text-foreground">{batchSummary.totalRoutines ?? batchSummary.total}</b> | Sucessos:{' '}
                    <b className="text-emerald-500">{batchSummary.successfulDownloads ?? batchSummary.completed}</b> | Falhas:{' '}
                    <b className={(batchSummary.failedDownloads ?? batchSummary.failed ?? 0) > 0 ? 'text-destructive' : 'text-foreground'}>
                      {batchSummary.failedDownloads ?? batchSummary.failed ?? 0}
                    </b>
                  </div>
                </div>
              )}

              {/* Monitoramento de Progresso em Tempo Real com Telemetria e LEDs */}
              {batchProgressList.length > 0 && (() => {
                const total = batchProgressList.length;
                const completed = batchProgressList.filter((p) => p.status === 'completed').length;
                const failed = batchProgressList.filter((p) => p.status === 'failed').length;
                const percent = Math.round(((completed + failed) / (total || 1)) * 100);

                return (
                  <div className="space-y-2 border border-border/80 rounded-xl p-3 bg-card/60 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-foreground">
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span>Telemetria do Download ({percent}%)</span>
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {completed + failed} de {total} processadas
                      </span>
                    </div>

                    {/* Barra de progresso de alta precisão */}
                    <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden border border-border/40">
                      <div
                        className="bg-primary h-full transition-all duration-300 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 mt-2">
                      {batchProgressList.map((prog, progIdx) => (
                        <div
                          key={prog.routineCodeOrName || prog.routine || prog.routineCode || progIdx}
                          className="p-2 rounded-lg bg-background/80 border border-border/60 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {prog.status === 'downloading' && (
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                              </span>
                            )}
                            {prog.status === 'completed' && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                            )}
                            {prog.status === 'failed' && (
                              <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                            )}
                            {prog.status === 'pending' && (
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                            )}
                            <span className="font-mono font-bold text-foreground truncate">
                              {prog.routineCodeOrName || prog.routine || prog.routineCode}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-mono truncate max-w-xs ${
                              prog.status === 'completed'
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : prog.status === 'failed'
                                ? 'text-destructive font-bold'
                                : prog.status === 'downloading'
                                ? 'text-primary font-semibold'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {prog.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
