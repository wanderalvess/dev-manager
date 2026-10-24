import React from 'react';
import { DownloadCloud, ShieldCheck, Loader2, RefreshCw } from 'lucide-react';
import { DEFAULT_CCW_APP_PATH } from '../../utils/ccwModalUtils';
import { DEFAULT_CCW_WINTHOR_CYCLES } from '../../../../shared/ccwRoutineCommon';

interface CcwDownloadTabProps {
  appPath: string;
  routineInput: string;
  onRoutineInputChange: (v: string) => void;
  normalized: { baseName?: string; code?: string | number | null };
  winthorVersion: string;
  onWinthorVersionChange: (v: string) => void;
  cycles?: string[];
  isLoadingCycles?: boolean;
  onReloadCycles?: () => void;
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
  cycles,
  isLoadingCycles,
  onReloadCycles,
  targetModule,
  onTargetModuleChange,
  customDownloadUrl,
  onCustomDownloadUrlChange,
  estimatedDownloadUrl,
  backupExisting,
  onBackupExistingChange,
  isSubmitting,
  onSubmit
}) => {
  const effectiveCycles = cycles && cycles.length > 0
    ? cycles
    : DEFAULT_CCW_WINTHOR_CYCLES.map((c) => c.value);

  return (
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
            className="w-full bg-card border border-input rounded-[10px] px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring font-mono"
          />
          {normalized.baseName && (
            <p className="text-2xs text-muted-foreground font-mono">
              Identificado como: <span className="text-primary font-bold">{normalized.baseName}.EXE</span>
              {normalized.code && ` (Rotina ${normalized.code})`}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground">
              Versão WinThor
            </label>
            {onReloadCycles && (
              <button
                type="button"
                onClick={onReloadCycles}
                disabled={isLoadingCycles}
                title="Recarregar ciclos da API CCW"
                className="text-muted-foreground hover:text-foreground text-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingCycles ? 'animate-spin text-primary' : ''}`} />
                <span>Atualizar</span>
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              list="ccw-cycles-options"
              placeholder="Ex: 37.00 ou 38.00"
              value={winthorVersion}
              onChange={(e) => onWinthorVersionChange(e.target.value)}
              className="w-full bg-card border border-input rounded-[10px] px-3 py-2.5 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring font-mono"
            />
            <datalist id="ccw-cycles-options">
              {effectiveCycles.map((c) => (
                <option key={c} value={c}>
                  {c === '37.00' ? `${c} (Padrão WinThor)` : c === '38.00' ? `${c} (Mais recente)` : c}
                </option>
              ))}
            </datalist>
          </div>
          <p className="text-2xs text-muted-foreground font-mono truncate">
            Ciclo: <span className="text-primary font-semibold">{winthorVersion || '37.00'}</span> (37.00, 38.00...)
          </p>
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
            className="w-full bg-card border border-input rounded-[10px] px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring font-mono"
          />
          <p className="text-2xs text-muted-foreground">
            Se vazio, o Hub Manager detecta automaticamente se a rotina já existe em alguma subpasta ou calcula pelo código.
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
            className="w-full bg-card border border-input rounded-[10px] px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring font-mono"
          />
          <p className="text-2xs text-muted-foreground truncate" title={estimatedDownloadUrl}>
            URL padrão: {estimatedDownloadUrl || 'https://centraldecontrole.pcinformatica.com.br/api/rotinas/rotinaVersaoComDependencia/...'}
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
          <ShieldCheck className="w-4 h-4 text-success" />
          <span>Criar backup automático (.bak) do executável anterior antes de substituir</span>
        </label>
      </div>

      <div className="pt-3 border-t border-border/80 flex items-center justify-between gap-3">
        <span className="text-2xs text-muted-foreground font-mono">
          Destino: {appPath || DEFAULT_CCW_APP_PATH}
        </span>
        <button
          type="submit"
          disabled={isSubmitting || !routineInput.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
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
};
