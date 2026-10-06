import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Database, RotateCw, Table2, X } from 'lucide-react';
import type {
  DatabaseConnectionConfig,
  DbObjectType,
  TableDetails
} from '../../../../../shared/types';
import { ColumnsTab, ConstraintsTab, DdlTab, IndexesTab, TriggersTab } from './TableSpecTabs';

export interface SpecTarget {
  name: string;
  type: DbObjectType;
}

interface TableSpecModalProps {
  target: SpecTarget | null;
  connection: DatabaseConnectionConfig | null;
  onClose: () => void;
  /** "SELECT no editor": coloca uma consulta da tabela no editor e fecha o painel. */
  onSelectData: (tableName: string) => void;
}

type SpecTab = 'columns' | 'constraints' | 'indexes' | 'triggers' | 'ddl';

const TABLE_LIKE = new Set<DbObjectType>(['TABLE', 'VIEW', 'MATERIALIZED VIEW']);

const formatNumber = (n: number) => n.toLocaleString('pt-BR');

/** "Descrever tabela": colunas, constraints (com navegação por chave estrangeira), índices, triggers e DDL. */
export const TableSpecModal: React.FC<TableSpecModalProps> = ({ target, connection, onClose, onSelectData }) => {
  // Pilha de nomes: clicar numa FK abre a tabela referenciada e o botão voltar retorna à anterior
  const [stack, setStack] = useState<SpecTarget[]>([]);
  const [tab, setTab] = useState<SpecTab>('columns');
  const [details, setDetails] = useState<TableDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [ddl, setDdl] = useState<string | null>(null);
  const [ddlLoading, setDdlLoading] = useState(false);
  const [ddlError, setDdlError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const current = stack[stack.length - 1] ?? null;
  const tableLike = !!current && TABLE_LIKE.has(current.type);

  useEffect(() => {
    setStack(target ? [target] : []);
  }, [target]);

  useEffect(() => {
    setTab(current && !TABLE_LIKE.has(current.type) ? 'ddl' : 'columns');
    setDdl(null);
    setDdlError(null);
  }, [current?.name, current?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!current || !connection || !TABLE_LIKE.has(current.type) || !window.electronAPI?.getDbTableDetails) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    window.electronAPI
      .getDbTableDetails(connection, current.name)
      .then((d) => !cancelled && setDetails(d))
      .catch((err) => !cancelled && setDetails({ success: false, error: err?.message ?? 'Falha ao ler a tabela.', name: current.name, objectType: 'TABLE', columns: [], constraints: [], indexes: [], triggers: [] }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [current?.name, current?.type, connection, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // DDL só é buscado quando a aba é aberta
  useEffect(() => {
    if (tab !== 'ddl' || !current || !connection || ddl !== null || ddlError !== null || !window.electronAPI?.getDbObjectDdl) return;
    let cancelled = false;
    setDdlLoading(true);
    window.electronAPI
      .getDbObjectDdl(connection, current.type, current.name)
      .then((r) => {
        if (cancelled) return;
        if (r.success) setDdl(r.ddl ?? '');
        else setDdlError(r.error ?? 'Não foi possível obter o DDL.');
      })
      .catch((err) => !cancelled && setDdlError(err?.message ?? 'Não foi possível obter o DDL.'))
      .finally(() => !cancelled && setDdlLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tab, current, connection, ddl, ddlError]);

  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  const openRelated = useCallback((name: string) => {
    setStack((prev) => [...prev, { name, type: 'TABLE' }]);
  }, []);

  if (!target || !current) return null;

  const tabs: Array<{ id: SpecTab; label: string; count?: number }> = tableLike
    ? [
        { id: 'columns', label: 'Colunas', count: details?.columns.length },
        { id: 'constraints', label: 'Constraints', count: details?.constraints.length },
        { id: 'indexes', label: 'Índices', count: details?.indexes.length },
        { id: 'triggers', label: 'Triggers', count: details?.triggers.length },
        { id: 'ddl', label: 'DDL' }
      ]
    : [{ id: 'ddl', label: 'DDL / código' }];

  const fullName = details?.owner ? `${details.owner}.${details.name}` : current.name;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Especificação de ${current.name}`}
        className="bg-card w-full max-w-4xl h-[80vh] rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex items-start gap-2.5">
            {stack.length > 1 && (
              <button
                type="button"
                onClick={() => setStack((prev) => prev.slice(0, -1))}
                className="mt-0.5 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Voltar para a tabela anterior"
                title={`Voltar para ${stack[stack.length - 2].name}`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Table2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground font-mono truncate">{fullName}</h3>
                <span className="px-1.5 py-0.5 rounded bg-muted text-2xs font-bold text-muted-foreground">
                  {details?.objectType ?? current.type}
                </span>
              </div>
              {details?.comment && <p className="text-xs text-muted-foreground mt-0.5">{details.comment}</p>}
              {details?.success && (
                <p className="text-2xs text-muted-foreground mt-0.5 font-mono">
                  {details.rowCountEstimate !== undefined && `≈ ${formatNumber(details.rowCountEstimate)} linhas (estimativa do catálogo)`}
                  {details.lastAnalyzed && ` · estatísticas de ${details.lastAnalyzed}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {tableLike && (
              <button
                type="button"
                onClick={() => onSelectData(current.name)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 cursor-pointer"
                title="Colocar uma consulta desta tabela no editor"
              >
                <Database className="w-3.5 h-3.5" />
                <span>SELECT no editor</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setDdl(null);
                setDdlError(null);
                setReloadKey((k) => k + 1);
              }}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Recarregar"
              title="Recarregar do banco"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div role="tablist" aria-label="Seções da especificação" className="px-3 pt-2 border-b border-border flex gap-1 shrink-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors cursor-pointer ${
                tab === t.id ? 'bg-background text-primary border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1.5 text-2xs font-mono opacity-70">{t.count}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto bg-background">
          {tab === 'ddl' ? (
            <DdlTab ddl={ddl} loading={ddlLoading} error={ddlError} />
          ) : loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" /> Lendo o catálogo do banco...
            </div>
          ) : !details ? null : !details.success ? (
            <div className="p-4 text-xs text-rose-500 whitespace-pre-wrap">{details.error}</div>
          ) : tab === 'columns' ? (
            <ColumnsTab details={details} />
          ) : tab === 'constraints' ? (
            <ConstraintsTab details={details} onOpenTable={openRelated} />
          ) : tab === 'indexes' ? (
            <IndexesTab details={details} />
          ) : (
            <TriggersTab details={details} />
          )}
        </div>
      </div>
    </div>
  );
};
