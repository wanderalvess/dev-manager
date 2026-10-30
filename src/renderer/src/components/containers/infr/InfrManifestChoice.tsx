import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { InfrManifestSource } from '../../../../../shared/infrVersionManifest';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';

const BOX = 'p-4 bg-card border border-border/80 rounded-xl space-y-3';

/**
 * Quando `versions/<versão>.features` já existe, a geração usa ele por padrão: a prévia sai do
 * ambiente de origem e do catálogo da 801 e pode trazer versões abaixo das que o manifesto já tem.
 */
export const InfrManifestChoice: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const existing = s.preview?.existing;
  if (!existing) return null;
  const { newer, older, onlyExisting, onlyPreview } = existing.comparison;
  const version = s.form.version;
  const wshFails = existing.wshCheck?.filter((c) => !c.ok) ?? [];

  const options: { source: InfrManifestSource; label: string; hint: string }[] = [
    {
      source: 'existing',
      label: `Usar o manifesto existente (${existing.count} features)`,
      hint: 'A imagem da versão sai com a lista que já está no INFR-Docker; nada é regravado.'
    },
    {
      source: 'preview',
      label: 'Substituir pelo da prévia',
      hint: `Regrava versions/${version}.features com a lista acima (origem + catálogo da 801).`
    }
  ];

  return (
    <div className={BOX}>
      <div>
        <p className="text-xs font-semibold text-foreground">Já existe um manifesto da versão {version}</p>
        <p className="text-2xs text-muted-foreground font-mono break-all">{existing.path}</p>
      </div>
      <p className="text-2xs text-muted-foreground">
        Comparada a ele, a prévia tem <strong className="text-success">{newer}</strong> features numa versão acima,{' '}
        <strong className={older ? 'text-danger' : 'text-foreground'}>{older}</strong> numa versão abaixo,{' '}
        {onlyPreview} que ele não tem e deixa de fora {onlyExisting} que só ele tem.
      </p>
      {older > 0 && (
        <p className="text-2xs text-danger flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          Substituir rebaixaria {older} features da versão {version}: o catálogo deste WTA não tem a linha {version} delas.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((o) => (
          <label
            key={o.source}
            className={`p-2.5 rounded-lg border cursor-pointer text-2xs ${s.manifestSource === o.source ? 'border-warning bg-warning/5' : 'border-border/70'}`}
          >
            <input type="radio" className="mr-1.5" checked={s.manifestSource === o.source} onChange={() => s.setManifestSource(o.source)} />
            <strong className="text-foreground">{o.label}</strong>
            <span className="block text-muted-foreground mt-0.5">{o.hint}</span>
          </label>
        ))}
      </div>
      {s.manifestSource === 'existing' &&
        existing.wshCheck?.map((c) => (
          <p key={c.service} className="text-2xs font-mono flex items-center gap-1.5">
            {c.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
            WSH com o manifesto existente: {c.service} exige {c.version}, terá {c.found ?? 'nenhuma'}
          </p>
        ))}
      {s.manifestSource === 'existing' && wshFails.length > 0 && (
        <p className="text-2xs text-danger">Com o manifesto existente, o WSH escolhido encerraria ao subir.</p>
      )}
    </div>
  );
};
