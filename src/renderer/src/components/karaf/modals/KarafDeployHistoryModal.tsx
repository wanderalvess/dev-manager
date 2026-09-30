import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  X,
  RotateCw,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  UploadCloud,
  Sparkles,
  Terminal,
  Clock,
  Activity,
  Layers,
  Cpu,
  Package,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { KarafDeployHistoryEntry } from '../../../../../shared/types';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

interface KarafDeployHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInstallWithCoords?: (coords: string, version?: string) => void;
}

export const KarafDeployHistoryModal: React.FC<KarafDeployHistoryModalProps> = ({
  isOpen,
  onClose,
  onOpenInstallWithCoords
}) => {
  const [deployHistory, setDeployHistory] = useState<KarafDeployHistoryEntry[]>([]);
  const [isLoadingDeployHistory, setIsLoadingDeployHistory] = useState(false);
  const [deployHistorySearch, setDeployHistorySearch] = useState('');
  const [deployHistoryFilter, setDeployHistoryFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE' | 'MCP' | 'UI'>('ALL');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);
  const { copy: copyDeployCoord, copiedKey: copiedDeployCoordKey } = useCopyToClipboard(2000);

  const fetchDeployHistory = async () => {
    if (!window.electronAPI?.getKarafDeployHistory) return;
    setIsLoadingDeployHistory(true);
    try {
      setDeployHistory(await window.electronAPI.getKarafDeployHistory());
    } catch {
      setDeployHistory([]);
    } finally {
      setIsLoadingDeployHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDeployHistorySearch('');
      setDeployHistoryFilter('ALL');
      setExpandedErrorId(null);
      fetchDeployHistory();
    }
  }, [isOpen]);

  const deployStats = useMemo(() => {
    const total = deployHistory.length;
    const successes = deployHistory.filter((d) => d.success).length;
    const failures = total - successes;
    const successRate = total > 0 ? Math.round((successes / total) * 100) : 100;
    const totalDuration = deployHistory.reduce((acc, d) => acc + (d.durationMs || 0), 0);
    const avgDuration = total > 0 ? (totalDuration / total / 1000).toFixed(1) : '0.0';
    const mcpCount = deployHistory.filter((d) => d.trigger === 'mcp').length;
    const uiCount = total - mcpCount;

    return {
      total,
      successes,
      failures,
      successRate,
      avgDuration,
      mcpCount,
      uiCount
    };
  }, [deployHistory]);

  const filteredDeployHistory = useMemo(() => {
    return deployHistory.filter((entry) => {
      if (deployHistoryFilter === 'SUCCESS' && !entry.success) return false;
      if (deployHistoryFilter === 'FAILURE' && entry.success) return false;
      if (deployHistoryFilter === 'MCP' && entry.trigger !== 'mcp') return false;
      if (deployHistoryFilter === 'UI' && entry.trigger !== 'ui') return false;

      if (deployHistorySearch.trim()) {
        const query = deployHistorySearch.toLowerCase().trim();
        const art = (entry.artifactId || '').toLowerCase();
        const proj = (entry.projectName || '').toLowerCase();
        const feat = (entry.featureInstall || '').toLowerCase();
        const ver = (entry.version || '').toLowerCase();
        const msg = (entry.message || '').toLowerCase();
        const repo = (entry.repoUrl || '').toLowerCase();
        return (
          art.includes(query) ||
          proj.includes(query) ||
          feat.includes(query) ||
          ver.includes(query) ||
          msg.includes(query) ||
          repo.includes(query)
        );
      }
      return true;
    });
  }, [deployHistory, deployHistoryFilter, deployHistorySearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c1017] border border-slate-800 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] w-full max-w-6xl xl:max-w-7xl h-[88vh] flex flex-col overflow-hidden animate-fade-in text-slate-100 font-sans">
        {/* Header com Telemetria e Ações */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-sm shadow-sky-500/10">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 tracking-tight">Histórico & Telemetria de Deploys</h3>
                <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 font-semibold">
                  OSGi Audit Rail
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Auditoria de compilações Maven, hot-deploys e ativações em tempo real (UI & MCP Agent).
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchDeployHistory}
              disabled={isLoadingDeployHistory}
              className="p-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
              title="Recarregar histórico de deploys"
            >
              <RotateCw className={`w-4 h-4 ${isLoadingDeployHistory ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              title="Fechar histórico"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Faixa de Indicadores de Telemetria (Cockpit KPI Strip) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 px-4 border-b border-slate-800/80 bg-slate-950/40 text-xs shrink-0">
          {/* Total */}
          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Total Deploys</div>
              <div className="text-sm font-bold font-mono text-slate-100">{deployStats.total}</div>
            </div>
          </div>

          {/* Taxa de Sucesso */}
          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className={`p-1.5 rounded-lg ${deployStats.failures === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Taxa de Sucesso</div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold font-mono text-slate-100">{deployStats.successRate}%</span>
                <span className={`w-2 h-2 rounded-full ${deployStats.failures === 0 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]'}`} />
              </div>
            </div>
          </div>

          {/* Duração Média */}
          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Duração Média</div>
              <div className="text-sm font-bold font-mono text-slate-100">{deployStats.avgDuration}s</div>
            </div>
          </div>

          {/* Origem */}
          <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Origem (MCP / UI)</div>
              <div className="text-xs font-bold font-mono text-slate-100">
                <span className="text-purple-400">{deployStats.mcpCount}</span> MCP · <span className="text-amber-400">{deployStats.uiCount}</span> UI
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar: Busca e Filtros */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/30 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={deployHistorySearch}
              onChange={(e) => setDeployHistorySearch(e.target.value)}
              placeholder="Pesquisar por artefato, versão, feature, erro..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500/60 font-mono placeholder:text-slate-500 placeholder:font-sans transition"
            />
            {deployHistorySearch && (
              <button
                type="button"
                onClick={() => setDeployHistorySearch('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-white text-xs cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'Todos', count: deployStats.total },
              { id: 'SUCCESS', label: 'Sucessos', count: deployStats.successes, dotColor: 'bg-emerald-400' },
              { id: 'FAILURE', label: 'Falhas', count: deployStats.failures, dotColor: 'bg-rose-400' },
              { id: 'MCP', label: 'MCP Agent', count: deployStats.mcpCount, icon: Sparkles },
              { id: 'UI', label: 'Console UI', count: deployStats.uiCount, icon: Terminal }
            ].map((chip) => {
              const isSelected = deployHistoryFilter === chip.id;
              const Icon = chip.icon;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setDeployHistoryFilter(chip.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {chip.dotColor && <span className={`w-1.5 h-1.5 rounded-full ${chip.dotColor}`} />}
                  {Icon && <Icon className="w-3 h-3 text-current" />}
                  <span>{chip.label}</span>
                  <span className="text-[10px] font-mono opacity-70 ml-0.5">({chip.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Área Principal de Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoadingDeployHistory ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 space-y-2">
              <RotateCw className="w-6 h-6 animate-spin text-sky-400" />
              <span>Sincronizando auditoria de deploys do Karaf...</span>
            </div>
          ) : deployHistory.length === 0 ? (
            /* EMPTY STATE: Pipeline Blueprint */
            <div className="h-full min-h-[360px] flex flex-col items-center justify-center p-6 text-center">
              <div className="w-full max-w-lg p-6 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md relative">
                {/* Pipeline OSGi Diagram */}
                <div className="flex items-center justify-center gap-2 mb-5 font-mono text-[10px] text-slate-400">
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-200">
                    <Package className="w-3 h-3 text-sky-400" />
                    <span>Maven JAR</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-200">
                    <UploadCloud className="w-3 h-3 text-sky-400" />
                    <span>Hot-Deploy</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Active OSGi</span>
                  </div>
                </div>

                <h4 className="text-base font-bold text-slate-100 mb-1.5">
                  Nenhum Deploy Registrado Nesta Sessão
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed mb-6">
                  Cada compilação e deploy disparado através da interface ou por agentes MCP (<code className="text-sky-400 font-mono text-[11px]">karaf_deploy_feature</code>) será gravado aqui com telemetria detalhada de duração, coordenadas Maven e diagnóstico de falhas.
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenInstallWithCoords?.('');
                    }}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer active:scale-95"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Instalar Bundle / Nova Versão</span>
                  </button>
                </div>
              </div>
            </div>
          ) : filteredDeployHistory.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <Filter className="w-8 h-8 text-slate-600 mx-auto mb-1" />
              <p className="text-slate-300 font-medium">Nenhum registro encontrado para os critérios selecionados.</p>
              <p className="text-[11px] text-slate-500">Tente ajustar o termo da busca ou alterar os filtros de status.</p>
              <button
                type="button"
                onClick={() => {
                  setDeployHistorySearch('');
                  setDeployHistoryFilter('ALL');
                }}
                className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] text-slate-300 transition cursor-pointer"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            filteredDeployHistory.map((entry) => {
              const isExpanded = expandedErrorId === entry.id;
              const isCopied = copiedDeployCoordKey === entry.id;
              const mvnCoords = entry.groupId && entry.artifactId && entry.version
                ? `mvn:${entry.groupId}/${entry.artifactId}/${entry.version}`
                : entry.featureInstall;

              return (
                <div
                  key={entry.id}
                  className={`p-3.5 rounded-xl border transition-all duration-200 ${
                    entry.success
                      ? 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                      : 'border-rose-900/40 bg-rose-950/15 hover:border-rose-800/60 hover:bg-rose-950/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Status Pill */}
                      <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                        entry.success
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}>
                        {entry.success ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                      </div>

                      {/* Info Principal */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-100 truncate" title={entry.artifactId || entry.projectName || entry.featureInstall}>
                            {entry.artifactId || entry.projectName || entry.featureInstall}
                          </span>

                          {entry.version && (
                            <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded font-semibold">
                              v{entry.version}
                            </span>
                          )}

                          {/* Trigger Tag */}
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded flex items-center gap-1 border ${
                            entry.trigger === 'mcp'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          }`}>
                            {entry.trigger === 'mcp' ? (
                              <>
                                <Sparkles className="w-2.5 h-2.5" />
                                <span>MCP Agent</span>
                              </>
                            ) : (
                              <>
                                <Terminal className="w-2.5 h-2.5" />
                                <span>Console UI</span>
                              </>
                            )}
                          </span>

                          {/* Status Tag */}
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            entry.success
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {entry.success ? 'Sucesso' : 'Falha'}
                          </span>
                        </div>

                        {/* Coordenadas Maven / Feature */}
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <code className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80 truncate max-w-md select-all">
                            {mvnCoords}
                          </code>

                          {/* Botão Copiar Coordenadas */}
                          <button
                            type="button"
                            onClick={() => copyDeployCoord(mvnCoords, entry.id)}
                            className="p-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                            title="Copiar coordenadas Maven"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-semibold">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>

                          {/* Botão para abrir no Instalador */}
                          {onOpenInstallWithCoords && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenInstallWithCoords(mvnCoords, entry.version);
                              }}
                              className="p-1 px-1.5 rounded bg-slate-800/60 hover:bg-slate-800 text-sky-400 hover:text-sky-300 text-[10px] flex items-center gap-1 border border-slate-700/60 transition cursor-pointer"
                              title="Reutilizar coordenadas para novo deploy"
                            >
                              <UploadCloud className="w-3 h-3" />
                              <span>Usar no Instalador</span>
                            </button>
                          )}
                        </div>

                        {/* Mensagem de Erro Expandível */}
                        {!entry.success && entry.message && (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={() => setExpandedErrorId(isExpanded ? null : entry.id)}
                              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              <span>{isExpanded ? 'Ocultar diagnóstico da falha' : 'Ver diagnóstico detalhado da falha'}</span>
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-2.5 rounded-lg bg-black/60 border border-rose-900/60 text-[11px] font-mono text-rose-300 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                                {entry.message}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Metadados */}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(entry.startedAt).toLocaleString('pt-BR')}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3 text-slate-400" />
                            {(entry.durationMs / 1000).toFixed(2)}s duração
                          </span>
                          {entry.repoUrl && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]" title={entry.repoUrl}>
                                {entry.repoUrl}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-4 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Registros persistidos em <code className="text-slate-400">settings.karafDeployHistory</code> (máx: 200)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
