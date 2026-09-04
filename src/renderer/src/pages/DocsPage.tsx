import React, { useEffect, useState } from 'react';
import {
  FileSearch,
  Search,
  RefreshCw,
  FolderOpen,
  FileText,
  Settings,
  X,
  Download
} from 'lucide-react';
import { DocSearchResult, DocsIndexProgress, DocsIndexStatus } from '../../../shared/types';

interface DocsPageProps {
  onNavigateToSettings?: () => void;
}

const PHASE_LABELS: Record<DocsIndexProgress['phase'], string> = {
  'loading-model': 'Carregando modelo de IA (pode baixar na primeira vez)...',
  scanning: 'Descobrindo projetos e arquivos de documentação...',
  embedding: 'Processando documentos...',
  saving: 'Salvando índice...',
  done: 'Indexação concluída.'
};

export const DocsPage: React.FC<DocsPageProps> = ({ onNavigateToSettings }) => {
  const [status, setStatus] = useState<DocsIndexStatus | null>(null);
  const [query, setQuery] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('TODOS');
  const [results, setResults] = useState<DocSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [progress, setProgress] = useState<DocsIndexProgress | null>(null);

  const loadStatus = async () => {
    if (window.electronAPI) {
      setStatus(await window.electronAPI.getDocsIndexStatus());
    }
  };

  useEffect(() => {
    loadStatus();
    if (window.electronAPI?.onDocsIndexProgress) {
      return window.electronAPI.onDocsIndexProgress(setProgress);
    }
    return undefined;
  }, []);

  const handleReindex = async () => {
    if (!window.electronAPI) return;
    setIsIndexing(true);
    setProgress(null);
    try {
      const updated = await window.electronAPI.reindexDocs();
      setStatus(updated);
    } finally {
      setIsIndexing(false);
      setProgress(null);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!window.electronAPI || !query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const options = projectFilter !== 'TODOS' ? { projectName: projectFilter } : undefined;
      const data = await window.electronAPI.searchDocs(query.trim(), options);
      setResults(data);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenFile = (filePath: string) => {
    window.electronAPI?.openDocFile(filePath);
  };

  const hasIndex = !!status && status.totalChunks > 0;

  return (
    <div className="h-full flex flex-col p-5 space-y-4 overflow-hidden">
      {/* Topo / Indexação */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Documentação
                {hasIndex && (
                  <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    {status.totalChunks} trechos · {status.totalFiles} arquivos · {status.totalProjects} projetos
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Busca semântica local (RAG) sobre o README e /docs dos projetos configurados.
              </p>
            </div>
          </div>

          <button
            onClick={handleReindex}
            disabled={isIndexing}
            className="px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0 disabled:opacity-60"
            title="Escanear projetos e (re)gerar o índice de busca"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? 'animate-spin' : ''}`} />
            <span>{isIndexing ? 'Indexando...' : hasIndex ? 'Reindexar' : 'Indexar Documentação'}</span>
          </button>
        </div>

        {!status?.modelDownloaded && (
          <div className="mt-3 pt-3 border-t border-border/60 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
            <Download className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Na primeira indexação, o modelo de embeddings (local, roda offline depois) é baixado da internet —
              tamanho de dezenas de MB. Indexações seguintes não precisam baixar de novo.
            </span>
          </div>
        )}

        {isIndexing && progress && (
          <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{PHASE_LABELS[progress.phase]}</span>
              {progress.total > 0 && (
                <span className="font-mono">
                  {progress.current}/{progress.total}
                </span>
              )}
            </div>
            {progress.total > 0 && (
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (progress.current / progress.total) * 100)}%` }}
                />
              </div>
            )}
            {progress.currentFile && (
              <p className="text-[10px] text-muted-foreground font-mono truncate">{progress.currentFile}</p>
            )}
          </div>
        )}
      </div>

      {/* Barra de Busca */}
      <div className="cockpit-panel rounded-2xl p-4 shadow-xl border border-border shrink-0">
        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Pergunte algo sobre a documentação dos projetos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-9 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {status && status.projectNames.length > 0 && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono"
            >
              <option value="TODOS">Todos os projetos</option>
              {status.projectNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={isSearching || !query.trim() || !hasIndex}
            className="px-4 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors disabled:opacity-50"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </div>

      {/* Resultados */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
        {!hasIndex && !isIndexing && (
          <div className="cockpit-panel rounded-2xl p-10 text-center flex flex-col items-center justify-center space-y-3 border border-border">
            <FolderOpen className="w-10 h-10 text-primary/50" />
            <div>
              <h4 className="text-sm font-bold text-foreground">Nenhum índice de documentação ainda</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Clique em "Indexar Documentação" pra escanear os projetos configurados em busca de README e arquivos
                de doc.
              </p>
            </div>
            {onNavigateToSettings && (
              <button
                type="button"
                onClick={onNavigateToSettings}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-primary/20"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar Pasta de Projetos</span>
              </button>
            )}
          </div>
        )}

        {hasIndex && hasSearched && !isSearching && results.length === 0 && (
          <div className="cockpit-panel rounded-2xl p-8 text-center border border-border">
            <p className="text-xs text-muted-foreground">Nenhum resultado encontrado pra essa busca.</p>
          </div>
        )}

        {results.map((result) => (
          <div
            key={result.chunk.id}
            className="cockpit-card rounded-2xl p-4 border border-border shadow-sm space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/80 shrink-0">
                  {result.chunk.projectName}
                </span>
                <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  {result.chunk.filePath.split(/[\\/]/).pop()}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {(result.score * 100).toFixed(0)}% relevante
                </span>
                <button
                  onClick={() => handleOpenFile(result.chunk.filePath)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Abrir localização do arquivo"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-6">
              {result.chunk.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
