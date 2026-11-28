import React from 'react';
import { AlertTriangle, CheckCircle2, History, RotateCw, Trash2 } from 'lucide-react';
import { useWshUpdate } from '../../../hooks/containers/useWshUpdate';
import { canApplyUpdate, formatMegabytes, missingFeatures, verdictView } from '../../../utils/wshUpdateView';
import { BTN, WshUpdateChoose } from './WshUpdateChoose';

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
        Três passos: <strong className="text-foreground">1</strong> escolha a versão, <strong className="text-foreground">2</strong> baixe e confira (o Hub tira o{' '}
        <code className="text-foreground font-mono">winthor-integracao-core.jar</code> do instalador oficial e confere o que ele exige do WTA),{' '}
        <strong className="text-foreground">3</strong> atualize: o jar atual fica guardado ao lado e o container reinicia. Nada é executado no Windows.
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

      <WshUpdateChoose
        installers={u.installers}
        currentVersion={u.info?.version}
        version={u.version}
        localFile={u.localFile}
        probe={u.probe}
        busy={u.busy}
        progress={u.progress}
        onVersion={u.setVersion}
        onReloadInstallers={u.loadInstallers}
        onPickFile={u.pickFile}
        onClearFile={u.clearFile}
        onCheck={u.check}
        onPrepare={u.prepare}
      />
      {u.prepared && !u.prepared.success && <p className="text-xs text-danger">{u.prepared.error}</p>}

      {u.prepared?.success && (
        <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
          <div className="text-xs font-bold text-foreground">2 · Conferência</div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground">
              Jar {u.prepared.version} pronto ({formatMegabytes(u.prepared.sizeBytes)}){u.prepared.source === 'local' ? ' · do arquivo escolhido' : ''}
            </span>
            <span className={`text-2xs font-semibold px-1.5 py-0.5 rounded border ${TONE[verdict.tone]}`}>{verdict.label}</span>
          </div>

          <div className="space-y-1.5">
            <div className="text-2xs font-semibold text-muted-foreground">O que o WSH exige do WTA</div>
            {(u.prepared.requires ?? []).length === 0 && <p className="text-2xs text-muted-foreground">Este jar não declara dependências.</p>}
            {(u.prepared.requires ?? []).map((r) => {
              const check = u.prepared?.checks?.find((c) => c.service === r.service);
              return (
                <div key={r.service} className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="truncate">{r.service} ≥ {r.version}</span>
                  {!check ? <span className="text-muted-foreground">não conferido</span> : check.ok ? <span className="text-success">WTA tem {check.found}</span> : <span className="text-danger">{check.found ? `WTA tem ${check.found}` : 'não instalada no WTA'}</span>}
                </div>
              );
            })}
            {u.prepared.checksError && <p className="text-2xs text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{u.prepared.checksError}</p>}
            {missing.length > 0 && <p className="text-2xs text-danger">Sem essas features o WSH encerra ao subir. Atualize o WTA antes.</p>}
          </div>

          <div className="text-xs font-bold text-foreground pt-1">3 · Atualizar</div>
          <button onClick={u.apply} disabled={!canApplyUpdate(u.prepared, working)} className={`${BTN} w-full text-white ${missing.length ? 'bg-danger hover:bg-danger/90' : 'bg-success hover:bg-success/90'}`}>
            {u.busy === 'applying' ? <RotateCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {u.busy === 'applying' ? (u.progress?.message ?? 'Atualizando…') : 'Atualizar container'}
          </button>
        </div>
      )}

      {u.result && (
        <div className={`p-3 rounded-xl border text-xs space-y-1 ${u.result.success && u.result.started ? TONE.success : TONE.warning}`}>
          <strong className="block">
            {u.result.success ? (u.result.started ? 'WSH no ar com o jar novo.' : 'Jar trocado, mas o WSH não confirmou a subida em 3 minutos.') : u.result.error}
          </strong>
          {u.result.success && u.result.backup && <span className="block">Jar anterior guardado: <code className="font-mono">{u.result.backup}</code></span>}
          {u.result.logTail && !u.result.started && <pre className="mt-1 max-h-32 overflow-auto text-2xs font-mono whitespace-pre-wrap">{u.result.logTail}</pre>}
        </div>
      )}

      {!!u.info?.backups?.length && (
        <div className="p-3 bg-card border border-border/80 rounded-xl flex items-center justify-between gap-3">
          <div className="text-xs min-w-0">
            <span className="font-semibold text-foreground flex items-center gap-1.5"><History className="w-3.5 h-3.5" />Jar anterior guardado</span>
            <code className="font-mono text-2xs text-muted-foreground block truncate">{u.info.backups[0]}</code>
          </div>
          <button onClick={u.rollback} disabled={working} className={`${BTN} bg-card border border-border/80 hover:bg-muted text-foreground shrink-0`}>
            {u.busy === 'rollingBack' ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
            Voltar a este jar
          </button>
        </div>
      )}

      <button onClick={u.clearCache} disabled={working} className="text-2xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer disabled:opacity-50">
        <Trash2 className="w-3 h-3" />
        Apagar os instaladores baixados (liberam espaço; o jar em uso e os backups ficam)
      </button>
    </div>
  );
};
