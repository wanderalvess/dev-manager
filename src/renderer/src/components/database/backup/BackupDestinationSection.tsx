import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import type { BackupFormState } from '../../../hooks/database/useBackupForm';

interface BackupDestinationSectionProps {
  activeConnection: DatabaseConnectionConfig;
  form: BackupFormState;
  onSelectFolder: () => void;
}

export const BackupDestinationSection: React.FC<BackupDestinationSectionProps> = ({
  activeConnection,
  form,
  onSelectFolder
}) => {
  const { backupFolder, setBackupFolder, useCustomBackupCommand } = form;

  return (
    <div className="p-4 bg-background/70 border border-border/70 rounded-xl space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
          <FolderOpen className="w-4 h-4 text-primary" />
          <span>
            {activeConnection.type === 'oracle' && !useCustomBackupCommand
              ? 'Pasta do DIRECTORY (no servidor Oracle)'
              : 'Pasta de Destino do Backup'}
          </span>
        </label>
        <span className="text-[10px] text-muted-foreground font-mono">
          {backupFolder ? 'Destino selecionado' : 'Pasta pendente'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={backupFolder}
          onChange={(e) => setBackupFolder(e.target.value)}
          placeholder="Ex: C:\Backups\WinThor"
          className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary font-mono text-xs shadow-2xs"
        />
        <button
          type="button"
          onClick={onSelectFolder}
          className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg border border-border/80 transition flex items-center gap-1.5 shrink-0 font-semibold text-xs shadow-2xs cursor-pointer"
          title="Procurar pasta no disco"
        >
          <FolderOpen className="w-3.5 h-3.5 text-primary" />
          <span>Procurar...</span>
        </button>
      </div>

      {activeConnection.type === 'oracle' ? (
        <p className="text-[11px] text-muted-foreground leading-normal">
          {useCustomBackupCommand
            ? 'Esta pasta resolverá as variáveis {filePath} e {folder}. Utilizando exp clássico, os arquivos são salvos diretamente neste caminho da sua máquina.'
            : 'O utilitário expdp salva os arquivos no servidor Oracle. O caminho da pasta aqui deve coincidir com o local físico do DIRECTORY abaixo.'}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground leading-normal">
          O arquivo de backup gerado pelo utilitário ({activeConnection.type === 'mysql' ? 'mysqldump' : 'pg_dump'}) será gravado nesta pasta local.
        </p>
      )}
    </div>
  );
};
