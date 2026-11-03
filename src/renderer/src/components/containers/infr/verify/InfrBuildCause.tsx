import React from 'react';
import { Check, Copy } from 'lucide-react';
import type { BuildLogCause } from '../../../../../../shared/infrBuildLog';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

/**
 * A causa do build que falhou: o primeiro erro de resolução do lote (o resto do log é consequência dele), o que faltou,
 * como resolver e o texto completo do Karaf para ler inteiro e copiar.
 */
export const InfrBuildCause: React.FC<{ cause: BuildLogCause }> = ({ cause }) => {
  const { copy, copiedKey } = useCopyToClipboard(2000);
  const total = cause.failures ?? cause.symptoms;
  return (
    <div className="px-4 py-3 space-y-2.5 border-b border-border/70 bg-danger/5">
      <p className="text-xs font-bold text-foreground">
        Causa: o primeiro erro do lote
        {total > 1 && <span className="font-normal text-muted-foreground"> · as outras {total - 1} falhas do log são consequência dele</span>}
      </p>
      <p className="text-sm text-foreground break-words">{cause.headline.charAt(0).toUpperCase() + cause.headline.slice(1)}.</p>
      {cause.requirements.length > 0 && (
        <ul className="list-disc pl-5 space-y-0.5 text-xs text-foreground/90 break-words">
          {cause.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {cause.causedBy.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">Porque</p>
          <ul className="list-disc pl-5 space-y-0.5 text-xs text-foreground/90 break-words">
            {cause.causedBy.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {cause.others && cause.others.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">Também aparece no log (outro problema)</p>
          <ul className="list-disc pl-5 space-y-0.5 text-xs text-foreground/90 break-words">
            {cause.others.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}
      {cause.hint && (
        <p className="text-xs text-foreground break-words rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
          <strong>Como resolver:</strong> {cause.hint}
        </p>
      )}
      <details>
        <summary className="text-xs font-semibold text-warning cursor-pointer">Texto completo do Karaf</summary>
        <div className="mt-2 space-y-2">
          <button
            type="button"
            onClick={() => copy(cause.full, 'causa')}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
          >
            {copiedKey === 'causa' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedKey === 'causa' ? 'Copiado' : 'Copiar'}
          </button>
          <pre className="m-0 p-3 max-h-64 overflow-auto rounded-lg bg-[#090D14] text-2xs font-mono text-emerald-400 whitespace-pre-wrap break-all select-text">{cause.full}</pre>
        </div>
      </details>
    </div>
  );
};
