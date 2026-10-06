import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Pencil, RefreshCw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import type { QualitySourceConfig } from '../../../../../shared/types';
import type { QualityValidationItem, ValidationItemStatus } from '../../../utils/qualityPageUtils';
import { getCategoryLabel, getStatusSelectClass, type QualitySortDir, type QualitySortKey } from '../../../utils/qualityPageView';

interface QualityMatrixPanelProps {
  qualitySources: QualitySourceConfig[];
  filteredItems: QualityValidationItem[];
  totalCount: number;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  onResetDefaults: () => void;
  onStatusChange: (id: string, status: ValidationItemStatus) => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: QualityValidationItem) => void;
  onExportCsv: () => void;
  sortKey: QualitySortKey | null;
  sortDir: QualitySortDir;
  onSort: (key: QualitySortKey) => void;
  onNavigate?: (tab: string) => void;
}

const SortableTh: React.FC<{
  label: string;
  sortKey: QualitySortKey;
  active: QualitySortKey | null;
  dir: QualitySortDir;
  onSort: (key: QualitySortKey) => void;
}> = ({ label, sortKey, active, dir, onSort }) => {
  const isActive = active === sortKey;
  const Icon = !isActive ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="px-4 py-3" aria-sort={isActive ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 uppercase font-bold tracking-wider hover:text-foreground cursor-pointer"
      >
        {label}
        <Icon className={`w-3 h-3 ${isActive ? 'text-primary' : 'opacity-50'}`} />
      </button>
    </th>
  );
};

export const QualityMatrixPanel: React.FC<QualityMatrixPanelProps> = ({
  qualitySources,
  filteredItems,
  totalCount,
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onResetDefaults,
  onStatusChange,
  onDeleteItem,
  onEditItem,
  onExportCsv,
  sortKey,
  sortDir,
  onSort,
  onNavigate
}) => {
  const isFiltered = statusFilter !== 'all' || categoryFilter !== 'all' || searchTerm.trim() !== '';
  const clearFilters = () => {
    onSearchTermChange('');
    onStatusFilterChange('all');
    onCategoryFilterChange('all');
  };

  return (
  <div className="space-y-4">
    {qualitySources.length === 0 && (
      <div className="p-3.5 rounded-md bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>
            A matriz é preenchida manualmente e fica salva só neste navegador. A sincronização com fontes de teste (<strong className="text-foreground">Zephyr Scale, Zephyr Squad, Jira ou Azure Test Plans</strong>) ainda não está implementada.
          </span>
        </div>
        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="px-3 py-1.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-medium shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
          >
            Ver Configurações
          </button>
        )}
      </div>
    )}

    {/* Barra de Filtro e Busca */}
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
      <div className="relative flex-1 w-full">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          aria-label="Buscar cenários"
          placeholder="Buscar por cenário, rotina, alvo ou anotações..."
          className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/50 border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>

      <div className="flex items-center space-x-2 w-full sm:w-auto">
        <select
          value={statusFilter}
          aria-label="Filtrar por status"
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-muted border border-border text-foreground cursor-pointer focus:outline-none"
        >
          <option value="all">Todos os Status</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em Teste</option>
          <option value="passed">Aprovado</option>
          <option value="failed">Falha</option>
          <option value="blocked">Bloqueado</option>
        </select>

        <select
          value={categoryFilter}
          aria-label="Filtrar por categoria"
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-muted border border-border text-foreground cursor-pointer focus:outline-none"
        >
          <option value="all">Todas Categorias</option>
          <option value="routine">Rotinas Delphi</option>
          <option value="service">Serviços / Karaf</option>
          <option value="api">APIs REST</option>
          <option value="e2e">Fluxos E2E</option>
        </select>

        <button
          type="button"
          onClick={onResetDefaults}
          title="Restaurar cenários padrão de teste"
          aria-label="Restaurar cenários padrão de teste"
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-border cursor-pointer transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onExportCsv}
          title="Exportar cenários exibidos em CSV"
          aria-label="Exportar cenários exibidos em CSV"
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground border border-border cursor-pointer transition"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="flex items-center justify-between text-xs text-muted-foreground px-1" aria-live="polite">
      <span>
        Exibindo <strong className="text-foreground">{filteredItems.length}</strong> de {totalCount} cenários
      </span>
      {isFiltered && (
        <button type="button" onClick={clearFilters} className="text-primary hover:underline cursor-pointer">
          Limpar filtros
        </button>
      )}
    </div>

    {/* Lista / Tabela da Matriz */}
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-xs">
          <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-2xs tracking-wider font-bold">
            <tr>
              <SortableTh label="Status" sortKey="status" active={sortKey} dir={sortDir} onSort={onSort} />
              <SortableTh label="Cenário / Teste" sortKey="title" active={sortKey} dir={sortDir} onSort={onSort} />
              <SortableTh label="Alvo / Componente" sortKey="targetName" active={sortKey} dir={sortDir} onSort={onSort} />
              <SortableTh label="Categoria" sortKey="category" active={sortKey} dir={sortDir} onSort={onSort} />
              <th className="px-4 py-3">Notas &amp; Critérios</th>
              <SortableTh label="Atualizado" sortKey="updatedAt" active={sortKey} dir={sortDir} onSort={onSort} />
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum cenário de teste encontrado com os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <select
                      value={item.status}
                      aria-label={`Status de ${item.title}`}
                      onChange={(e) => onStatusChange(item.id, e.target.value as ValidationItemStatus)}
                      className={`px-2 py-1 rounded text-[11px] font-bold border cursor-pointer focus:outline-none ${getStatusSelectClass(item.status)}`}
                    >
                      <option value="pending">⚪ Pendente</option>
                      <option value="in_progress">⏳ Em Teste</option>
                      <option value="passed">✅ Aprovado</option>
                      <option value="failed">❌ Falha / Bug</option>
                      <option value="blocked">⛔ Bloqueado</option>
                    </select>
                  </td>

                  <td className="px-4 py-3 font-semibold text-foreground min-w-[14rem]">{item.title}</td>

                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {item.targetName}
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-2xs font-medium bg-muted text-muted-foreground border border-border whitespace-nowrap">
                      {getCategoryLabel(item.category)}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground max-w-[14rem] truncate" title={item.notes}>
                    {item.notes || '—'}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      className="p-1 hover:text-primary text-muted-foreground transition cursor-pointer"
                      title="Editar cenário"
                      aria-label={`Editar cenário ${item.title}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1 hover:text-rose-400 text-muted-foreground transition cursor-pointer"
                      title="Remover cenário"
                      aria-label={`Remover cenário ${item.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
};
