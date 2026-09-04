import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Play,
  Square,
  RotateCw,
  Trash2,
  Terminal,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Layers,
  Activity,
  HardDrive,
  RefreshCw,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { DockerContainerInfo, DockerDaemonStatus } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

export const ContainersPage: React.FC = () => {
  const [containers, setContainers] = useState<DockerContainerInfo[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<DockerDaemonStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<Record<string, 'start' | 'stop' | 'restart' | 'remove'>>({});

  // Modal de Logs
  const [selectedContainer, setSelectedContainer] = useState<DockerContainerInfo | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logLines, setLogLines] = useState<number>(200);
  const { copy: copyLogsToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  // Carregar Status do Docker e Containers
  const loadDockerData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const status = window.electronAPI.getDockerStatus
          ? await window.electronAPI.getDockerStatus()
          : { installed: true, running: true };
        setDaemonStatus(status);

        if (status.installed && status.running) {
          const list = window.electronAPI.listDockerContainers
            ? await window.electronAPI.listDockerContainers()
            : [];
          setContainers(list || []);
        } else {
          setContainers([]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar informações do Docker:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDockerData();
    const interval = setInterval(loadDockerData, 12000);
    return () => clearInterval(interval);
  }, [loadDockerData]);

  // Ações nos Containers
  const handleContainerAction = async (container: DockerContainerInfo, action: 'start' | 'stop' | 'restart' | 'remove') => {
    if (!window.electronAPI) return;

    if (action === 'remove' && !confirm(`Deseja realmente remover o container '${container.names || container.id}'?`)) {
      return;
    }

    setActionLoading((prev) => ({ ...prev, [container.id]: action }));
    try {
      if (action === 'start') {
        await window.electronAPI.startDockerContainer(container.id);
      } else if (action === 'stop') {
        await window.electronAPI.stopDockerContainer(container.id);
      } else if (action === 'restart') {
        await window.electronAPI.restartDockerContainer(container.id);
      } else if (action === 'remove') {
        await window.electronAPI.removeDockerContainer(container.id);
      }
      await loadDockerData();
    } catch (err: any) {
      alert(`Falha ao executar ação no container: ${err.message || err}`);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[container.id];
        return next;
      });
    }
  };

  // Abrir Logs
  const handleOpenLogs = async (container: DockerContainerInfo) => {
    setSelectedContainer(container);
    setIsLoadingLogs(true);
    try {
      if (window.electronAPI?.getDockerLogs) {
        const text = await window.electronAPI.getDockerLogs(container.id, logLines);
        setLogs(text || '(Nenhum log retornado)');
      }
    } catch (err: any) {
      setLogs(`Erro ao buscar logs: ${err.message || err}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Recarregar Logs com nova quantidade de linhas
  const handleRefreshLogs = async () => {
    if (!selectedContainer || !window.electronAPI?.getDockerLogs) return;
    setIsLoadingLogs(true);
    try {
      const text = await window.electronAPI.getDockerLogs(selectedContainer.id, logLines);
      setLogs(text || '(Nenhum log retornado)');
    } catch (err: any) {
      setLogs(`Erro ao atualizar logs: ${err.message || err}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Copiar Logs
  const handleCopyLogs = () => copyLogsToClipboard(logs, 'Logs copiados!');

  // Filtro
  const filteredContainers = useMemo(() => {
    if (!filter) return containers;
    const lower = filter.toLowerCase();
    return containers.filter(
      (c) =>
        c.names.toLowerCase().includes(lower) ||
        c.image.toLowerCase().includes(lower) ||
        c.id.toLowerCase().includes(lower) ||
        c.ports.toLowerCase().includes(lower)
    );
  }, [containers, filter]);

  // Estatísticas
  const runningCount = useMemo(() => containers.filter((c) => c.state === 'running').length, [containers]);
  const stoppedCount = useMemo(() => containers.filter((c) => c.state !== 'running').length, [containers]);

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'running':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            <span>RODANDO</span>
          </span>
        );
      case 'exited':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/80">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
            <span>PARADO</span>
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
            <span>PAUSADO</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/80">
            <span>{state.toUpperCase()}</span>
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden select-none">
      {/* Topo / Header da Página */}
      <header className="p-3 bg-card/70 border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-foreground">Gerenciador de Containers Docker</h2>
              {daemonStatus && (
                daemonStatus.running ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" /> Docker Ativo
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3" /> Docker Inativo
                  </span>
                )
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Controle local de containers, portas mapeadas e inspeção de logs
            </p>
          </div>
        </div>

        {/* Contadores e Busca */}
        <div className="flex items-center space-x-3">
          {/* Badges de Contagem */}
          <div className="flex items-center space-x-1.5 text-xs">
            <span className="px-2.5 py-1 bg-card border border-border rounded-lg text-muted-foreground shadow-2xs">
              Total: <strong className="text-foreground">{containers.length}</strong>
            </span>
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-700 dark:text-emerald-400 font-medium shadow-2xs">
              Rodando: <strong className="font-bold">{runningCount}</strong>
            </span>
            <span className="px-2.5 py-1 bg-card border border-border rounded-lg text-muted-foreground shadow-2xs">
              Parados: <strong className="text-foreground">{stoppedCount}</strong>
            </span>
          </div>

          {/* Campo de Busca */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por nome, imagem..."
              className="bg-card border border-border rounded-lg pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48 transition"
            />
          </div>

          {/* Botão Atualizar */}
          <button
            onClick={loadDockerData}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* Alerta caso Docker não esteja rodando */}
      {daemonStatus && !daemonStatus.running && (
        <div className="p-3 m-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {daemonStatus.error || 'O Docker Daemon não está respondendo. Inicie o Docker Desktop ou verifique o serviço.'}
            </span>
          </div>
          <button
            onClick={loadDockerData}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/40 rounded-lg font-semibold transition cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Lista de Containers */}
      <div className="flex-1 overflow-auto p-3">
        {filteredContainers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs space-y-2">
            <Box className="w-10 h-10 opacity-30" />
            <p className="text-sm font-semibold text-foreground">Nenhum container encontrado</p>
            <p className="text-muted-foreground max-w-sm text-center">
              {containers.length === 0
                ? 'Certifique-se de que o Docker está instalado e você possui containers criados ou use docker run / docker compose up.'
                : 'Nenhum container corresponde ao filtro informado.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredContainers.map((container) => {
              const isLoadingAction = actionLoading[container.id];
              const isRunning = container.state === 'running';

              return (
                <div
                  key={container.id}
                  className="bg-card border border-border/80 hover:border-border rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 shadow-2xs"
                >
                  {/* Informações do Container */}
                  <div className="flex items-start space-x-3 truncate flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        isRunning
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted border-border text-muted-foreground'
                      }`}
                    >
                      <Box className="w-5 h-5" />
                    </div>

                    <div className="flex flex-col truncate min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-foreground text-xs truncate">
                          {container.names.replace(/^\//, '')}
                        </span>
                        {getStateBadge(container.state)}
                        <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded border border-border/40">
                          {container.id.slice(0, 12)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-[11px] text-muted-foreground mt-1 truncate">
                        <span className="truncate font-mono">
                          <strong className="font-sans text-foreground/80">Imagem:</strong> {container.image}
                        </span>
                        {container.ports && (
                          <span className="truncate font-mono text-sky-600 dark:text-sky-400 hidden md:inline">
                            <strong className="font-sans text-muted-foreground">Portas:</strong> {container.ports}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/80 hidden lg:inline">
                          {container.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isRunning ? (
                      <>
                        <button
                          onClick={() => handleContainerAction(container, 'stop')}
                          disabled={Boolean(isLoadingAction)}
                          title="Parar Container"
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>Parar</span>
                        </button>
                        <button
                          onClick={() => handleContainerAction(container, 'restart')}
                          disabled={Boolean(isLoadingAction)}
                          title="Reiniciar Container"
                          className="p-1.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded-lg transition disabled:opacity-50 cursor-pointer"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isLoadingAction === 'restart' ? 'animate-spin text-primary' : ''}`} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleContainerAction(container, 'start')}
                        disabled={Boolean(isLoadingAction)}
                        title="Iniciar Container"
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Iniciar</span>
                      </button>
                    )}

                    {/* Ver Logs */}
                    <button
                      onClick={() => handleOpenLogs(container)}
                      title="Inspecionar Logs"
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5 text-primary" />
                      <span>Logs</span>
                    </button>

                    {/* Remover Container */}
                    <button
                      onClick={() => handleContainerAction(container, 'remove')}
                      disabled={Boolean(isLoadingAction)}
                      title="Remover Container"
                      className="p-1.5 hover:text-rose-600 dark:hover:text-rose-400 text-muted-foreground rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Logs do Container */}
      {selectedContainer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Header do Modal */}
            <div className="p-3 bg-card border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground">
                  Logs: <span className="font-mono text-primary">{selectedContainer.names.replace(/^\//, '')}</span>
                </h3>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.2 rounded border border-border/40">
                  {selectedContainer.id.slice(0, 12)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Quantidade de Linhas */}
                <select
                  value={logLines}
                  onChange={(e) => setLogLines(Number(e.target.value))}
                  className="bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none"
                >
                  <option value={100}>100 linhas</option>
                  <option value={200}>200 linhas</option>
                  <option value={500}>500 linhas</option>
                  <option value={1000}>1000 linhas</option>
                </select>

                <button
                  onClick={handleRefreshLogs}
                  disabled={isLoadingLogs}
                  title="Atualizar Logs"
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/60 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin text-primary' : ''}`} />
                </button>

                <button
                  onClick={handleCopyLogs}
                  title="Copiar logs para a área de transferência"
                  className="flex items-center space-x-1 px-2.5 py-1 bg-card text-muted-foreground hover:text-foreground rounded-lg border border-border text-xs transition cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copyFeedback || 'Copiar'}</span>
                </button>

                <button
                  onClick={() => setSelectedContainer(null)}
                  className="text-muted-foreground hover:text-foreground font-bold p-1 text-xs rounded-lg hover:bg-muted cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Conteúdo dos Logs */}
            <div className="flex-1 bg-[#0B0F17] p-3 overflow-auto font-mono text-[11px] text-zinc-200 select-text whitespace-pre-wrap leading-relaxed [scrollbar-width:thin]">
              {isLoadingLogs ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs space-x-2">
                  <RotateCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Carregando logs do container...</span>
                </div>
              ) : (
                logs
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
