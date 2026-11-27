import React from 'react';
import { AlertTriangle, CheckCircle2, Download, History, RotateCw, Search, XCircle } from 'lucide-react';
import { isValidWshVersion } from '../../../../../shared/wshUpdate';
import { useWshUpdate } from '../../../hooks/containers/useWshUpdate';
import { canApplyUpdate, formatMegabytes, missingFeatures, verdictView } from '../../../utils/wshUpdateView';

interface WshUpdateTabProps {
  container: string;
  active: boolean;
}

const TONE: Record<string, string> = {
  success: 'bg-success/10 text-success border-success/25',
  info: 'bg-info/10 text-info border-info/25',
  warning: 'bg-warning/10 text-warning border-warning/30',
  muted: 'bg-muted text-muted-foreground border-border'
};

const BTN = 'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98';

export const WshUpdateTab: React.FC<WshUpdateTabProps> = ({ container, active }) => {
  const u = useWshUpdate(container, active);
  const working = u.busy !== 'idle';

  if (!u.available) {
    return <p className="text-xs text-muted-foreground">A atualização do WSH só está disponível no aplicativo desktop.</p>;
  }

  const verdict = verdictView(u.prepared?.verdict);
  const missing = missingFeatures(u.prepared?.checks);

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs leading-relaxed text-muted-foreground">
        <strong className="text-foreground font-semibold block mb-0.5">Atualizar o jar do {container}</strong>
        O Hub baixa o instalador oficial da TOTVS, tira o <code className="text-foreground font-mono">winthor-integracao-core.jar</code> de dentro dele,
        confere o que ele exige do WTA e só então troca o arquivo montado no container, guardando o anterior ao lado. Nada é executado no Windows.
      </div>

      <div className="p-3 bg-card border border-border/80 rounded-xl space-y-1.5 text-xs">
        {!u.info && <span className="text-muted-foreground">Lendo o container…</span>}
        {u.info && !u.info.success && <span className="text-danger">{u.info.error}</span>}
        {u.info?.success && (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Versão em uso</span>
              <span className="font-mono font-bold text-foreground">{u.info.version ?? 'desconhecida'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Jar montado</span>
              <code className="font-mono text-2xs text-foreground truncate" title={u.info.jarPath}>{u.info.jarPath}</code>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Container</span>
              <span className={u.info.running ? 'text-success font-semibold' : 'text-warning font-semibold'}>{u.info.running ? 'Em execução' : 'Parado'}</span>
            </div>
          </>
        )}
      </div>

      <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
        <label className="text-2xs font-semibold text-muted-foreground block">Versão nova do WSH</label>
        <div className="flex gap-2">
          <input
            value={u.version}
            onChange={(e) => u.setVersion(e.target.value)}
            placeholder="1.39.22.31"
            spellCheck={false}
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground outline-none focus:border-primary"
          />
          <button onClick={u.check} disabled={working || !isValidWshVersion(u.version)} className={`${BTN} bg-card border border-border/80 hover:bg-muted text-foreground`}>
            {u.busy === 'probing' ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Consultar
          </button>
        </div>

        {u.probe && (
          <p className={`text-xs flex items-center gap-1.5 ${u.probe.success ? 'text-success' : 'text-danger'}`}>
            {u.probe.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {u.probe.success ? `Publicada pela TOTVS · instalador de ${formatMegabytes(u.probe.sizeBytes)}` : u.probe.error}
          </p>
        )}

        <button onClick={u.prepare} disabled={working || !u.probe?.success} className={`${BTN} w-full bg-primary hover:bg-primary text-white`}>
          {u.busy === 'preparing' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {u.busy === 'preparing' ? 'Preparando…' : 'Baixar e conferir'}
        </button>

        {working && u.progress && (
          <div className="space-y-1">
            <div className="text-2xs text-muted-foreground">{u.progress.message}</div>
            {u.progress.percent !== undefined && (
              <div className="h-1.5 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${u.progress.percent}%` }} />
              </div>
            )}
          </div>
        )}
        {u.prepared && !u.prepared.success && <p className="text-xs text-danger">{u.prepared.error}</p>}
      </div>

      {u.prepared?.success && (
        <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground">Jar {u.prepared.version} pronto ({formatMegabytes(u.prepared.sizeBytes)})</span>
            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border ${TONE[verdict.tone]}`}>{verdict.label}</span>
          </div>

          <div className="space-y-1.5">
            <div className="text-2xs font-semibold text-muted-foreground">O que o WSH exige do WTA</div>
            {(u.prepared.requires ?? []).length === 0 && <p className="text-2xs text-muted-foreground">Este jar não declara dependências.</p>}
            {(u.prepared.checks ?? u.prepared.requires?.map((r) => ({ ...r, ok: true, unchecked: true })) ?? []).map((c) => {
              const unchecked = 'unchecked' in c;
              return (
                <div key={c.service} className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="truncate">{c.service} ≥ {c.version}</span>
                  {unchecked ? <span className="text-muted-foreground">não conferido</span> : c.ok ? <span className="text-success">WTA tem {('found' in c && c.found) || ''}</span> : <span className="text-danger">{('found' in c && c.found) ? `WTA tem ${c.found}` : 'não instalada no WTA'}</span>}
                </div>
              );
            })}
            {u.prepared.checksError && <p className="text-2xs text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{u.prepared.checksError}</p>}
            {missing.length > 0 && <p className="text-2xs text-danger">Sem essas features o WSH encerra ao subir. Atualize o WTA antes.</p>}
          </div>

          <button onClick={u.apply} disabled={!canApplyUpdate(u.prepared, u.version, working)} className={`${BTN} w-full text-white ${missing.length ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'}`}>
            {u.busy === 'applying' ? <RotateCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {u.busy === 'applying' ? 'Atualizando…' : 'Atualizar container'}
          </button>
        </div>
      )}

      {u.result && (
        <div className={`p-3 rounded-xl border text-xs space-y-1 ${u.result.success && u.result.started ? TONE.success : TONE.warning}`}>
          <strong className="block">
            {u.result.success ? (u.result.started ? 'WSH no ar com o jar novo.' : 'Jar trocado, mas o WSH não confirmou a subida em 3 minutos.') : u.result.error}
          </strong>
          {u.result.success && u.result.backup && <span className="block">Backup do jar anterior: <code className="font-mono">{u.result.backup}</code></span>}
          {u.result.logTail && !u.result.started && <pre className="mt-1 max-h-32 overflow-auto text-2xs font-mono whitespace-pre-wrap">{u.result.logTail}</pre>}
        </div>
      )}

      {!!u.info?.backups?.length && (
        <div className="p-3 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Jar anterior guardado</span>
            <code className="font-mono text-2xs text-muted-foreground">{u.info.backups[0]}</code>
          </div>
          <button onClick={u.rollback} disabled={working} className={`${BTN} bg-card border border-border/80 hover:bg-muted text-foreground`}>
            {u.busy === 'rollingBack' ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
            Voltar a este jar
          </button>
        </div>
      )}
    </div>
  );
};
