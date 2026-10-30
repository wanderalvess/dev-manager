import React from 'react';
import type { InfrManifestSource } from '../../../../../shared/infrVersionManifest';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';

/**
 * Quando `versions/<versão>.features` já existe, a geração usa ele por padrão: a prévia sai do
 * ambiente de origem e do catálogo da 801 e pode trazer versões abaixo das que a lista já tem.
 */
export const InfrManifestChoice: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const existing = s.preview?.existing;
  if (!existing) return null;
  const { newer, older, onlyExisting, onlyPreview } = existing.comparison;
  const version = s.form.version;

  const options: { source: InfrManifestSource; label: string; hint: React.ReactNode; badge?: string }[] = [
    {
      source: 'existing',
      label: `Manter a lista da ${version}`,
      badge: 'Recomendado',
      hint: `${existing.count} features, já montadas para a ${version}. Nada é regravado.`
    },
    {
      source: 'preview',
      label: 'Substituir pela lista nova',
      hint:
        older > 0 ? (
          <span className="text-danger">Rebaixaria {older} features: o catálogo deste WTA não tem a linha {version} delas.</span>
        ) : (
          `Regrava versions/${version}.features com a lista lida da origem e do catálogo da 801.`
        )
    }
  ];

  return (
    <section className="p-4 rounded-xl border border-border/80 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="text-sm font-bold text-foreground">Features da versão {version}</h4>
        <span className="font-mono text-2xs text-muted-foreground break-all">{existing.path}</span>
      </div>
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <legend className="sr-only">Qual lista de features usar</legend>
        {options.map((o) => (
          <label
            key={o.source}
            className={`flex gap-2.5 p-3 rounded-xl border cursor-pointer transition ${s.manifestSource === o.source ? 'border-warning bg-warning/5 ring-1 ring-warning/40' : 'border-border hover:bg-muted/40'}`}
          >
            <input type="radio" name="nv-manifest" className="accent-warning w-4 h-4 mt-0.5 shrink-0" checked={s.manifestSource === o.source} onChange={() => s.setManifestSource(o.source)} />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                {o.label}
                {o.badge && <span className="text-2xs font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">{o.badge}</span>}
              </span>
              <span className="block text-xs text-foreground/80 mt-1 leading-relaxed">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-2xs text-muted-foreground">
        Comparada à lista atual, a nova tem {newer} features numa versão acima, {older} abaixo, {onlyPreview} que a atual não tem, e deixa de fora {onlyExisting}.
      </p>
    </section>
  );
};
