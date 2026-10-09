import React from 'react';
import { Terminal, Copy, Check } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import type { BackupFormState } from '../../../hooks/database/useBackupForm';

interface BackupDefaultCommandPanelProps {
  activeConnection: DatabaseConnectionConfig;
  form: BackupFormState;
}

/** Modo padrão: opções assistidas e preview do comando gerado automaticamente. */
export const BackupDefaultCommandPanel: React.FC<BackupDefaultCommandPanelProps> = ({ activeConnection, form }) => {
  const {
    backupOracleDirectory,
    setBackupOracleDirectory,
    backupCompress,
    setBackupCompress,
    commandCopied,
    copyCommandPreview,
    previewBackupCommandResolved,
    setUseCustomBackupCommand,
    setCustomBackupCommand
  } = form;

  return (
    <div className="space-y-3 pt-1">
      {activeConnection.type === 'oracle' && (
        <div className="space-y-1">
          <label className="block font-bold text-foreground text-xs">DIRECTORY Oracle</label>
          <input
            type="text"
            value={backupOracleDirectory}
            onChange={(e) => setBackupOracleDirectory(e.target.value)}
            placeholder="DATA_PUMP_DIR"
            className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-foreground focus:outline-hidden focus:border-primary font-mono text-xs"
          />
          <p className="text-2xs text-muted-foreground">
            Nome do objeto DIRECTORY registrado no Oracle (ex: <code>DATA_PUMP_DIR</code>). O schema exportado é o usuário da conexão (<code>{activeConnection.user}</code>).
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer text-muted-foreground select-none">
        <input
          type="checkbox"
          checked={backupCompress}
          onChange={(e) => setBackupCompress(e.target.checked)}
          className="text-primary focus:ring-0 rounded"
        />
        <span className="text-foreground text-xs font-medium">
          Compactar backup
          {activeConnection.type === 'postgres' && ' (formato binário customizado, -Fc)'}
          {activeConnection.type === 'mysql' && ' (compressão via gzip streaming)'}
          {activeConnection.type === 'oracle' && ' (compression=ALL, requer Oracle Enterprise Edition)'}
        </span>
      </label>

      {/* Preview do comando padrão */}
      <div className="mt-2.5 p-3 bg-muted/40 border border-border/70 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-primary" /> Linha de Comando Gerada (Automática)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUseCustomBackupCommand(true);
                setCustomBackupCommand(previewBackupCommandResolved);
              }}
              className="px-2 py-0.5 text-2xs text-primary hover:underline font-semibold cursor-pointer"
            >
              Editar como personalizado
            </button>
            <button
              type="button"
              onClick={copyCommandPreview}
              className="flex items-center gap-1 px-2 py-0.5 text-muted-foreground hover:text-foreground text-2xs font-medium rounded-md hover:bg-muted transition cursor-pointer"
              title="Copiar comando"
            >
              {commandCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{commandCopied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>
        <pre className="font-mono text-2xs p-2.5 bg-background/90 rounded-lg border border-border/60 text-foreground overflow-x-auto whitespace-pre-wrap break-all select-all leading-relaxed">
          {previewBackupCommandResolved}
        </pre>
      </div>
    </div>
  );
};
