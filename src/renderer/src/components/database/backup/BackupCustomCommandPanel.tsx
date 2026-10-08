import React from 'react';
import { Terminal, Check, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import type { BackupFormState } from '../../../hooks/database/useBackupForm';
import { hasBackupFileTag } from '../../../utils/backupModalUtils';
import { BackupCommandPresets, BackupVariableChips } from './BackupCustomCommandHelpers';

interface BackupCustomCommandPanelProps {
  activeConnection: DatabaseConnectionConfig;
  form: BackupFormState;
}

/** Modo personalizado: presets, variáveis e console de edição do comando. */
export const BackupCustomCommandPanel: React.FC<BackupCustomCommandPanelProps> = ({ activeConnection, form }) => {
  const {
    customBackupCommand,
    setCustomBackupCommand,
    showPasswordInCommandPreview,
    setShowPasswordInCommandPreview,
    commandCopied,
    copyCommandPreview,
    previewBackupCommandResolved
  } = form;

  return (
    <div className="space-y-4 pt-1">
      <BackupCommandPresets type={activeConnection.type} onSelect={setCustomBackupCommand} />
      <BackupVariableChips onInsert={setCustomBackupCommand} />

      {/* Console do Utilitário CLI */}
      <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
        <div className="px-3.5 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-slate-400 font-mono text-[11px] font-semibold flex items-center gap-1 ml-1">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>Console do Comando de Backup</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasBackupFileTag(customBackupCommand) ? (
              <span className="px-2 py-0.5 rounded-full text-2xs font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Sintaxe Válida</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-2xs font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>Requer {'{filePath}'}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowPasswordInCommandPreview((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-0.5 text-2xs font-mono text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition cursor-pointer"
              title={showPasswordInCommandPreview ? 'Ocultar senha' : 'Exibir senha real'}
            >
              {showPasswordInCommandPreview ? (
                <>
                  <EyeOff className="w-3 h-3 text-amber-400" />
                  <span>Ocultar Senha</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>Ver Senha</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={copyCommandPreview}
              className="flex items-center gap-1 px-2 py-0.5 text-2xs font-mono text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition cursor-pointer"
              title="Copiar comando resolvido"
            >
              {commandCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{commandCopied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Editor de Entrada */}
        <div className="relative">
          <textarea
            rows={3}
            value={customBackupCommand}
            onChange={(e) => setCustomBackupCommand(e.target.value)}
            placeholder='Ex: exp {user}/{password}@{connectString} file="{filePath}" log="{logPath}" owner={user}'
            className="w-full bg-slate-950 text-slate-100 p-3.5 font-mono text-xs leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-sky-500/50 resize-y min-h-[85px] border-b border-slate-800/80"
          />
        </div>

        {/* Live Preview Console Output */}
        <div className="p-3 bg-slate-900/60 font-mono text-[11px] leading-relaxed">
          <div className="flex items-center justify-between text-2xs text-slate-500 uppercase tracking-wider mb-1 select-none">
            <span>Visualização com Parâmetros Reais (Passados Diretamente ao Executável)</span>
            <span className="text-2xs text-slate-500 font-mono">execFile sem shell</span>
          </div>
          <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-slate-200 overflow-x-auto whitespace-pre-wrap break-all select-all flex items-start gap-2">
            <span className="text-sky-400 select-none font-bold shrink-0">&gt;_</span>
            <span>{previewBackupCommandResolved || '(digite um comando acima para ver a prévia)'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
