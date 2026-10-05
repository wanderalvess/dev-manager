import React from 'react';
import { FileUp, FolderOpen, ShieldCheck, Loader2 } from 'lucide-react';
import { DEFAULT_CCW_APP_PATH } from '../../utils/ccwModalUtils';

interface CcwLocalFileTabProps {
  appPath: string;
  localFilePath: string;
  onSelectFile: () => void;
  localRoutineName: string;
  onLocalRoutineNameChange: (v: string) => void;
  localTargetModule: string;
  onLocalTargetModuleChange: (v: string) => void;
  localBackup: boolean;
  onLocalBackupChange: (v: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CcwLocalFileTab: React.FC<CcwLocalFileTabProps> = ({
  appPath,
  localFilePath,
  onSelectFile,
  localRoutineName,
  onLocalRoutineNameChange,
  localTargetModule,
  onLocalTargetModuleChange,
  localBackup,
  onLocalBackupChange,
  isSubmitting,
  onSubmit
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
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
          onClick={onSelectFile}
          className="px-3 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-bold text-foreground transition-all flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
        >
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <span>Procurar...</span>
        </button>
      </div>
      <p className="text-2xs text-muted-foreground">
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
          onChange={(e) => onLocalRoutineNameChange(e.target.value)}
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
          onChange={(e) => onLocalTargetModuleChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
        />
      </div>
    </div>

    <div className="flex items-center gap-2 pt-1">
      <input
        type="checkbox"
        id="localBackupCheck"
        checked={localBackup}
        onChange={(e) => onLocalBackupChange(e.target.checked)}
        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
      />
      <label htmlFor="localBackupCheck" className="text-xs text-foreground flex items-center gap-1.5 cursor-pointer">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Criar backup automático (.bak) da versão existente antes de substituir</span>
      </label>
    </div>

    <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted-foreground font-mono">
        Destino: {appPath || DEFAULT_CCW_APP_PATH}
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
);
