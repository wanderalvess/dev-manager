import React from 'react';
import { AlertTriangle, CheckCircle2, RotateCw, XCircle } from 'lucide-react';
import type { InfrReviewFix, InfrReviewStatus } from '../../../../../shared/infrNewVersionReview';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';
import { InfrManifestChoice } from './InfrManifestChoice';
import { InfrNewVersionPreview } from './InfrNewVersionPreview';
import { InfrPreviewLog } from './InfrPreviewLog';

const STATUS: Record<InfrReviewStatus, { icon: React.ReactNode; box: string; label: string }> = {
  ok: { icon: <CheckCircle2 className="w-5 h-5 text-success" />, box: 'border-border/80', label: 'Ok' },
  warn: { icon: <AlertTriangle className="w-5 h-5 text-warning" />, box: 'border-warning/40 bg-warning/5', label: 'Atenção' },
  block: { icon: <XCircle className="w-5 h-5 text-danger" />, box: 'border-danger/40 bg-danger/5', label: 'Impede de gerar' }
};

/** Passo 4: o que o Hub conferiu na origem, no catálogo da 801 e no WSH, antes de gerar. */
export const InfrNewVersionReview: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const fixLabel: Record<InfrReviewFix, string> = {
    useSourceOracle: `Usar o ${s.form.dbSource} direto`,
    emptyOracle: 'Criar um Oracle vazio e importar o dump depois'
  };

  if (s.busy === 'preview') {
    return (
      <div className="flex items-center gap-3 p-6 rounded-xl border border-border/80 text-sm text-foreground">
        <RotateCw className="w-5 h-5 animate-spin text-warning" />
        Lendo o wta-{s.form.from} e o catálogo da rotina 801...
      </div>
    );
  }
  if (!s.preview) {
    return (
      <button type="button" onClick={s.runPreview} disabled={!s.canPreview} className="px-4 py-2.5 rounded-lg border border-warning text-warning text-xs font-bold cursor-pointer disabled:opacity-50">
        Ler a origem e o catálogo
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {s.review.map((item) => (
          <li key={item.id} className={`flex gap-3 p-3.5 rounded-xl border ${STATUS[item.status].box}`}>
            <span className="shrink-0" role="img" aria-label={STATUS[item.status].label}>
              {STATUS[item.status].icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed break-words">{item.detail}</p>
              {item.fixes && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {item.fixes.map((fix) => (
                    <button
                      key={fix}
                      type="button"
                      onClick={() => s.applyFix(fix)}
                      className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
                    >
                      {fixLabel[fix]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      {s.preview.success && <InfrManifestChoice s={s} />}

      {s.preview.success && (
        <details className="rounded-xl border border-border/80 px-4 py-3">
          <summary className="text-xs font-semibold text-foreground cursor-pointer">Detalhes do catálogo da 801</summary>
          <div className="mt-3">
            <InfrNewVersionPreview preview={s.preview} version={s.form.version} />
          </div>
        </details>
      )}

      {!!s.preview.log?.length && <InfrPreviewLog lines={s.preview.log} open={!s.preview.success} />}

      <details className="rounded-xl border border-border/80 px-4 py-3">
        <summary className="text-xs font-semibold text-foreground cursor-pointer">Comando que vai rodar no terminal</summary>
        <pre className="mt-3 p-3 bg-[#090D14] rounded-lg text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
          {s.command || 'Faltam dados nos passos anteriores.'}
        </pre>
      </details>

      <button type="button" onClick={s.runPreview} disabled={!s.canPreview} className="text-2xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer disabled:opacity-50">
        <RotateCw className="w-3 h-3" /> Ler a origem de novo
      </button>

      {s.message && <p className="text-xs text-foreground/80 p-3 rounded-xl bg-muted/40 break-all">{s.message}</p>}
    </div>
  );
};
