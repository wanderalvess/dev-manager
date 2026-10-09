import React from 'react';
import { FileArchive, RotateCw, RotateCcw, FlaskConical } from 'lucide-react';
import type { BackupFileInfo, BackupResult, DatabaseConnectionConfig } from '../../../../../shared/types';
import { backupResultToneClass, formatBytes } from '../../../utils/backupModalUtils';

interface BackupFilesTabProps {
  connections: DatabaseConnectionConfig[];
  backupFolder: string;
  backupFiles: BackupFileInfo[];
  isLoadingBackupFiles: boolean;
  scratchConnectionId: string;
  onScratchConnectionChange: (id: string) => void;
  restoreResult: BackupResult | null;
  drillResult: BackupResult | null;
  restoringFilePath: string | null;
  drillingFilePath: string | null;
  onRefresh: () => void;
  onRestore: (file: BackupFileInfo) => void;
  onRestoreDrill: (file: BackupFileInfo) => void;
}

export const BackupFilesTab: React.FC<BackupFilesTabProps> = ({
  connections,
  backupFolder,
  backupFiles,
  isLoadingBackupFiles,
  scratchConnectionId,
  onScratchConnectionChange,
  restoreResult,
  drillResult,
  restoringFilePath,
  drillingFilePath,
  onRefresh,
  onRestore,
  onRestoreDrill
}) => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/40 border border-border/70 rounded-xl">
      <div className="flex items-center gap-2">
        <span className="font-bold text-foreground text-xs">Backups na Pasta</span>
        <span className="text-2xs font-mono text-muted-foreground truncate max-w-xs" title={backupFolder}>
          ({backupFolder || 'nenhuma pasta definida'})
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={scratchConnectionId}
          onChange={(e) => onScratchConnectionChange(e.target.value)}
          className="bg-background border border-border/80 rounded-lg p-1.5 text-xs text-foreground focus:outline-hidden focus:border-primary"
        >
          <option value="">Conexão scratch para teste...</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onRefresh}
          disabled={!backupFolder.trim() || isLoadingBackupFiles}
          className="p-1.5 hover:text-foreground text-muted-foreground rounded-lg hover:bg-muted transition disabled:opacity-50 cursor-pointer"
          title="Recarregar arquivos" aria-label="Recarregar arquivos"
        >
          <RotateCw className={`w-4 h-4 ${isLoadingBackupFiles ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
    </div>

    {restoreResult && (
      <div className={`p-3 rounded-xl border text-xs ${backupResultToneClass(restoreResult.success)}`}>
        {restoreResult.message}
      </div>
    )}

    {drillResult && (
      <div className={`p-3 rounded-xl border text-xs ${backupResultToneClass(drillResult.success)}`}>
        {drillResult.message}
        {drillResult.success && drillResult.checksumSha256 && (
          <p className="text-2xs font-mono opacity-80 mt-1 truncate">
            SHA-256: {drillResult.checksumSha256}
          </p>
        )}
      </div>
    )}

    {backupFiles.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground bg-muted/20 border border-border/60 rounded-xl space-y-1">
        <FileArchive className="w-8 h-8 mx-auto opacity-40 text-muted-foreground mb-2" />
        <p className="font-semibold text-xs text-foreground">Nenhum arquivo de backup encontrado</p>
        <p className="text-2xs">Nenhum arquivo (.dmp, .sql, .dump) foi localizado na pasta de destino selecionada.</p>
      </div>
    ) : (
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {backupFiles.map((f) => (
          <div
            key={f.filePath}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background/70 border border-border/70 rounded-xl gap-2 hover:border-border transition shadow-2xs"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground truncate" title={f.filePath}>
                  {f.fileName}
                </span>
                <span className="text-2xs font-mono uppercase px-1.5 py-0.2 rounded bg-muted border border-border/60 text-muted-foreground shrink-0">
                  {f.fileName.split('.').pop()}
                </span>
              </div>
              <div className="flex items-center gap-3 text-2xs text-muted-foreground font-mono mt-1">
                <span>{formatBytes(f.sizeBytes)}</span>
                <span>·</span>
                <span>{new Date(f.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => onRestoreDrill(f)}
                disabled={!scratchConnectionId || drillingFilePath !== null}
                title="Testar restauração numa conexão descartável (não afeta o banco ativo)"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {drillingFilePath === f.filePath ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FlaskConical className="w-3.5 h-3.5" />
                )}
                <span>Restore Drill</span>
              </button>

              <button
                type="button"
                onClick={() => onRestore(f)}
                disabled={restoringFilePath !== null}
                title="Restaurar este backup na conexão ativa (sobrescreve dados existentes)"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {restoringFilePath === f.filePath ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>Restaurar</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
