import React from 'react';
import { History, Download, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BackupHistoryEntry } from '../../../../../shared/types';
import { formatBytes, getBackupHistoryActionLabel } from '../../../utils/backupModalUtils';

interface BackupHistoryTabProps {
  backupHistory: BackupHistoryEntry[];
  isLoadingBackupHistory: boolean;
  copyFeedback: string | null;
  onCopyHash: (text: string, key: string) => void;
  onExportCsv: () => void;
  onRefresh: () => void;
}

export const BackupHistoryTab: React.FC<BackupHistoryTabProps> = ({
  backupHistory,
  isLoadingBackupHistory,
  copyFeedback,
  onCopyHash,
  onExportCsv,
  onRefresh
}) => (
  <div className="space-y-3 animate-fade-in">
    <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border/70 rounded-xl">
      <span className="font-bold text-foreground text-xs">Histórico de Execuções</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExportCsv}
          disabled={backupHistory.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border border-border/70 transition text-xs font-semibold disabled:opacity-50 shadow-2xs cursor-pointer"
          title="Exportar histórico como arquivo CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar CSV</span>
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoadingBackupHistory}
          className="p-1.5 hover:text-foreground text-muted-foreground rounded-lg hover:bg-muted transition disabled:opacity-50 cursor-pointer"
          title="Recarregar histórico"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoadingBackupHistory ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
    </div>

    {backupHistory.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground bg-muted/20 border border-border/60 rounded-xl space-y-1">
        <History className="w-8 h-8 mx-auto opacity-40 text-muted-foreground mb-2" />
        <p className="font-semibold text-xs text-foreground">Nenhuma execução registrada</p>
        <p className="text-[11px]">As rotinas manuais ou agendadas serão registradas aqui.</p>
      </div>
    ) : (
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {backupHistory.map((h) => (
          <div
            key={h.id}
            className={`p-3.5 bg-background/70 border rounded-xl gap-2 transition ${
              h.success ? 'border-emerald-500/25 shadow-2xs' : 'border-rose-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold">
                {h.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className="text-foreground">{getBackupHistoryActionLabel(h.action)}</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-md bg-muted border border-border/50 text-muted-foreground">
                  {h.trigger === 'scheduled' ? 'agendado' : 'manual'}
                </span>
              </span>

              <span className="text-[11px] text-muted-foreground font-mono">
                {new Date(h.startedAt).toLocaleString()}
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5 truncate" title={h.message}>
              {h.message}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-muted-foreground/80 mt-2 border-t border-border/40 pt-1.5">
              {h.durationMs !== undefined && <span>Duração: {h.durationMs} ms</span>}
              {h.sizeBytes !== undefined && <span>Tamanho: {formatBytes(h.sizeBytes)}</span>}
              {h.checksumSha256 && (
                <div className="flex items-center gap-1.5 truncate">
                  <span className="truncate" title={h.checksumSha256}>
                    SHA-256: {h.checksumSha256.slice(0, 16)}…
                  </span>
                  <button
                    type="button"
                    onClick={() => onCopyHash(h.checksumSha256!, `hist-hash-${h.id}`)}
                    className="hover:text-foreground transition underline font-mono text-[9px] cursor-pointer"
                    title="Copiar hash completo"
                  >
                    {copyFeedback === `hist-hash-${h.id}` ? '✓' : 'Copiar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
