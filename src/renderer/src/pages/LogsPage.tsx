import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ScrollText,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Search,
  Copy,
  Check,
  Download,
  Plus,
  Settings,
  AlertTriangle,
  FolderOpen,
  ArrowDown,
  WrapText,
  X,
  ChevronUp,
  ChevronDown,
  Clock,
  HardDrive,
  Sparkles,
  SlidersHorizontal,
  Lock,
  Unlock,
  Layers
} from 'lucide-react';
import { RealtimeLogSource, LogWatchStatus, LogChunkEvent, AppSettings } from '../../../shared/types';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { LOGS_TOUR_STEPS, LOGS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/logsTour';

interface LogsPageProps {
  onNavigateToSettings?: () => void;
  isActive?: boolean;
  settingsVersion?: number;
}

const DEFAULT_SOURCES: RealtimeLogSource[] = [];

const EMPTY_SOURCE: RealtimeLogSource = {
  id: '',
  name: '',
  filePath: '',
  encoding: 'utf-8',
  enabled: false
};

type LogLevelFilter = 'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export const LogsPage: React.FC<LogsPageProps> = ({ onNavigateToSettings, isActive, settingsVersion }) => {
  const tour = usePageTour(LOGS_TOUR_STORAGE_KEY);
  const [sources, setSources] = useState<RealtimeLogSource[]>(DEFAULT_SOURCES);
  const [activeSourceId, setActiveSourceId] = useState<string>('');
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<LogWatchStatus | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(true);
  const [hasNewLinesBelow, setHasNewLinesBelow] = useState<boolean>(false);
  const [initialLinesCount, setInitialLinesCount] = useState<number>(500);
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'xs' | 'sm' | 'base'>('xs');
  const [filterText, setFilterText] = useState<string>('');
  const [isRegex, setIsRegex] = useState<boolean>(false);
  const [isCaseSensitive, setIsCaseSensitive] = useState<boolean>(false);
  const [invertFilter, setInvertFilter] = useState<boolean>(false);
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>('ALL');
  const [activeErrorIndex, setActiveErrorIndex] = useState<number>(-1);

  // Modais
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isClearFileConfirmOpen, setIsClearFileConfirmOpen] = useState<boolean>(false);
  const [editingSource, setEditingSource] = useState<Partial<RealtimeLogSource> | null>(null);

  const { copy: copyToClipboard, copiedKey: copyFeedback } = useCopyToClipboard(1800);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isAutoScrollingRef = useRef<boolean>(false);

  // Fonte ativa atual
  const activeSource = useMemo(() => {
    return sources.find((s) => s.id === activeSourceId) || sources[0] || EMPTY_SOURCE;
  }, [sources, activeSourceId]);

  // Carregar fontes salvas em AppSettings
  const loadSavedSources = useCallback(async () => {
    if (!window.electronAPI?.getSettings) return;
    try {
      const settings: AppSettings = await window.electronAPI.getSettings();
      if (Array.isArray(settings.realtimeLogSources) && settings.realtimeLogSources.length > 0) {
        setSources(settings.realtimeLogSources);
        if (settings.activeLogSourceId && settings.realtimeLogSources.some((s) => s.id === settings.activeLogSourceId)) {
          setActiveSourceId(settings.activeLogSourceId);
        } else {
          setActiveSourceId(settings.realtimeLogSources[0].id);
        }
      }
    } catch (err) {
      console.warn('[LogsPage] Erro ao carregar fontes salvas:', err);
    }
  }, []);

  useEffect(() => {
    loadSavedSources();
  }, [loadSavedSources, settingsVersion]);

  // Salvar fontes atualizadas nas configurações
  const persistSources = useCallback(
    async (newSources: RealtimeLogSource[], newActiveId?: string) => {
      setSources(newSources);
      if (newActiveId) setActiveSourceId(newActiveId);

      if (window.electronAPI?.saveSettings) {
        try {
          await window.electronAPI.saveSettings({
            realtimeLogSources: newSources,
            activeLogSourceId: newActiveId || activeSourceId
          });
        } catch (err) {
          console.error('[LogsPage] Falha ao salvar fontes de log:', err);
        }
      }
    },
    [activeSourceId]
  );

  // Iniciar observação da fonte ativa
  const startWatchingActiveSource = useCallback(async () => {
    if (!activeSource.filePath || !window.electronAPI?.startLogWatch) return;

    setLines([]);
    setHasNewLinesBelow(false);
    setActiveErrorIndex(-1);

    try {
      const result = await window.electronAPI.startLogWatch(
        activeSource.id,
        activeSource.filePath,
        initialLinesCount,
        activeSource.encoding || 'utf-8'
      );

      setStatus(result.status);
      setLines(result.initialLines || []);

      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 80);
    } catch (err: any) {
      console.error('[LogsPage] Falha ao iniciar watch do arquivo:', err);
      setStatus({
        sourceId: activeSource.id,
        filePath: activeSource.filePath,
        exists: false,
        fileSizeBytes: 0,
        watching: false,
        error: err.message
      });
    }
  }, [activeSource, initialLinesCount]);

  useEffect(() => {
    startWatchingActiveSource();

    return () => {
      if (window.electronAPI?.stopLogWatch && activeSource.filePath) {
        window.electronAPI.stopLogWatch(activeSource.id);
      }
    };
  }, [startWatchingActiveSource]);

  // Checagem periódica do status do arquivo
  useEffect(() => {
    if (!window.electronAPI?.checkLogFile || !activeSource.filePath || isActive === false) return;

    const interval = setInterval(async () => {
      try {
        const currentStatus = await window.electronAPI.checkLogFile(activeSource.filePath, activeSource.id);
        setStatus((prev) => {
          if (!prev) return currentStatus;
          if (
            prev.exists !== currentStatus.exists ||
            prev.fileSizeBytes !== currentStatus.fileSizeBytes ||
            prev.lastModified !== currentStatus.lastModified
          ) {
            return currentStatus;
          }
          return prev;
        });
      } catch {
        // Silencioso
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeSource, isActive]);

  // Ouvir novos chunks de log emitidos pelo backend
  useEffect(() => {
    if (!window.electronAPI?.onLogChunk) return;

    const unsubscribe = window.electronAPI.onLogChunk((chunkEvent: LogChunkEvent) => {
      if (chunkEvent.sourceId !== activeSource.id) return;

      if (chunkEvent.truncatedOrRotated) {
        setLines(['--- [ARQUIVO ROTACIONADO OU TRUNCADO] ---']);
        return;
      }

      setLines((prev) => {
        const next = [...prev, ...chunkEvent.lines];
        return next.length > 5000 ? next.slice(next.length - 5000) : next;
      });

      if (!isPaused && isAutoScroll) {
        isAutoScrollingRef.current = true;
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        });
      } else {
        setHasNewLinesBelow(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeSource.id, isPaused, isAutoScroll]);

  // Atalhos de teclado locais (Ctrl+F, Esc, Ctrl+L) - ativos apenas na aba Logs
  useEffect(() => {
    if (isActive === false) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setFilterText('');
        searchInputRef.current?.blur();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setLines([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  // Detectar rolagem manual do usuário
  const handleScroll = () => {
    if (isAutoScrollingRef.current) {
      isAutoScrollingRef.current = false;
      return;
    }

    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 40;

    if (isAtBottom) {
      setIsAutoScroll(true);
      setHasNewLinesBelow(false);
    } else {
      setIsAutoScroll(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      isAutoScrollingRef.current = true;
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      setIsAutoScroll(true);
      setHasNewLinesBelow(false);
    }
  };

  // Zerar arquivo no disco
  const handleConfirmClearFile = async () => {
    if (!window.electronAPI?.clearLogFile || !activeSource.filePath) return;
    setIsClearFileConfirmOpen(false);

    try {
      const success = await window.electronAPI.clearLogFile(activeSource.filePath);
      if (success) {
        setLines(['--- [ARQUIVO LIMPO NO DISCO PELO DEV MANAGER] ---']);
        if (window.electronAPI.checkLogFile) {
          const updated = await window.electronAPI.checkLogFile(activeSource.filePath, activeSource.id);
          setStatus(updated);
        }
      }
    } catch (err) {
      console.error('[LogsPage] Erro ao limpar arquivo:', err);
    }
  };

  // Filtragem e busca de linhas
  const filteredLines = useMemo(() => {
    let result = lines;

    if (levelFilter !== 'ALL') {
      result = result.filter((line) => {
        const upper = line.toUpperCase();
        if (levelFilter === 'ERROR') {
          return upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('EXCEPTION') || upper.includes('CAUSED BY:');
        }
        if (levelFilter === 'WARN') {
          return upper.includes('WARN') || upper.includes('WARNING');
        }
        if (levelFilter === 'INFO') {
          return upper.includes('INFO');
        }
        if (levelFilter === 'DEBUG') {
          return upper.includes('DEBUG') || upper.includes('TRACE');
        }
        return true;
      });
    }

    if (filterText.trim()) {
      const query = filterText.trim();
      let testFn: (line: string) => boolean;

      if (isRegex) {
        try {
          const reg = new RegExp(query, isCaseSensitive ? '' : 'i');
          testFn = (line) => reg.test(line);
        } catch {
          testFn = () => true;
        }
      } else {
        testFn = (line) => {
          if (isCaseSensitive) return line.includes(query);
          return line.toLowerCase().includes(query.toLowerCase());
        };
      }

      result = result.filter((line) => (invertFilter ? !testFn(line) : testFn(line)));
    }

    return result;
  }, [lines, levelFilter, filterText, isRegex, isCaseSensitive, invertFilter]);

  // Lista de índices de erros para navegação rápida
  const errorIndices = useMemo(() => {
    const indices: number[] = [];
    filteredLines.forEach((line, idx) => {
      const upper = line.toUpperCase();
      if (upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('EXCEPTION')) {
        indices.push(idx);
      }
    });
    return indices;
  }, [filteredLines]);

  // Navegar para o próximo ou anterior erro
  const navigateErrors = (direction: 'next' | 'prev') => {
    if (errorIndices.length === 0) return;

    let nextTarget = -1;
    if (direction === 'next') {
      const found = errorIndices.find((idx) => idx > activeErrorIndex);
      nextTarget = found !== undefined ? found : errorIndices[0];
    } else {
      const reversed = [...errorIndices].reverse();
      const found = reversed.find((idx) => idx < activeErrorIndex);
      nextTarget = found !== undefined ? found : errorIndices[errorIndices.length - 1];
    }

    setActiveErrorIndex(nextTarget);

    // Rola para a linha de erro selecionada
    const el = document.getElementById(`log-line-${nextTarget}`);
    if (el) {
      isAutoScrollingRef.current = true;
      setIsAutoScroll(false);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Contagem de níveis
  const levelCounts = useMemo(() => {
    let errorCount = 0;
    let warnCount = 0;
    let infoCount = 0;
    let debugCount = 0;

    for (const l of lines) {
      const upper = l.toUpperCase();
      if (upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('EXCEPTION')) errorCount++;
      else if (upper.includes('WARN')) warnCount++;
      else if (upper.includes('INFO')) infoCount++;
      else if (upper.includes('DEBUG') || upper.includes('TRACE')) debugCount++;
    }

    return { errorCount, warnCount, infoCount, debugCount };
  }, [lines]);

  // Exportar / Baixar log exibido
  const handleExportLogs = () => {
    const content = filteredLines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSource.id}-log-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Selecionar arquivo de log via diálogo nativo
  const handleBrowseLogFile = async () => {
    if (!window.electronAPI?.selectFile) return;
    try {
      const selected = await window.electronAPI.selectFile({
        filters: [
          { name: 'Arquivos de Log (*.log, *.out, *.txt)', extensions: ['log', 'out', 'txt'] },
          { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
        ]
      });
      if (selected && editingSource) {
        setEditingSource((prev) => ({
          ...prev,
          filePath: selected,
          name: prev?.name || selected.split(/[\\/]/).pop()?.replace(/\.(log|out|txt)$/i, '') || 'Novo Log'
        }));
      }
    } catch (err) {
      console.error('Erro ao selecionar arquivo:', err);
    }
  };

  // Formatação amigável de tamanho de arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Renderização estruturada e elegante de cada linha de log
  const renderLogLine = (line: string, index: number) => {
    const upper = line.toUpperCase();
    const isError = upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('EXCEPTION');
    const isWarn = !isError && (upper.includes('WARN') || upper.includes('WARNING'));
    const isInfo = !isError && !isWarn && upper.includes('INFO');
    const isDebug = !isError && !isWarn && !isInfo && (upper.includes('DEBUG') || upper.includes('TRACE'));
    const isStackTrace = line.trimStart().startsWith('at ') || line.trimStart().startsWith('... ') || line.trimStart().startsWith('Caused by:');
    const isSystemNotice = line.startsWith('--- [');
    const isTargetedError = index === activeErrorIndex;

    let rowBg = 'hover:bg-slate-800/30';
    let textClass = 'text-slate-300';
    let badge = null;

    if (isTargetedError) {
      rowBg = 'bg-rose-950/60 ring-1 ring-rose-500 shadow-inner';
    } else if (isError) {
      rowBg = 'bg-rose-950/15 hover:bg-rose-950/25';
      textClass = 'text-rose-300 font-medium';
      badge = (
        <span className="text-[9px] font-black font-mono tracking-wider px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase shrink-0 mr-2 select-none">
          ERR
        </span>
      );
    } else if (isWarn) {
      rowBg = 'bg-amber-950/10 hover:bg-amber-950/20';
      textClass = 'text-amber-300';
      badge = (
        <span className="text-[9px] font-bold font-mono tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase shrink-0 mr-2 select-none">
          WRN
        </span>
      );
    } else if (isInfo && !isStackTrace) {
      textClass = 'text-sky-200/90';
      badge = (
        <span className="text-[9px] font-semibold font-mono tracking-wider px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase shrink-0 mr-2 select-none">
          INF
        </span>
      );
    } else if (isDebug) {
      textClass = 'text-slate-400';
    } else if (isSystemNotice) {
      textClass = 'text-yellow-400 font-bold';
      rowBg = 'bg-yellow-950/25';
    }

    // Realce do termo pesquisado
    let contentNode: React.ReactNode = line;
    if (filterText.trim() && !invertFilter) {
      const q = filterText.trim();
      const parts = line.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, isCaseSensitive ? 'g' : 'gi'));
      if (parts.length > 1) {
        contentNode = parts.map((part, pIdx) => {
          const matches = isCaseSensitive ? part === q : part.toLowerCase() === q.toLowerCase();
          if (matches) {
            return (
              <mark key={pIdx} className="bg-amber-400 text-slate-950 px-1 py-0.2 rounded-xs font-bold not-italic shadow-xs">
                {part}
              </mark>
            );
          }
          return part;
        });
      }
    }

    const fontClasses =
      fontSize === 'xs'
        ? 'text-[11px] leading-[19px]'
        : fontSize === 'sm'
        ? 'text-xs leading-[22px]'
        : 'text-sm leading-[26px]';

    return (
      <div
        id={`log-line-${index}`}
        key={index}
        className={`flex items-start px-3 py-0.5 font-mono ${fontClasses} ${rowBg} transition-colors select-text group ${
          isStackTrace ? 'pl-8 border-l-2 border-slate-700/50' : ''
        }`}
      >
        <span className="w-12 shrink-0 text-slate-600 select-none text-right pr-3 font-mono text-[10px] group-hover:text-slate-400">
          {index + 1}
        </span>

        <div className="flex-1 flex items-baseline flex-wrap">
          {badge}
          <span className={`${textClass} ${wordWrap ? 'break-all whitespace-pre-wrap' : 'whitespace-pre'}`}>
            {contentNode}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden text-foreground">
      {/* ============================================================ */}
      {/* COCKPIT HEADER UNIFICADO (Alta Densidade de Informação) */}
      {/* ============================================================ */}
      <div className="bg-card/95 border-b border-border/80 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-10 backdrop-blur-xs">
        {/* Esquerda: Seletor de Fontes em Pílulas */}
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary shrink-0" title="Logs em Tempo Real (Tail -f)">
            <ScrollText className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-1 bg-muted/60 p-0.5 rounded-xl border border-border/60">
            {sources.map((src) => {
              const isActive = src.id === activeSourceId;
              return (
                <button
                  key={src.id}
                  data-tour="selecionar-fonte-log"
                  onClick={() => setActiveSourceId(src.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    isActive
                      ? 'bg-card text-foreground shadow-xs font-bold border border-border'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                  title={src.filePath}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive && status?.exists ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{src.name}</span>
                </button>
              );
            })}
          </div>

          <button
            data-tour="gerenciar-fontes"
            onClick={() => {
              setEditingSource(null);
              setIsManageModalOpen(true);
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/50 transition-colors"
            title="Gerenciar Fontes de Log"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={tour.open}
            className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted border border-border/50 transition-colors"
            title="Rever o tour guiado desta página"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Centro: Telemetria do Arquivo Ativo */}
        {sources.length > 0 && (
        <div className="hidden lg:flex items-center space-x-3 text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-1 rounded-xl border border-border/50">
          <div className="flex items-center space-x-1.5 max-w-sm xl:max-w-md truncate">
            <span className="truncate text-slate-300 text-[11px]" title={activeSource.filePath}>
              {activeSource.filePath}
            </span>
            <button
              onClick={() => copyToClipboard(activeSource.filePath, 'path')}
              className="p-1 text-muted-foreground hover:text-foreground rounded shrink-0 transition-colors"
              title="Copiar caminho completo do arquivo"
            >
              {copyFeedback === 'path' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {status && status.exists && (
            <div className="flex items-center space-x-2.5 text-[11px] border-l border-border/60 pl-2.5 shrink-0">
              <span className="text-slate-300 font-bold flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-primary" />
                {formatFileSize(status.fileSizeBytes)}
              </span>
              {status.lastModified && (
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(status.lastModified).toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          )}
        </div>
        )}

        {/* Direita: Status da Conexão e Ações Críticas */}
        <div className="flex items-center space-x-2" data-tour="status-conexao-live">
          {status?.exists ? (
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-colors ${
                isPaused
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                }`}
              />
              <span>{isPaused ? 'STREAM PAUSADO' : 'LIVE TAIL'}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-3 h-3" />
              <span>{sources.length > 0 ? 'ARQUIVO AUSENTE' : 'NENHUMA FONTE'}</span>
            </div>
          )}

          {sources.length > 0 && (
            <button
              onClick={() => setIsClearFileConfirmOpen(true)}
              className="px-2 py-1 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-lg hover:bg-rose-500/10 border border-border/60 hover:border-rose-500/30 transition-colors flex items-center space-x-1"
              title="Zerar o arquivo no disco (ação destrutiva para novos testes)"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Zerar no Disco</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BARRA DE FERRAMENTAS E FILTROS DE PRECISÃO */}
      {/* ============================================================ */}
      <div className="bg-card/75 border-b border-border/70 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs select-none">
        {/* Busca com Controles Inline */}
        <div className="flex items-center space-x-1.5 flex-1 min-w-[260px] max-w-sm">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              data-tour="campo-busca-logs"
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Buscar (Ctrl+F)..."
              className="w-full pl-8 pr-7 py-1 bg-background border border-border/80 rounded-lg text-xs font-mono focus:outline-none focus:border-primary transition-colors"
            />
            {filterText && (
              <button
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-[10px] font-mono">
            <button
              onClick={() => setIsCaseSensitive((prev) => !prev)}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                isCaseSensitive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Diferenciar Maiúsculas / Minúsculas"
            >
              Aa
            </button>
            <button
              onClick={() => setIsRegex((prev) => !prev)}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                isRegex ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Expressão Regular (Regex)"
            >
              .*
            </button>
            <button
              onClick={() => setInvertFilter((prev) => !prev)}
              className={`px-1.5 py-0.5 rounded font-bold transition-colors ${
                invertFilter ? 'bg-amber-500 text-black' : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Inverter Filtro (Excluir correspondências)"
            >
              !
            </button>
          </div>
        </div>

        {/* Níveis de Severidade com Contadores */}
        <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 text-[11px] font-medium" data-tour="filtro-severidade">
          <button
            onClick={() => setLevelFilter('ALL')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              levelFilter === 'ALL' ? 'bg-card text-foreground font-bold shadow-xs' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos ({lines.length})
          </button>
          <button
            onClick={() => setLevelFilter('ERROR')}
            className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
              levelFilter === 'ERROR'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                : 'text-rose-400/80 hover:text-rose-300'
            }`}
          >
            ERROR {levelCounts.errorCount > 0 && <span className="font-mono">({levelCounts.errorCount})</span>}
          </button>
          <button
            onClick={() => setLevelFilter('WARN')}
            className={`px-2 py-0.5 rounded-md transition-colors flex items-center gap-1 ${
              levelFilter === 'WARN'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            WARN {levelCounts.warnCount > 0 && <span className="font-mono">({levelCounts.warnCount})</span>}
          </button>
          <button
            onClick={() => setLevelFilter('INFO')}
            className={`px-2 py-0.5 rounded-md transition-colors ${
              levelFilter === 'INFO'
                ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                : 'text-sky-400/80 hover:text-sky-300'
            }`}
          >
            INFO
          </button>
        </div>

        {/* Navegador Rápido de Erros (Signature Element) */}
        {errorIndices.length > 0 && (
          <div className="flex items-center space-x-1 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg text-rose-300 text-[11px] font-mono">
            <span className="font-bold mr-1">Erros: {errorIndices.length}</span>
            <button
              onClick={() => navigateErrors('prev')}
              className="p-0.5 hover:bg-rose-500/20 rounded transition-colors"
              title="Ir para o erro anterior"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigateErrors('next')}
              className="p-0.5 hover:bg-rose-500/20 rounded transition-colors"
              title="Ir para o próximo erro"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Controles do Console */}
        <div className="flex items-center space-x-1.5">
          {/* Pausar / Retomar */}
          <button
            onClick={() => setIsPaused((prev) => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 border transition-colors ${
              isPaused
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-muted/80 text-foreground border-border/80 hover:bg-muted'
            }`}
            title={isPaused ? 'Retomar transmissão ao vivo' : 'Pausar fluxo na tela'}
          >
            {isPaused ? <Play className="w-3 h-3 text-amber-400" /> : <Pause className="w-3 h-3 text-muted-foreground" />}
            <span className="hidden sm:inline">{isPaused ? 'Retomar' : 'Pausar'}</span>
          </button>

          {/* Auto-scroll Lock */}
          <button
            onClick={() => {
              if (!isAutoScroll) scrollToBottom();
              else setIsAutoScroll(false);
            }}
            className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 border transition-colors ${
              isAutoScroll
                ? 'bg-primary/15 text-primary border-primary/40 font-bold'
                : 'bg-muted/70 text-muted-foreground border-border/70 hover:text-foreground'
            }`}
            title={isAutoScroll ? 'Auto-scroll ativado (travar no final)' : 'Auto-scroll desativado (rolagem livre)'}
          >
            {isAutoScroll ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span className="hidden md:inline">Auto-scroll</span>
          </button>

          {/* Quebra de Linha (Wrap) */}
          <button
            onClick={() => setWordWrap((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-colors ${
              wordWrap
                ? 'bg-primary/15 text-primary border-primary/40'
                : 'bg-muted/70 text-muted-foreground border-border/70 hover:text-foreground'
            }`}
            title={wordWrap ? 'Desativar quebra de linhas (Wrap)' : 'Ativar quebra de linhas (Wrap)'}
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Limpar Tela */}
          <button
            onClick={() => setLines([])}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/50 transition-colors"
            title="Limpar tela atual (Ctrl+L)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Copiar Logs Filtrados */}
          <button
            data-tour="acoes-limpar-exportar"
            onClick={() => copyToClipboard(filteredLines.join('\n'), 'all')}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/50 transition-colors"
            title="Copiar linhas filtradas"
          >
            {copyFeedback === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Baixar TXT */}
          <button
            onClick={handleExportLogs}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-border/50 transition-colors"
            title="Exportar arquivo .txt com linhas filtradas"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CANVAS DO TERMINAL OBSIDIAN (Deep Black #05080E) */}
      {/* ============================================================ */}
      <div className="flex-1 relative bg-[#05080E] overflow-hidden flex flex-col">
        {/* Alerta Flutuante de Novos Logs */}
        {hasNewLinesBelow && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-6 z-20 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xl shadow-primary/30 flex items-center space-x-1.5 hover:scale-105 active:scale-95 transition-all animate-bounce"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Novos logs recebidos</span>
          </button>
        )}

        {/* Viewport de Linhas */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          data-tour="console-live-tail"
          className="flex-1 overflow-y-auto overflow-x-auto p-1.5 font-mono scroll-smooth select-text"
        >
          {filteredLines.length > 0 ? (
            <div className="min-w-full divide-y divide-slate-900/30">
              {filteredLines.map((line, idx) => renderLogLine(line, idx))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center select-none space-y-3">
              <ScrollText className="w-12 h-12 text-slate-800 stroke-[1.5]" />
              <div className="space-y-1.5 max-w-lg">
                <p className="text-sm font-semibold text-slate-400">Nenhum log para exibir no momento</p>
                {sources.length === 0 ? (
                  <div className="text-xs text-slate-400 leading-relaxed bg-muted/30 border border-border/50 p-3 rounded-xl">
                    Nenhuma fonte de log configurada.{' '}
                    <button
                      onClick={() => {
                        setEditingSource(null);
                        setIsManageModalOpen(true);
                      }}
                      className="text-primary underline font-semibold"
                    >
                      Cadastre um arquivo de log
                    </button>{' '}
                    para começar a acompanhar em tempo real.
                  </div>
                ) : status && !status.exists ? (
                  <div className="text-xs text-rose-400/90 leading-relaxed bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl">
                    O arquivo <code className="text-slate-200 font-mono font-bold">{activeSource.filePath}</code> não
                    foi encontrado. O Dev Manager está em escuta contínua e iniciará a transmissão assim que o serviço
                    gravar as primeiras saídas.
                  </div>
                ) : filterText || levelFilter !== 'ALL' ? (
                  <p className="text-xs text-slate-500">
                    Nenhum registro corresponde aos filtros selecionados. Tente limpar os critérios de busca.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Arquivo de log conectado e monitorado. Novas entradas de telemetria surgirão aqui em tempo real.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* TELEMETRY FOOTER (Barra de Diagnóstico e Configuração Rápida) */}
        {/* ============================================================ */}
        <div className="bg-[#080D18] border-t border-slate-800/80 px-3.5 py-1 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <span>
              Linhas: <strong className="text-slate-200">{filteredLines.length}</strong> / {lines.length}
            </span>
            {filterText && (
              <span className="text-amber-400 truncate max-w-xs">
                Filtro: &quot;{filterText}&quot; {invertFilter ? '(invertido)' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Tamanho da Fonte */}
            <div className="flex items-center space-x-1">
              <span>Fonte:</span>
              <button
                onClick={() => setFontSize('xs')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  fontSize === 'xs' ? 'bg-slate-700 text-white font-bold' : 'hover:text-white'
                }`}
              >
                P
              </button>
              <button
                onClick={() => setFontSize('sm')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  fontSize === 'sm' ? 'bg-slate-700 text-white font-bold' : 'hover:text-white'
                }`}
              >
                M
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  fontSize === 'base' ? 'bg-slate-700 text-white font-bold' : 'hover:text-white'
                }`}
              >
                G
              </button>
            </div>

            {/* Carga Inicial de Linhas */}
            <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
              <span>Buffer inicial:</span>
              <select
                value={initialLinesCount}
                onChange={(e) => setInitialLinesCount(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 text-[10px] focus:outline-none"
              >
                <option value={100}>100 linhas</option>
                <option value={300}>300 linhas</option>
                <option value={500}>500 linhas</option>
                <option value={1000}>1000 linhas</option>
                <option value={2000}>2000 linhas</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL DE GERENCIAMENTO DE FONTES DE LOG */}
      {/* ============================================================ */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-card border border-border/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ScrollText className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Gerenciar Fontes de Log</h3>
              </div>
              <button
                onClick={() => {
                  setIsManageModalOpen(false);
                  setEditingSource(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Formulário de Adicionar / Editar */}
              <div className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  {editingSource?.id ? 'Editar Fonte de Log' : 'Cadastrar Nova Fonte de Log'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nome de Exibição</label>
                    <input
                      type="text"
                      value={editingSource?.name || ''}
                      onChange={(e) => setEditingSource((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: API Backend, Serviço de Integração..."
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Codificação (Encoding)</label>
                    <select
                      value={editingSource?.encoding || 'utf-8'}
                      onChange={(e) => setEditingSource((prev) => ({ ...prev, encoding: e.target.value as any }))}
                      className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
                    >
                      <option value="utf-8">UTF-8 (Padrão)</option>
                      <option value="latin1">Latin1 / ISO-8859-1 (Delphi legada)</option>
                      <option value="windows-1252">Windows-1252 (ANSI)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Caminho do Arquivo de Log</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingSource?.filePath || ''}
                      onChange={(e) => setEditingSource((prev) => ({ ...prev, filePath: e.target.value }))}
                      placeholder="Ex: C:\meu-servico\logs\saida.log"
                      className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-xs font-mono focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={handleBrowseLogFile}
                      className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-colors"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Procurar...</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  {editingSource && (
                    <button
                      onClick={() => setEditingSource(null)}
                      className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!editingSource?.name || !editingSource?.filePath) return;
                      const newId = editingSource.id || `custom-log-${Date.now()}`;
                      const item: RealtimeLogSource = {
                        id: newId,
                        name: editingSource.name,
                        filePath: editingSource.filePath,
                        encoding: editingSource.encoding || 'utf-8',
                        enabled: true
                      };

                      let updated: RealtimeLogSource[];
                      if (editingSource.id) {
                        updated = sources.map((s) => (s.id === editingSource.id ? item : s));
                      } else {
                        updated = [...sources, item];
                      }
                      persistSources(updated, newId);
                      setEditingSource(null);
                    }}
                    disabled={!editingSource?.name || !editingSource?.filePath}
                    className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg text-xs disabled:opacity-50 transition-colors"
                  >
                    Salvar Fonte
                  </button>
                </div>
              </div>

              {/* Lista de Fontes Cadastradas */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fontes Configuradas</h4>
                <div className="space-y-2">
                  {sources.map((src) => (
                    <div
                      key={src.id}
                      className="bg-card border border-border/80 rounded-xl p-3 flex items-center justify-between hover:border-border transition-colors gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-xs text-foreground">{src.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                            {src.encoding || 'utf-8'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5" title={src.filePath}>
                          {src.filePath}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => setEditingSource(src)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                          title="Editar"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        {sources.length > 1 && (
                          <button
                            onClick={() => {
                              const updated = sources.filter((s) => s.id !== src.id);
                              persistSources(updated, updated[0].id);
                            }}
                            className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {sources.length > 0 && (
                <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground">
                  <button
                    onClick={() => {
                      if (confirm('Remover todas as fontes de log configuradas?')) {
                        persistSources([], '');
                      }
                    }}
                    className="hover:text-foreground text-[11px] underline"
                  >
                    Remover Todas as Fontes
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-border/70 flex justify-end bg-card">
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-xs transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DE CONFIRMAÇÃO PARA ZERAR ARQUIVO NO DISCO */}
      {/* ============================================================ */}
      {isClearFileConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-card border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">Limpar Arquivo no Disco?</h3>
                <span className="text-[11px] text-rose-400 font-mono">Ação destrutiva no sistema de arquivos</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Deseja realmente zerar o conteúdo do arquivo físico abaixo? O log será esvaziado para permitir testar
              uma nova execução do serviço do zero:
            </p>

            <div className="bg-background p-2.5 rounded-xl border border-border font-mono text-[11px] text-slate-300 break-all select-all">
              {activeSource.filePath}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsClearFileConfirmOpen(false)}
                className="px-4 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-lg text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClearFile}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Zerar Arquivo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <OnboardingTour
        steps={LOGS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={LOGS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};

export default LogsPage;
