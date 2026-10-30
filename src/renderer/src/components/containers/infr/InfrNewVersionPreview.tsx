import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { InfrVersionPreview } from '../../../../../shared/infrVersionManifest';

const BOX = 'p-4 bg-card border border-border/80 rounded-xl space-y-2';

/** Detalhe da prévia: o que o catálogo da 801 sobe e o que ficou para trás (o WSH vai na revisão). */
export const InfrNewVersionPreview: React.FC<{ preview: InfrVersionPreview; version: string }> = ({ preview, version }) => {
  if (!preview.success) {
    return <div className="p-3 rounded-xl border border-danger/30 bg-danger/5 text-xs text-danger">{preview.error}</div>;
  }
  const up = preview.upgrade!;

  return (
    <div className="space-y-3">
      <div className={BOX}>
        <p className="text-xs text-foreground">
          <strong>{preview.originCount}</strong> features na origem · <strong className="text-success">{up.changes.length}</strong> sobem pela rotina 801
          {up.behind.length > 0 && <> · <strong className="text-warning">{up.behind.length}</strong> sem versão da linha {version}</>}
          {up.skipped.length > 0 && <> · {up.skipped.length} ignoradas</>}
          <span className="block text-2xs text-muted-foreground mt-0.5">Catálogo lido de {preview.originWtaUrl}</span>
        </p>
        {up.changes.length > 0 && (
          <div className="max-h-44 overflow-auto scrollbar-thin rounded-lg border border-border/60">
            <table className="w-full text-2xs font-mono">
              <tbody>
                {up.changes.map((c) => (
                  <tr key={c.name} className="border-b border-border/40 last:border-0">
                    <td className="px-2 py-1 text-foreground">{c.name}</td>
                    <td className="px-2 py-1 text-muted-foreground">{c.from}</td>
                    <td className="px-2 py-1 text-success">→ {c.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(up.behind.length > 0 || up.skipped.length > 0) && (
        <div className={BOX}>
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Ficam como na origem
          </p>
          {up.behind.length > 0 && (
            <p className="text-2xs text-muted-foreground">
              Sem versão da linha {version} no catálogo: {up.behind.map((f) => `${f.name} ${f.version}`).join(', ')}.
            </p>
          )}
          {up.skipped.map((s) => (
            <p key={s.name} className="text-2xs text-muted-foreground font-mono">
              {s.name} {s.version}: {s.reason}
            </p>
          ))}
        </div>
      )}

    </div>
  );
};
