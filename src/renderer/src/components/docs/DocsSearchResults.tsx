import React from 'react';
import { Search } from 'lucide-react';
import type { DocSearchResult, LlmProviderConfig } from '../../../../shared/types';
import { DocsAiAnswerCard } from './DocsAiAnswerCard';
import { DocsResultCard } from './DocsResultCard';

interface DocsSearchResultsProps {
  query: string;
  results: DocSearchResult[];
  isSearching: boolean;
  catalogCount: number;
  isAskingLlm: boolean;
  llmAnswer: string | null;
  llmError: string | null;
  llmSources: Array<{ title: string; path: string; score: number }>;
  activeLlmProvider: LlmProviderConfig | undefined;
  onAskLlm: (q?: string) => void;
  onClearSearch: () => void;
  onNavigateToSettings?: () => void;
  onOpenPreview: (filePath: string, title: string) => void;
  onOpenInEditor: (filePath: string) => void;
  onOpenInFolder: (filePath: string) => void;
}

export const DocsSearchResults: React.FC<DocsSearchResultsProps> = ({
  query,
  results,
  isSearching,
  catalogCount,
  isAskingLlm,
  llmAnswer,
  llmError,
  llmSources,
  activeLlmProvider,
  onAskLlm,
  onClearSearch,
  onNavigateToSettings,
  onOpenPreview,
  onOpenInEditor,
  onOpenInFolder
}) => (
  <div className="space-y-3" data-tour="search-results-list">
    <div className="flex items-center justify-between pb-1 px-1">
      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
        <Search className="w-3.5 h-3.5 text-primary" />
        Resultados para "{query.trim()}" ({results.length})
      </span>
      <button
        onClick={onClearSearch}
        className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
      >
        ← Ver todos os documentos ({catalogCount})
      </button>
    </div>

    {/* Card de Síntese RAG com IA (Copilot Técnico WinThor) */}
    {(isAskingLlm || llmAnswer || llmError) && (
      <DocsAiAnswerCard
        query={query}
        isAskingLlm={isAskingLlm}
        llmAnswer={llmAnswer}
        llmError={llmError}
        llmSources={llmSources}
        activeLlmProvider={activeLlmProvider}
        onAskLlm={onAskLlm}
        onNavigateToSettings={onNavigateToSettings}
        onOpenPreview={onOpenPreview}
      />
    )}

    {!isSearching && results.length === 0 && (
      <div className="cockpit-panel rounded-2xl p-8 text-center border border-border">
        <p className="text-xs text-muted-foreground">Nenhum resultado encontrado para essa busca.</p>
      </div>
    )}

    {results.map((result) => (
      <DocsResultCard
        key={result.chunk.id}
        result={result}
        onOpenPreview={onOpenPreview}
        onOpenInEditor={onOpenInEditor}
        onOpenInFolder={onOpenInFolder}
      />
    ))}
  </div>
);
