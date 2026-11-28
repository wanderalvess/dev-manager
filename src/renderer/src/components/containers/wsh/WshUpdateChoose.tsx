import React from 'react';
import { CheckCircle2, Download, FileUp, RotateCw, Search, X, XCircle } from 'lucide-react';
import { isValidWshVersion, type WshInstallerListResult, type WshUpdateProbeResult, type WshUpdateProgress } from '../../../../../shared/wshUpdate';
import type { WshUpdateBusy } from '../../../hooks/containers/useWshUpdate';
import { fileNameOf, formatMegabytes, installerRows } from '../../../utils/wshUpdateView';

interface WshUpdateChooseProps {
  installers: WshInstallerListResult | null;
  currentVersion: string | undefined;
  version: string;
  localFile: string;
  probe: WshUpdateProbeResult | null;
  busy: WshUpdateBusy;
  progress: WshUpdateProgress | null;
  onVersion: (value: string) => void;
  onReloadInstallers: () => void;
  onPickFile: () => void;
  onClearFile: () => void;
  onCheck: () => void;
  onPrepare: () => void;
}

export const BTN = 'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98';
const SECONDARY = `${BTN} bg-card border border-border/80 hover:bg-muted text-foreground`;

/** Passo 1: escolher a versão (lista da TOTVS, digitada ou um arquivo do computador) e baixar/conferir. */
export const WshUpdateChoose: React.FC<WshUpdateChooseProps> = ({
  installers, currentVersion, version, localFile, probe, busy, progress, onVersion, onReloadInstallers, onPickFile, onClearFile, onCheck, onPrepare
}) => {
  const rows = installerRows(installers?.installers, currentVersion);
  const working = busy !== 'idle';
  const ready = !!localFile || isValidWshVersion(version);

  return (
    <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
      <div className="text-xs font-bold text-foreground">1 · Escolha a versão do WSH</div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-2xs font-semibold text-muted-foreground">
          <span>Publicadas pela TOTVS</span>
          <button onClick={onReloadInstallers} disabled={working} className="flex items-center gap-1 hover:text-foreground cursor-pointer">
            <RotateCw className={`w-3 h-3 ${installers === null ? 'animate-spin text-primary' : ''}`} />
            Recarregar
          </button>
        </div>
        {installers === null && <p className="text-2xs text-muted-foreground">Carregando a lista…</p>}
        {installers && !installers.success && <p className="text-2xs text-warning">{installers.error} Digite a versão abaixo ou use um arquivo do computador.</p>}
        {rows.length > 0 && (
          <div className="max-h-44 overflow-auto rounded-lg border border-border/80 divide-y divide-border/60" role="listbox" aria-label="Versões publicadas do WSH">
            {rows.map((r) => (
              <button
                key={r.version}
                type="button"
                role="option"
                aria-selected={version === r.version}
                onClick={() => onVersion(r.version)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs text-left cursor-pointer transition ${version === r.version ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/50 text-muted-foreground'}`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{r.version}</span>
                  {r.tag && <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border ${r.tag === 'em uso' ? 'bg-info/10 text-info border-info/25' : 'bg-success/10 text-success border-success/25'}`}>{r.tag}</span>}
                </span>
                <span className="text-2xs">{r.meta}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={version}
          onChange={(e) => onVersion(e.target.value)}
          placeholder="ou digite a versão, ex.: 1.39.22.31"
          spellCheck={false}
          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-primary"
        />
        <button onClick={onCheck} disabled={working || !isValidWshVersion(version)} className={SECONDARY} title="Confere se a TOTVS publicou essa versão, sem baixar">
          {busy === 'probing' ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Consultar
        </button>
      </div>

      {probe && (
        <p className={`text-xs flex items-center gap-1.5 ${probe.success ? 'text-success' : 'text-danger'}`}>
          {probe.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {probe.success ? `Publicada pela TOTVS · instalador de ${formatMegabytes(probe.sizeBytes)}` : probe.error}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onPickFile} disabled={working} className={SECONDARY} title="Sem acesso ao servidor da TOTVS? Use o instalador (.exe) ou o jar que você já tem">
          <FileUp className="w-3.5 h-3.5" />
          Usar arquivo do computador…
        </button>
        {localFile && (
          <span className="flex items-center gap-1.5 text-xs font-mono text-foreground bg-muted/50 border border-border/80 rounded-lg px-2 py-1.5 max-w-full">
            <span className="truncate" title={localFile}>{fileNameOf(localFile)}</span>
            <button onClick={onClearFile} disabled={working} aria-label="Remover o arquivo escolhido" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3 h-3" /></button>
          </span>
        )}
      </div>

      <button onClick={onPrepare} disabled={working || !ready} className={`${BTN} w-full bg-primary hover:bg-primary text-white`}>
        {busy === 'preparing' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {busy === 'preparing' ? 'Preparando…' : localFile ? 'Conferir arquivo' : 'Baixar e conferir'}
      </button>
      {!ready && <p className="text-2xs text-muted-foreground">Escolha uma versão da lista, digite uma ou use um arquivo do computador.</p>}

      {busy === 'preparing' && progress && (
        <div className="space-y-1">
          <div className="text-2xs text-muted-foreground">{progress.message}</div>
          {progress.percent !== undefined && (
            <div className="h-1.5 rounded bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} /></div>
          )}
        </div>
      )}
    </div>
  );
};
