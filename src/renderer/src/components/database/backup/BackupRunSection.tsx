import React from 'react';
import { HardDriveDownload, RotateCw, AlertCircle } from 'lucide-react';
import type { BackupResult } from '../../../../../shared/types';
import { formatBytes, getCustomCommandProblem } from '../../../utils/backupModalUtils';
import { BackupResultBox } from './BackupResultBox';

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
  const commandProblem = useCustomBackupCommand ? getCustomCommandProblem(customBackupCommand) : null;

  return (
    <div className="space-y-3 min-w-0 xl:sticky xl:top-0 xl:rounded-[14px] xl:border xl:border-border xl:bg-muted/30 xl:p-5">
      <dl className="hidden xl:block space-y-2 pb-2 text-[13px]">
        <dt className="text-sm font-semibold text-foreground">Resumo da execução</dt>
        <dd className="flex justify-between gap-3 text-muted-foreground">
          <span>Pasta de destino</span>
          <span className={`font-mono truncate ${backupFolder.trim() ? 'text-foreground' : 'text-warning'}`} title={backupFolder}>
            {backupFolder.trim() || 'Pendente'}
          </span>
        </dd>
        <dd className="flex justify-between gap-3 text-muted-foreground">
          <span>Comando</span>
          <span className="text-foreground">{useCustomBackupCommand ? 'Personalizado' : 'Padrão'}</span>
        </dd>
      </dl>

      <button
        type="button"
        onClick={onRun}
        disabled={isRunningBackup || !backupFolder.trim() || !!commandProblem}
        className="w-full h-12 flex items-center justify-center space-x-2 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[10px] font-medium transition-colors disabled:opacity-50 text-sm cursor-pointer"
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

      {commandProblem && (
        <p className="text-2xs text-warning flex items-center justify-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Para iniciar o backup personalizado: {commandProblem}</span>
        </p>
      )}

      {backupResult && (
        <BackupResultBox result={backupResult}>
          {backupResult.sizeBytes !== undefined && (
            <div className="flex flex-wrap items-center gap-3 text-2xs font-mono opacity-90 mt-1.5">
              <span className="px-2 py-0.5 rounded bg-success/20">
                Tamanho: {formatBytes(backupResult.sizeBytes)}
              </span>
              <span className="px-2 py-0.5 rounded bg-success/20">
                Duração: {backupResult.durationMs} ms
              </span>
            </div>
          )}
          {backupResult.checksumSha256 && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-2xs font-mono opacity-80 truncate" title={backupResult.checksumSha256}>
                SHA-256: {backupResult.checksumSha256}
              </span>
              <button
                type="button"
                onClick={() => onCopyHash(backupResult.checksumSha256!, 'result-hash')}
                className="text-2xs px-1.5 py-0.2 rounded hover:bg-success/20 font-mono transition cursor-pointer"
                title="Copiar hash"
              >
                {copyFeedback === 'result-hash' ? '✓ Copiado' : 'Copiar hash'}
              </button>
            </div>
          )}
        </BackupResultBox>
      )}
    </div>
  );
};
