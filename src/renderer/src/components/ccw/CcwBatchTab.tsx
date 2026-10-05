import React from 'react';
import { ShieldCheck, Loader2, DownloadCloud, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { BatchRoutineItemProgress, BatchRoutineDownloadResult } from '../../../../shared/types';
import { CcwBatchTargetSelector } from './CcwBatchTargetSelector';
import { CcwBatchProgress } from './CcwBatchProgress';

interface CcwBatchTabProps {
  targetType: 'favorites' | 'module' | 'custom';
  onTargetTypeChange: (v: 'favorites' | 'module' | 'custom') => void;
  moduleFolder: string;
  onModuleFolderChange: (v: string) => void;
  customCodes: string;
  onCustomCodesChange: (v: string) => void;
  winthorVersion: string;
  onWinthorVersionChange: (v: string) => void;
  backupExisting: boolean;
  onBackupExistingChange: (v: boolean) => void;
  isRunning: boolean;
  onStart: () => void;
  error: string | null;
  summary: BatchRoutineDownloadResult | null;
  progressList: BatchRoutineItemProgress[];
}

export const CcwBatchTab: React.FC<CcwBatchTabProps> = ({
  targetType,
  onTargetTypeChange,
  moduleFolder,
  onModuleFolderChange,
  customCodes,
  onCustomCodesChange,
  winthorVersion,
  onWinthorVersionChange,
  backupExisting,
  onBackupExistingChange,
  isRunning,
  onStart,
  error,
  summary,
  progressList
}) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <span className="text-xs font-bold text-foreground block">
        Atualização em Lote de Rotinas (Batch Download)
      </span>
      <span className="text-[11px] text-muted-foreground block">
        Baixe e atualize automaticamente um grupo de rotinas com criação prévia de cópias .bak.
      </span>
    </div>

    <CcwBatchTargetSelector value={targetType} onChange={onTargetTypeChange} />

    {/* Campos dinâmicos conforme alvo */}
    {targetType === 'module' && (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">Módulo Funcional de Destino</label>
        <select
          value={moduleFolder}
          onChange={(e) => onModuleFolderChange(e.target.value)}
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

    {targetType === 'custom' && (
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">Códigos ou Nomes das Rotinas</label>
        <textarea
          rows={2}
          placeholder="Digite os códigos separados por vírgula ou espaço (ex: 132, 529, 1406, PCSIS1700)..."
          value={customCodes}
          onChange={(e) => onCustomCodesChange(e.target.value)}
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
          value={winthorVersion}
          onChange={(e) => onWinthorVersionChange(e.target.value)}
          placeholder="30"
          className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground font-mono"
        />
        <span className="text-2xs text-muted-foreground block font-mono">Padrão TOTVS: 30 (ou 31, 29)</span>
      </div>

      <div className="flex items-center space-x-2 pt-4">
        <input
          type="checkbox"
          id="batchBackupExisting"
          checked={backupExisting}
          onChange={(e) => onBackupExistingChange(e.target.checked)}
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
      onClick={onStart}
      disabled={isRunning}
      className="w-full py-2.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-primary/25 disabled:opacity-50"
    >
      {isRunning ? (
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
    {error && (
      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    )}

    {/* Resumo do Batch Concluído */}
    {summary && (
      <div
        className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-in fade-in duration-150 ${
          summary.success
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
        }`}
      >
        <div className="flex items-center gap-2 font-bold">
          {summary.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{summary.message}</span>
        </div>
        <div className="text-[11px] font-mono text-muted-foreground pl-6">
          Total: <b className="text-foreground">{summary.totalRoutines ?? summary.total}</b> | Sucessos:{' '}
          <b className="text-emerald-500">{summary.successfulDownloads ?? summary.completed}</b> | Falhas:{' '}
          <b className={(summary.failedDownloads ?? summary.failed ?? 0) > 0 ? 'text-destructive' : 'text-foreground'}>
            {summary.failedDownloads ?? summary.failed ?? 0}
          </b>
        </div>
      </div>
    )}

    {progressList.length > 0 && <CcwBatchProgress progressList={progressList} />}
  </div>
);
