import React from 'react';
import { HardDriveDownload, RotateCw, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BackupResult } from '../../../../../shared/types';
import { backupResultToneClass, formatBytes, hasBackupFileTag } from '../../../utils/backupModalUtils';

interface BackupRunSectionProps {
  isRunningBackup: boolean;
  backupFolder: string;
  useCustomBackupCommand: boolean;
  customBackupCommand: string;
  backupResult: BackupResult | null;
  copyFeedback: string | null;
  onCopyHash: (text: string, key: string) => void;
  onRun: () => void;
}

/** Botão de execução e feedback do último backup manual. */
export const BackupRunSection: React.FC<BackupRunSectionProps> = ({
  isRunningBackup,
  backupFolder,
  useCustomBackupCommand,
  customBackupCommand,
  backupResult,
  copyFeedback,
  onCopyHash,
  onRun
}) => {
  const missingFileTag = useCustomBackupCommand && !hasBackupFileTag(customBackupCommand);

  return (
    <div className="space-y-3 pt-1">
      <button
        type="button"
        onClick={onRun}
        disabled={isRunningBackup || !backupFolder.trim() || missingFileTag}
        className="w-full flex items-center justify-center space-x-2 px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 text-sm tracking-wide cursor-pointer"
      >
        {isRunningBackup ? (
          <>
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>Executando Backup...</span>
          </>
        ) : (
          <>
            <HardDriveDownload className="w-4 h-4" />
            <span>Fazer Backup Agora</span>
          </>
        )}
      </button>

      {missingFileTag && (
        <p className="text-2xs text-amber-500 flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Para iniciar o backup personalizado, inclua a tag <code>{'{filePath}'}</code> ou <code>{'{fileName}'}</code> no comando.</span>
        </p>
      )}

      {backupResult && (
        <div className={`p-4 rounded-xl border ${backupResultToneClass(backupResult.success)}`}>
          <div className="flex items-start space-x-2.5 font-bold">
            {backupResult.success ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            )}
            <div className="min-w-0 flex-1">
              <span className="break-all text-xs">{backupResult.message}</span>
              {backupResult.success && backupResult.sizeBytes !== undefined && (
                <div className="flex flex-wrap items-center gap-3 text-2xs font-mono opacity-90 mt-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                    Tamanho: {formatBytes(backupResult.sizeBytes)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                    Duração: {backupResult.durationMs} ms
                  </span>
                </div>
              )}
              {backupResult.success && backupResult.checksumSha256 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-2xs font-mono opacity-80 truncate" title={backupResult.checksumSha256}>
                    SHA-256: {backupResult.checksumSha256}
                  </span>
                  <button
                    type="button"
                    onClick={() => onCopyHash(backupResult.checksumSha256!, 'result-hash')}
                    className="text-2xs px-1.5 py-0.2 rounded hover:bg-emerald-500/20 font-mono transition cursor-pointer"
                    title="Copiar hash"
                  >
                    {copyFeedback === 'result-hash' ? '✓ Copiado' : 'Copiar hash'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
