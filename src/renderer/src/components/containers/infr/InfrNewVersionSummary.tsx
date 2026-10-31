import React from 'react';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';

const Item: React.FC<{ title: string; port?: string; name?: string; detail: string; tone?: 'muted' | 'danger' }> = ({ title, port, name, detail, tone }) => (
  <div className={`p-3 rounded-xl bg-card border ${tone === 'muted' ? 'border-dashed border-border' : tone === 'danger' ? 'border-danger/40' : 'border-border/80'}`}>
    <div className="flex justify-between gap-2 text-xs font-semibold text-foreground">
      <span>{title}</span>
      {port && <span className="font-mono font-medium text-muted-foreground">:{port}</span>}
    </div>
    {name && <div className="font-mono text-2xs text-foreground mt-1 break-words">{name}</div>}
    <div className={`text-2xs mt-0.5 ${tone === 'danger' ? 'text-danger' : 'text-muted-foreground'}`}>{detail}</div>
  </div>
);

/** "O que será criado": containers, portas e arquivos do ambiente novo, atualizado a cada escolha. */
export const InfrNewVersionSummary: React.FC<{ s: InfrNewVersionState }> = ({ s }) => {
  const { form, preview, manifestSource, review } = s;
  const v = form.version || '<versão>';
  const n = form.name || '<nome>';
  const dbBlocked = review.some((r) => r.id === 'banco' && r.status === 'block');
  const db =
    form.dbMode === 'clone'
      ? { name: form.dbContainer, detail: dbBlocked ? 'Cópia indisponível: veja a revisão' : `Cópia do ${form.dbSource || '—'}` }
      : form.dbMode === 'existing'
        ? { name: form.dbContainer, detail: 'Oracle que já existe' }
        : { name: form.dbContainer, detail: 'Vazio, para importar o dump' };
  const manifest = preview?.existing ? (manifestSource === 'existing' ? 'mantido' : 'substituído') : 'gravado ao gerar';
  const jar = form.wshJar.split('/').pop();

  return (
    <div className="space-y-3">
      <Item title="Banco Oracle" port={form.dbMode === 'existing' ? undefined : form.oraclePort} name={db.name || '—'} detail={db.detail} tone={dbBlocked ? 'danger' : undefined} />
      <Item title="WTA" port={form.wtaPort} name={`wta-${n}`} detail={`Imagem linux-winthor:${v}-debian`} />
      {form.wshJar ? (
        <Item title="WSH" port={form.wshPort} name={`wsh-${n}`} detail={`Jar ${jar}`} />
      ) : (
        <Item title="WSH" detail="Sem WSH: dá para criar depois" tone="muted" />
      )}
      <div className="pt-3 border-t border-border/70 space-y-1">
        <p className="text-2xs font-semibold text-foreground/80">Arquivos no INFR-Docker</p>
        <p className="font-mono text-2xs text-foreground break-words">linux-winthor/wta.env.{v}</p>
        {form.wshJar && <p className="font-mono text-2xs text-foreground break-words">wsh-winthor/.env.{v}</p>}
        <p className="font-mono text-2xs text-muted-foreground break-words">
          versions/{v}.features ({manifest})
        </p>
      </div>
      <p className="text-2xs text-muted-foreground">O ambiente {form.from || 'de origem'} continua como está.</p>
    </div>
  );
};
