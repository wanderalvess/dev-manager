import React from 'react';
import { Terminal, Zap } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import type { BackupFormState } from '../../../hooks/database/useBackupForm';
import { BackupDefaultCommandPanel } from './BackupDefaultCommandPanel';
import { BackupCustomCommandPanel } from './BackupCustomCommandPanel';

interface BackupCommandModeSectionProps {
  activeConnection: DatabaseConnectionConfig;
  form: BackupFormState;
}

export const BackupCommandModeSection: React.FC<BackupCommandModeSectionProps> = ({ activeConnection, form }) => {
  const { useCustomBackupCommand, setUseCustomBackupCommand } = form;

  return (
    <div className="p-4 bg-background/70 border border-border/70 rounded-xl space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-border/50 pb-3">
        <div>
          <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-sky-500" />
            <span>Modo de Execução do Comando</span>
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Escolha o modo padrão assistido ou customize comandos e parâmetros para compatibilidade com versões específicas do banco.
          </p>
        </div>

        <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/50 self-start sm:self-auto shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setUseCustomBackupCommand(false)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              !useCustomBackupCommand
                ? 'bg-background text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Padrão</span>
          </button>
          <button
            type="button"
            onClick={() => setUseCustomBackupCommand(true)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
              useCustomBackupCommand
                ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal className="w-3 h-3" />
            <span>Personalizado</span>
          </button>
        </div>
      </div>

      {!useCustomBackupCommand ? (
        <BackupDefaultCommandPanel activeConnection={activeConnection} form={form} />
      ) : (
        <BackupCustomCommandPanel activeConnection={activeConnection} form={form} />
      )}
    </div>
  );
};
