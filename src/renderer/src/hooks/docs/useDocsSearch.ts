import { useState } from 'react';
import type { DocSearchResult, LlmProviderConfig } from '../../../../shared/types';
import { ALL_SOURCES_FILTER } from '../../utils/docsPageUtils';

/** Busca semântica, síntese de IA (RAG) e prévia de documentos. */
export function useDocsSearch(activeLlmProvider: LlmProviderConfig | undefined) {
  const [query, setQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>(ALL_SOURCES_FILTER);
  const [results, setResults] = useState<DocSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const [previewFile, setPreviewFile] = useState<{ path: string; title: string } | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  const [isAskingLlm, setIsAskingLlm] = useState<boolean>(false);
  const [llmAnswer, setLlmAnswer] = useState<string | null>(null);
  const [llmSources, setLlmSources] = useState<Array<{ title: string; path: string; score: number }>>([]);
  const [llmError, setLlmError] = useState<string | null>(null);

  const handleAskLlm = async (q = query) => {
    if (!q.trim()) return;
    if (!activeLlmProvider || !activeLlmProvider.enabled) {
      setLlmError('Nenhum provedor de IA/LLM está ativo. Configure sua chave (BYOK) na aba IA & Modelos LLM das Configurações.');
      return;
    }
    const askFn = window.electronAPI?.askDocsWithAi;
    if (!askFn) return;
    setIsAskingLlm(true);
    setLlmError(null);
    setLlmAnswer(null);
    try {
      const res = await askFn({
        query: q.trim(),
        sourceLabel: sourceFilter !== ALL_SOURCES_FILTER ? sourceFilter : undefined,
        topK: 5
      });
      setLlmAnswer(res.answer);
      setLlmSources(res.sources || []);
    } catch (err: any) {
      setLlmError(err?.message || 'Falha ao consultar assistente de IA.');
    } finally {
      setIsAskingLlm(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!window.electronAPI || !query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    setLlmAnswer(null);
    setLlmError(null);
    try {
      const options = sourceFilter !== ALL_SOURCES_FILTER ? { sourceLabel: sourceFilter } : undefined;
      const data = await window.electronAPI.searchDocs(query.trim(), options);
      setResults(data);
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenInEditor = (filePath: string) => {
    window.electronAPI?.openDocFile(filePath, 'editor');
  };

  const handleOpenInFolder = (filePath: string) => {
    window.electronAPI?.openDocFile(filePath, 'folder');
  };

  const handleOpenPreview = async (filePath: string, title: string) => {
    setPreviewFile({ path: filePath, title });
    setIsLoadingPreview(true);
    setPreviewContent('');
    try {
      if (window.electronAPI?.readDocContent) {
        const text = await window.electronAPI.readDocContent(filePath);
        setPreviewContent(text || '(Arquivo vazio)');
      } else {
        setPreviewContent('(Visualizador não disponível no ambiente web)');
      }
    } catch (err: any) {
      setPreviewContent(`Erro ao ler arquivo: ${err?.message || err}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const clearSearch = () => {
    setHasSearched(false);
    setQuery('');
  };

  return {
    query,
    setQuery,
    sourceFilter,
    setSourceFilter,
    results,
    hasSearched,
    isSearching,
    previewFile,
    setPreviewFile,
    previewContent,
    isLoadingPreview,
    isAskingLlm,
    llmAnswer,
    llmSources,
    llmError,
    handleAskLlm,
    handleSearch,
    handleOpenInEditor,
    handleOpenInFolder,
    handleOpenPreview,
    clearSearch
  };
}
