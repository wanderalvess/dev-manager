import React from 'react';
import { Package, ArrowRight, Info } from 'lucide-react';
import type { Routine801Feature } from '../../../../shared/types';
import { buildFeatureKey, type Routine801Tab } from '../../utils/routine801ModalUtils';

interface Routine801TableProps {
  filteredList: Routine801Feature[];
  selectedFeatures: Record<string, Routine801Feature>;
  inspectedFeature: Routine801Feature | null;
  activeTab: Routine801Tab;
  isLoading: boolean;
  isExecuting: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onToggleSelectAll: () => void;
  onToggleSelectItem: (item: Routine801Feature, e?: React.SyntheticEvent) => void;
  onInspect: (item: Routine801Feature) => void;
  onExecute: (features: Routine801Feature[]) => void;
}

export const Routine801Table: React.FC<Routine801TableProps> = ({
  filteredList,
  selectedFeatures,
  inspectedFeature,
  activeTab,
  isLoading,
  isExecuting,
  hasActiveFilters,
  onClearFilters,
  onToggleSelectAll,
  onToggleSelectItem,
  onInspect,
  onExecute
}) => {
  if (filteredList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-14 text-center">
        <Package className="w-10 h-10 text-muted-foreground/60 mb-2 stroke-1" />
        <p className="text-sm font-medium">Nenhum artefato encontrado</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          {isLoading
            ? 'Sincronizando dados com o servidor da Rotina 801...'
            : hasActiveFilters
              ? 'Nenhum artefato corresponde aos filtros atuais. Tente limpar os filtros de busca ou versão.'
              : 'Nenhum pacote pendente para este catálogo no servidor Karaf.'}
        </p>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="mt-3 px-3 py-1 text-xs rounded border border-border hover:bg-muted text-foreground transition-colors"
          >
            Limpar todos os filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <table className="w-full text-left text-xs border-collapse">
      <thead className="sticky top-0 bg-card border-b border-border text-muted-foreground uppercase tracking-wider text-[10px] font-mono select-none z-10">
        <tr>
          <th className="py-2 pl-4 pr-2 w-10">
            <input
              type="checkbox"
              checked={filteredList.length > 0 && Object.keys(selectedFeatures).length === filteredList.length}
              onChange={onToggleSelectAll}
              className="rounded border-input text-primary focus:ring-0 cursor-pointer"
              title="Selecionar todos os filtrados"
            />
          </th>
          <th className="py-2 px-2 w-16 text-center">Canal</th>
          <th className="py-2 px-3 w-20">Tipo</th>
          <th className="py-2 px-3">Rotina & Descrição</th>
          <th className="py-2 px-3">Feature OSGi</th>
          <th className="py-2 px-3 w-40">Versão</th>
          <th className="py-2 pr-4 pl-3 w-40 text-right">Ação</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/50 text-foreground">
        {filteredList.map((item) => {
          const key = buildFeatureKey(item);
          const isSelected = !!selectedFeatures[key];
          const isInspected = inspectedFeature?.nome === item.nome && inspectedFeature?.versao === item.versao;
          const isLiberado = item.status === 'LIBERADO';

          return (
            <tr
              key={key}
              onClick={() => onInspect(item)}
              className={`cursor-pointer transition-colors ${
                isInspected
                  ? 'bg-primary/10 border-l-2 border-primary'
                  : isSelected
                    ? 'bg-muted/40'
                    : 'hover:bg-muted/30'
              }`}
            >
              {/* Checkbox de Seleção */}
              <td className="py-2 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onToggleSelectItem(item, e)}
                  className="rounded border-input text-primary focus:ring-0 cursor-pointer"
                />
              </td>

              {/* Canal [P] Produção / [H] Homologação */}
              <td className="py-2 px-2 text-center whitespace-nowrap">
                <span
                  className={`inline-flex items-center justify-center w-6 h-5 text-[11px] font-mono font-bold rounded border ${
                    isLiberado
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/35'
                  }`}
                  title={isLiberado ? 'Canal Produção (Liberado oficial)' : 'Canal Homologação (Em validação)'}
                >
                  {isLiberado ? 'P' : 'H'}
                </span>
              </td>

              {/* Tipo de Projeto */}
              <td className="py-2 px-3 whitespace-nowrap">
                <span
                  className={`inline-block px-1.5 py-0.5 text-[9px] font-mono font-medium rounded border ${
                    item.tipoProjeto === 'ROTINA'
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {item.tipoProjeto || 'SERVIÇO'}
                </span>
              </td>

              {/* Rotina e Descrição */}
              <td className="py-2 px-3">
                <div className="flex items-center gap-1.5 font-medium">
                  {item.codigoRotina > 0 && (
                    <span className="font-mono text-[11px] font-bold text-primary shrink-0">
                      {item.codigoRotina}
                    </span>
                  )}
                  <span className="truncate max-w-md">{item.descricao}</span>
                </div>
                {item.codigoModulo > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Módulo {item.codigoModulo}
                  </span>
                )}
              </td>

              {/* Nome da Feature OSGi */}
              <td className="py-2 px-3 font-mono text-[11px] text-muted-foreground select-all">
                <span className="truncate max-w-[260px] inline-block">{item.nome}</span>
              </td>

              {/* Versão */}
              <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap tabular-nums">
                {item.versaoAnterior ? (
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground/70 line-through">{item.versaoAnterior}</span>
                    <ArrowRight className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-emerald-400 font-medium">{item.versao}</span>
                  </div>
                ) : (
                  <span className="text-foreground">{item.versao}</span>
                )}
              </td>

              {/* Ações por linha */}
              <td className="py-2 pr-4 pl-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onInspect(item)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Inspecionar metadados Maven e dependências"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onExecute([item])}
                    disabled={isExecuting}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                      activeTab === 'updates'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500/40'
                        : 'bg-primary hover:opacity-90 text-primary-foreground border-primary/40'
                    } disabled:opacity-50`}
                  >
                    {activeTab === 'updates' ? 'Atualizar' : 'Instalar'}
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
