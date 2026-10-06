import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Copy, Key, Link2, Search } from 'lucide-react';
import type { TableDetails } from '../../../../../shared/types';

const TH = 'px-3 py-2 text-left text-2xs uppercase tracking-wider font-bold text-muted-foreground';
const TD = 'px-3 py-1.5 align-top';

const STATUS_BAD = /DISABLED|INVALID|NOT VALID|UNUSABLE/i;

const StatusBadge: React.FC<{ status?: string }> = ({ status }) =>
  status ? (
    <span
      className={`px-1.5 py-0.5 rounded text-2xs font-bold ${
        STATUS_BAD.test(status) ? 'bg-rose-500/15 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'
      }`}
    >
      {status}
    </span>
  ) : null;

const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-8 text-center text-xs text-muted-foreground">{children}</div>
);

export const ColumnsTab: React.FC<{ details: TableDetails }> = ({ details }) => {
  const [filter, setFilter] = useState('');
  const fkColumns = useMemo(
    () => new Set(details.constraints.filter((c) => c.kind === 'FOREIGN KEY').flatMap((c) => c.columns)),
    [details.constraints]
  );
  const rows = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return details.columns;
    return details.columns.filter((c) => `${c.name} ${c.type} ${c.comment ?? ''} ${c.defaultValue ?? ''}`.toLowerCase().includes(term));
  }, [details.columns, filter]);

  return (
    <div>
      <div className="p-2 border-b border-border/60 relative">
        <Search className="w-3.5 h-3.5 absolute left-4 top-4 text-muted-foreground" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar colunas por nome, tipo ou comentário..."
          aria-label="Filtrar colunas"
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border/70 rounded-md focus:outline-none focus:border-primary text-foreground"
        />
      </div>
      <table className="w-full text-xs">
        <thead className="bg-muted/40 sticky top-0">
          <tr>
            <th className={TH}>#</th>
            <th className={TH}>Coluna</th>
            <th className={TH}>Tipo</th>
            <th className={TH}>Nulo?</th>
            <th className={TH}>Default</th>
            <th className={TH}>Comentário</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {rows.map((c) => (
            <tr key={c.name} className="hover:bg-muted/30">
              <td className={`${TD} text-muted-foreground font-mono`}>{c.position}</td>
              <td className={`${TD} font-mono font-semibold text-foreground`}>
                <span className="inline-flex items-center gap-1">
                  {c.isPrimaryKey && <Key className="w-3 h-3 text-amber-400" aria-label="Chave primária" />}
                  {fkColumns.has(c.name) && <Link2 className="w-3 h-3 text-sky-400" aria-label="Chave estrangeira" />}
                  {c.name}
                </span>
              </td>
              <td className={`${TD} font-mono text-muted-foreground`}>{c.type}</td>
              <td className={TD}>
                {c.nullable ? (
                  <span className="text-muted-foreground">sim</span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-2xs font-bold">NOT NULL</span>
                )}
              </td>
              <td className={`${TD} font-mono text-muted-foreground`}>{c.defaultValue ?? '—'}</td>
              <td className={`${TD} text-muted-foreground`}>{c.comment ?? '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6}>
                <Empty>Nenhuma coluna encontrada com esse filtro.</Empty>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export const ConstraintsTab: React.FC<{ details: TableDetails; onOpenTable: (name: string) => void }> = ({ details, onOpenTable }) => {
  if (details.constraints.length === 0) return <Empty>Esta tabela não tem constraints (PK, FK, UNIQUE ou CHECK).</Empty>;
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/40 sticky top-0">
        <tr>
          <th className={TH}>Nome</th>
          <th className={TH}>Tipo</th>
          <th className={TH}>Colunas</th>
          <th className={TH}>Detalhes</th>
          <th className={TH}>Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {details.constraints.map((c) => (
          <tr key={c.name} className="hover:bg-muted/30">
            <td className={`${TD} font-mono font-semibold text-foreground`}>{c.name}</td>
            <td className={`${TD} text-muted-foreground`}>{c.kind}</td>
            <td className={`${TD} font-mono`}>{c.columns.join(', ') || '—'}</td>
            <td className={TD}>
              {c.kind === 'FOREIGN KEY' && c.refTable ? (
                <span className="inline-flex flex-wrap items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-sky-400" />
                  <button
                    type="button"
                    onClick={() => onOpenTable(c.refTable!)}
                    title={`Abrir a especificação de ${c.refTable}`}
                    className="font-mono text-primary hover:underline cursor-pointer"
                  >
                    {c.refTable}
                  </button>
                  <span className="font-mono text-muted-foreground">({(c.refColumns ?? []).join(', ')})</span>
                  {c.onDelete && c.onDelete !== 'NO ACTION' && (
                    <span className="text-2xs text-muted-foreground">ON DELETE {c.onDelete}</span>
                  )}
                </span>
              ) : c.kind === 'CHECK' ? (
                <span className="font-mono text-muted-foreground">{c.condition ?? c.definition ?? '—'}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
            <td className={TD}>
              <StatusBadge status={c.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const IndexesTab: React.FC<{ details: TableDetails }> = ({ details }) => {
  if (details.indexes.length === 0) return <Empty>Nenhum índice nesta tabela.</Empty>;
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/40 sticky top-0">
        <tr>
          <th className={TH}>Índice</th>
          <th className={TH}>Colunas</th>
          <th className={TH}>Tipo</th>
          <th className={TH}>Únic.</th>
          <th className={TH}>Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {details.indexes.map((i) => (
          <tr key={i.name} className="hover:bg-muted/30" title={i.definition}>
            <td className={`${TD} font-mono font-semibold text-foreground`}>{i.name}</td>
            <td className={`${TD} font-mono`}>{i.columns.join(', ')}</td>
            <td className={`${TD} text-muted-foreground`}>{i.type ?? '—'}</td>
            <td className={TD}>
              {i.primary ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-2xs font-bold">PK</span>
              ) : i.unique ? (
                <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 text-2xs font-bold">sim</span>
              ) : (
                <span className="text-muted-foreground">não</span>
              )}
            </td>
            <td className={TD}>
              <StatusBadge status={i.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export const TriggersTab: React.FC<{ details: TableDetails }> = ({ details }) => {
  if (details.triggers.length === 0) return <Empty>Nenhuma trigger nesta tabela.</Empty>;
  return (
    <table className="w-full text-xs">
      <thead className="bg-muted/40 sticky top-0">
        <tr>
          <th className={TH}>Trigger</th>
          <th className={TH}>Momento</th>
          <th className={TH}>Evento</th>
          <th className={TH}>Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/40">
        {details.triggers.map((t) => (
          <tr key={t.name} className="hover:bg-muted/30" title={t.definition}>
            <td className={`${TD} font-mono font-semibold text-foreground`}>{t.name}</td>
            <td className={`${TD} text-muted-foreground`}>{t.timing ?? '—'}</td>
            <td className={`${TD} font-mono`}>{t.event || '—'}</td>
            <td className={TD}>
              <StatusBadge status={t.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

interface DdlTabProps {
  ddl: string | null;
  loading: boolean;
  error: string | null;
}

export const DdlTab: React.FC<DdlTabProps> = ({ ddl, loading, error }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!ddl) return;
    try {
      await navigator.clipboard.writeText(ddl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard indisponível: o texto continua selecionável na tela
    }
  };

  if (loading) return <Empty>Carregando DDL...</Empty>;
  if (error) return <div className="p-4 text-xs text-rose-500 whitespace-pre-wrap">{error}</div>;
  if (!ddl) return <Empty>Sem DDL para mostrar.</Empty>;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={copy}
        className="absolute right-3 top-3 flex items-center gap-1 px-2 py-1 rounded-md bg-card hover:bg-muted border border-border/70 text-[11px] font-semibold text-foreground cursor-pointer"
        title="Copiar o DDL para a área de transferência"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{copied ? 'Copiado' : 'Copiar DDL'}</span>
      </button>
      <pre className="p-4 pr-32 text-xs font-mono text-emerald-300 bg-[#0B0F17] whitespace-pre-wrap break-words select-text">{ddl}</pre>
    </div>
  );
};
