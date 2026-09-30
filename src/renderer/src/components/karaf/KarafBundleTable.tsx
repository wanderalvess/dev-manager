import React from 'react';
import {
  Search,
  RotateCw,
  Terminal,
  Play,
  Package,
  Sparkles,
  Hammer,
  RotateCcw,
  ArrowUpCircle,
  Info,
  Wrench,
  Square,
  Trash2,
  CheckSquare
} from 'lucide-react';
import { GitProjectInfo, KarafBundleInfo } from '../../../../shared/types';
import { isWorkspaceBundle, KarafContainerStatus } from '../../utils/karafBundleUtils';

interface KarafBundleTableProps {
  bundles: KarafBundleInfo[];
  filteredBundles: KarafBundleInfo[];
  projects: GitProjectInfo[];
  search: string;
  onSearchChange: (search: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  selectedBundleIds: Set<string>;
  onToggleSelectBundle: (id: string) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  karafStatus: KarafContainerStatus;
  isLoading: boolean;
  isStartingKaraf: boolean;
  actionLoading: Record<string, string>;
  rebuildingBundleId: string | null;
  isBatchActionLoading: boolean;
  onLaunchKarafDebug: () => void;
  onFetchBundles: (isSilent?: boolean) => void;
  onOneClickRebuild: (bundle: KarafBundleInfo) => void;
  onBasicAction: (action: 'start' | 'stop' | 'restart' | 'refresh' | 'resolve', bundleId: string) => void;
  onOpenInlineDiag: (bundle: KarafBundleInfo) => void;
  onOpenReinstall: (bundle: KarafBundleInfo) => void;
  onOpenInstall: (bundle: KarafBundleInfo) => void;
  onOpenDetails: (bundle: KarafBundleInfo) => void;
  onOpenUninstall: (bundle: KarafBundleInfo) => void;
  onBatchAction: (action: 'start' | 'stop' | 'restart' | 'refresh' | 'uninstall') => void;
}

export const KarafBundleTable: React.FC<KarafBundleTableProps> = ({
  bundles,
  filteredBundles,
  projects,
  search,
  onSearchChange,
  searchRef,
  selectedBundleIds,
  onToggleSelectBundle,
  onSelectAllVisible,
  onClearSelection,
  karafStatus,
  isLoading,
  isStartingKaraf,
  actionLoading,
  rebuildingBundleId,
  isBatchActionLoading,
  onLaunchKarafDebug,
  onFetchBundles,
  onOneClickRebuild,
  onBasicAction,
  onOpenInlineDiag,
  onOpenReinstall,
  onOpenInstall,
  onOpenDetails,
  onOpenUninstall,
  onBatchAction
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Barra de Filtros e Busca */}
      <div className="px-4 sm:px-6 py-2 border-b border-border/70 bg-card flex items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 max-w-2xl">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar por ID, nome do bundle, versão ou symbolic name... (Atalho: /)"
            className="w-full bg-background border border-border rounded-md pl-9 pr-12 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary font-mono transition"
          />
          <div className="absolute right-2.5 top-1.5 text-[10px] font-mono text-muted-foreground bg-muted/60 px-1 py-0.2 rounded border border-border/60 pointer-events-none">
            /
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedBundleIds.size > 0 && (
            <button
              type="button"
              onClick={onClearSelection}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition cursor-pointer"
              title="Desmarcar todos os bundles"
            >
              Limpar seleção ({selectedBundleIds.size})
            </button>
          )}
          <span className="text-xs text-muted-foreground font-mono tabular-nums font-medium">
            {filteredBundles.length} de {bundles.length} bundles
          </span>
        </div>
      </div>

      {/* Conteúdo da Tabela / Estados vazios */}
      <div className="flex-1 overflow-auto relative">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2 p-6">
            <RotateCw className="w-5 h-5 animate-spin text-primary" />
            <span>Consultando bundles no runtime Karaf via client.bat...</span>
          </div>
        ) : filteredBundles.length === 0 ? (
          karafStatus === 'OFFLINE' && bundles.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-lg bg-muted border border-border/80 flex items-center justify-center mb-3 text-muted-foreground">
                <Terminal className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Apache Karaf Não Conectado</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                O container OSGi do Karaf está inativo ou não respondeu na porta SSH (:8101). Inicie o runtime para visualizar bundles e dependências.
              </p>
              <div className="flex items-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={onLaunchKarafDebug}
                  disabled={isStartingKaraf}
                  className="px-3.5 py-1.5 rounded-md font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isStartingKaraf ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Iniciando Karaf...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Subir Karaf (Debug)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onFetchBundles(false)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-md font-medium text-xs bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
                  <span>Reconectar</span>
                </button>
              </div>
            </div>
          ) : karafStatus === 'STARTING' && bundles.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-2.5">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-1 text-amber-500">
                <RotateCw className="w-6 h-6 animate-spin" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Aguardando Inicialização do Karaf...</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O container OSGi está subindo. O inventário será carregado automaticamente assim que a porta SSH (:8101) estiver disponível.
              </p>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground p-6">
              <Package className="w-6 h-6 opacity-30 mb-2" />
              <p>Nenhum bundle encontrado para os filtros aplicados.</p>
            </div>
          )
        ) : (
          <div className="min-w-full relative pb-28">
            <table className="min-w-full text-xs font-mono border-separate border-spacing-0">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr className="bg-muted">
                  <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left w-12 border-b border-border select-none">
                    <input
                      type="checkbox"
                      checked={filteredBundles.length > 0 && selectedBundleIds.size === filteredBundles.length}
                      onChange={onSelectAllVisible}
                      className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                      title={
                        selectedBundleIds.size === filteredBundles.length
                          ? 'Desmarcar todos'
                          : 'Selecionar todos os bundles visíveis'
                      }
                    />
                  </th>
                  <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-20 border-b border-border select-none text-[11px]">ID</th>
                  <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-36 border-b border-border select-none text-[11px]">Estado</th>
                  <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider min-w-[340px] border-b border-border select-none text-[11px]">Nome do Bundle / SymbolicName</th>
                  <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-left text-muted-foreground uppercase font-bold tracking-wider w-36 border-b border-border select-none text-[11px]">Versão</th>
                  <th className="sticky top-0 z-20 bg-muted px-4 py-3 text-right text-muted-foreground uppercase font-bold tracking-wider w-72 border-b border-border select-none text-[11px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredBundles.map((b) => {
                  const isRowLoading = Boolean(actionLoading[b.id]);
                  const isSelected = selectedBundleIds.has(b.id);
                  const isWs = isWorkspaceBundle(b, projects);
                  const isRebuilding = rebuildingBundleId === b.id;

                  return (
                    <tr
                      key={b.id}
                      className={`transition ${
                        isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                      }`}
                    >
                      <td className="px-4 py-3 border-b border-border/40">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectBundle(b.id)}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3 border-b border-border/40 text-primary font-bold text-sm tabular-nums">{b.id}</td>
                      <td className="px-4 py-3 border-b border-border/40">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border inline-flex items-center gap-1.5 ${
                              b.state === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25'
                                : b.state === 'Resolved'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25'
                                : b.state === 'Installed'
                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              b.state === 'Active' ? 'bg-emerald-500' : b.state === 'Resolved' ? 'bg-amber-500' : 'bg-sky-500'
                            }`} />
                            {b.state}
                          </span>
                          {b.state !== 'Active' && (
                            <button
                              type="button"
                              onClick={() => onOpenInlineDiag(b)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
                              title="Ver diagnóstico do Karaf para este bundle (bundle:diag)"
                            >
                              Diag
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-border/40 text-foreground font-medium" title={b.name}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-foreground font-bold text-xs">{b.name}</span>
                            {isWs && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/15 text-primary border border-primary/30">
                                <Sparkles className="w-2.5 h-2.5" /> Workspace
                              </span>
                            )}
                          </div>
                          {b.symbolicName && b.symbolicName !== b.name && (
                            <span className="block text-[11px] text-muted-foreground font-mono mt-0.5 truncate max-w-xl">
                              {b.symbolicName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-b border-border/40 text-muted-foreground font-mono text-xs tabular-nums font-semibold">{b.version || '-'}</td>
                      <td className="px-4 py-3 border-b border-border/40 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Recompilar Maven & Atualizar (1 clique para projetos do workspace) */}
                          {isWs && (
                            <button
                              type="button"
                              onClick={() => onOneClickRebuild(b)}
                              disabled={isRebuilding || isRowLoading}
                              title="Recompilar projeto Maven (clean install) e atualizar bundle no Karaf em 1 clique"
                              className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Hammer className={`w-3.5 h-3.5 ${isRebuilding ? 'animate-spin' : ''}`} />
                            </button>
                          )}

                          {/* Atualizar Fiações (bundle:refresh) */}
                          <button
                            type="button"
                            onClick={() => onBasicAction('refresh', b.id)}
                            disabled={isRowLoading}
                            title="Atualizar fiações OSGi do bundle (bundle:refresh)"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          {/* Reinstalar */}
                          <button
                            type="button"
                            onClick={() => onOpenReinstall(b)}
                            disabled={isRowLoading}
                            title="Reinstalar bundle (update + refresh)"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Instalar Outra Versão / Atualizar */}
                          <button
                            type="button"
                            onClick={() => onOpenInstall(b)}
                            disabled={isRowLoading}
                            title="Instalar outra versão ou atualizar"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Detalhes & Dependências */}
                          <button
                            type="button"
                            onClick={() => onOpenDetails(b)}
                            disabled={isRowLoading}
                            title="Inspecionar dependências e manifesto"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>

                          {/* Resolver Dependências (bundle:resolve) */}
                          {b.state === 'Installed' && (
                            <button
                              type="button"
                              onClick={() => onBasicAction('resolve', b.id)}
                              disabled={isRowLoading}
                              title="Forçar resolução de dependências OSGi (bundle:resolve)"
                              className="p-1.5 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Iniciar / Parar */}
                          {b.state === 'Active' ? (
                            <button
                              type="button"
                              onClick={() => onBasicAction('stop', b.id)}
                              disabled={isRowLoading}
                              title="Parar bundle"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onBasicAction('start', b.id)}
                              disabled={isRowLoading}
                              title="Iniciar bundle"
                              className="p-1.5 rounded-md text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}

                          {/* Desinstalar */}
                          <button
                            type="button"
                            onClick={() => onOpenUninstall(b)}
                            disabled={isRowLoading}
                            title="Desinstalar bundle com verificação de dependências"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Barra Flutuante de Ações em Lote */}
            {selectedBundleIds.size > 0 && (
              <div className="sticky bottom-3 mx-4 z-20 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-lg p-2.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs mt-2">
                <div className="flex items-center gap-2 font-bold text-foreground pr-3">
                  <CheckSquare className="w-4 h-4 text-primary" />
                  <span>{selectedBundleIds.size} bundle(s) selecionado(s)</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onBatchAction('restart')}
                    disabled={isBatchActionLoading}
                    className="px-3 py-1.5 rounded-xl font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="Reiniciar todos os bundles selecionados"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isBatchActionLoading ? 'animate-spin' : ''}`} />
                    <span>Reiniciar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBatchAction('start')}
                    disabled={isBatchActionLoading}
                    className="px-3 py-1.5 rounded-xl font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="Iniciar todos os bundles selecionados"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Iniciar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBatchAction('stop')}
                    disabled={isBatchActionLoading}
                    className="px-3 py-1.5 rounded-xl font-bold bg-muted hover:bg-muted/80 border border-border text-foreground transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="Parar todos os bundles selecionados"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBatchAction('refresh')}
                    disabled={isBatchActionLoading}
                    className="px-3 py-1.5 rounded-xl font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-700 dark:text-sky-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="Atualizar fiações OSGi dos bundles selecionados"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBatchAction('uninstall')}
                    disabled={isBatchActionLoading}
                    className="px-3 py-1.5 rounded-xl font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-700 dark:text-rose-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    title="Desinstalar todos os bundles selecionados"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Desinstalar</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-muted-foreground hover:text-foreground text-xs underline pl-2 cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
