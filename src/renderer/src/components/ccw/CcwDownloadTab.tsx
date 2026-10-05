import React from 'react';
import { DownloadCloud, ShieldCheck, Loader2 } from 'lucide-react';
import { DEFAULT_CCW_APP_PATH } from '../../utils/ccwModalUtils';

interface CcwDownloadTabProps {
  appPath: string;
  routineInput: string;
  onRoutineInputChange: (v: string) => void;
  normalized: { baseName?: string; code?: string | number | null };
  winthorVersion: string;
  onWinthorVersionChange: (v: string) => void;
  targetModule: string;
  onTargetModuleChange: (v: string) => void;
  customDownloadUrl: string;
  onCustomDownloadUrlChange: (v: string) => void;
  estimatedDownloadUrl: string;
  backupExisting: boolean;
  onBackupExistingChange: (v: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const CcwDownloadTab: React.FC<CcwDownloadTabProps> = ({
  appPath,
  routineInput,
  onRoutineInputChange,
  normalized,
  winthorVersion,
  onWinthorVersionChange,
  targetModule,
  onTargetModuleChange,
  customDownloadUrl,
  onCustomDownloadUrlChange,
  estimatedDownloadUrl,
  backupExisting,
  onBackupExistingChange,
  isSubmitting,
  onSubmit
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="sm:col-span-2 space-y-1.5">
        <label className="text-xs font-bold text-foreground">
          Código ou Nome da Rotina <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          required
          placeholder="Ex: 132, PCSIS132, PC1406, PCINFTAB"
          value={routineInput}
          onChange={(e) => onRoutineInputChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
        />
        {normalized.baseName && (
          <p className="text-2xs text-muted-foreground font-mono">
            Identificado como: <span className="text-primary font-bold">{normalized.baseName}.EXE</span>
            {normalized.code && ` (Rotina ${normalized.code})`}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">
          Versão WinThor
        </label>
        <select
          value={winthorVersion}
          onChange={(e) => onWinthorVersionChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs cursor-pointer"
        >
          <option value="30">30 (Padrão)</option>
          <option value="31">31</option>
          <option value="29">29</option>
          <option value="28">28</option>
        </select>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">
          Pasta de Módulo (Opcional)
        </label>
        <input
          type="text"
          placeholder="Auto-detectar (ex: MOD-001, Raiz)"
          value={targetModule}
          onChange={(e) => onTargetModuleChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
        />
        <p className="text-2xs text-muted-foreground">
          Se vazio, o Dev Manager detecta automaticamente se a rotina já existe em alguma subpasta ou calcula pelo código.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-foreground">
          URL Customizada (Opcional)
        </label>
        <input
          type="url"
          placeholder="Deixe em branco para usar URL oficial da CCW"
          value={customDownloadUrl}
          onChange={(e) => onCustomDownloadUrlChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono shadow-2xs"
        />
        <p className="text-2xs text-muted-foreground truncate" title={estimatedDownloadUrl}>
          URL padrão: {estimatedDownloadUrl || 'https://centraldecontrole.pcinformatica.com.br/api/rotinas/downloadRotina/...'}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2 pt-1">
      <input
        type="checkbox"
        id="backupExistingCheck"
        checked={backupExisting}
        onChange={(e) => onBackupExistingChange(e.target.checked)}
        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
      />
      <label htmlFor="backupExistingCheck" className="text-xs text-foreground flex items-center gap-1.5 cursor-pointer">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Criar backup automático (.bak) do executável anterior antes de substituir</span>
      </label>
    </div>

    <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted-foreground font-mono">
        Destino: {appPath || DEFAULT_CCW_APP_PATH}
      </span>
      <button
        type="submit"
        disabled={isSubmitting || !routineInput.trim()}
        className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Baixando &amp; Atualizando...</span>
          </>
        ) : (
          <>
            <DownloadCloud className="w-4 h-4" />
            <span>Baixar e Atualizar</span>
          </>
        )}
      </button>
    </div>
  </form>
);
