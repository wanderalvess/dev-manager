import { useState, useEffect, useCallback } from 'react';
import {
  HttpCollection,
  HttpRequestItem,
  HttpEnvironment,
  HttpResponseData,
  HttpMethod,
  PostmanImportResult
} from '../../../../shared/types';
import { api } from '../../services/apiBridge';
import { showToast } from '../../components/ToastHost';

const DEFAULT_REQUEST: HttpRequestItem = {
  id: 'draft-req',
  name: 'Nova Requisição',
  method: 'GET',
  url: 'http://{{host}}:{{port}}/winthor/autenticacao/v1/usuariologado',
  params: [],
  headers: [
    { id: 'h-1', key: 'Accept', value: 'application/json', enabled: true }
  ],
  body: { mode: 'none' },
  auth: { type: 'winthor-auth' }
};

export function useHttpClientState() {
  const [collections, setCollections] = useState<HttpCollection[]>([]);
  const [environments, setEnvironments] = useState<HttpEnvironment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<string>('');
  const [currentRequest, setCurrentRequest] = useState<HttpRequestItem>(DEFAULT_REQUEST);
  const [response, setResponse] = useState<HttpResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HttpResponseData[]>([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [isCurlModalOpen, setIsCurlModalOpen] = useState(false);
  const [curlModalMode, setCurlModalMode] = useState<'export' | 'import'>('export');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cols, envs, hist] = await Promise.all([
        api.httpListCollections(),
        api.httpListEnvironments(),
        api.httpGetHistory()
      ]);
      setCollections(cols || []);
      setEnvironments(envs || []);
      setHistory(hist || []);
      if (envs && envs.length > 0 && !selectedEnvId) {
        setSelectedEnvId(envs[0].id);
      }
    } catch (err: any) {
      console.error('[useHttpClientState] Erro ao carregar dados:', err);
    }
  }, [selectedEnvId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentEnv = environments.find((e) => e.id === selectedEnvId) || environments[0];
  const activeToken = currentEnv?.variables?.find((v) => v.key.toUpperCase() === 'TOKEN')?.value;

  const handleExecute = async () => {
    if (!currentRequest.url.trim()) {
      showToast('Por favor, informe a URL da requisição.', 'info');
      return;
    }

    setIsLoading(true);
    setResponse(null);

    const envVars: Record<string, string> = {};
    if (currentEnv) {
      for (const v of currentEnv.variables) {
        if (v.enabled) envVars[v.key] = v.value;
      }
    }

    try {
      const res = await api.httpExecute({
        request: currentRequest,
        environmentId: currentEnv?.id,
        environmentVariables: envVars,
        activeToken
      });

      setResponse(res);
      const updatedHist = await api.httpGetHistory();
      setHistory(updatedHist || []);
    } catch (err: any) {
      showToast(err?.message || 'Erro inesperado ao executar requisição.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRequest = async () => {
    if (!currentRequest.collectionId && collections.length > 0) {
      // Se não tem coleção definida, salva na primeira
      currentRequest.collectionId = collections[0].id;
    }

    try {
      await api.httpSaveRequest(currentRequest);
      showToast('Requisição salva com sucesso!', 'success');
      const updatedCols = await api.httpListCollections();
      setCollections(updatedCols || []);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao salvar requisição.', 'error');
    }
  };

  const handleNewRequest = (collectionId?: string, folderId?: string) => {
    const newReq: HttpRequestItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: 'Nova Requisição',
      method: 'GET',
      url: 'http://{{host}}:{{port}}/',
      params: [],
      headers: [],
      body: { mode: 'none' },
      auth: { type: 'inherit' },
      collectionId,
      folderId
    };
    setCurrentRequest(newReq);
    setResponse(null);
  };

  const handleDeleteRequest = async (collectionId: string, requestId: string) => {
    try {
      await api.httpDeleteRequest(collectionId, requestId);
      showToast('Requisição removida.', 'info');
      const updatedCols = await api.httpListCollections();
      setCollections(updatedCols || []);
      if (currentRequest.id === requestId) {
        setCurrentRequest(DEFAULT_REQUEST);
      }
    } catch (err: any) {
      showToast(err?.message || 'Falha ao excluir requisição.', 'error');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await api.httpDeleteCollection(id);
      showToast('Coleção removida.', 'info');
      const updatedCols = await api.httpListCollections();
      setCollections(updatedCols || []);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao excluir coleção.', 'error');
    }
  };

  const handleImportSuccess = (result: PostmanImportResult) => {
    if (result.collection) {
      setCollections((prev) => [...prev, result.collection!]);
      if (result.collection.requests.length > 0) {
        setCurrentRequest(result.collection.requests[0]);
      }
    } else {
      loadData();
    }
  };

  const handleSaveEnvironments = async (envs: HttpEnvironment[]) => {
    setEnvironments(envs);
    await api.httpSaveEnvironments(envs);
  };

  const handleUpdateActiveToken = async (newToken: string) => {
    if (!currentEnv) return;
    const updatedEnvs = environments.map((env) => {
      if (env.id !== currentEnv.id) return env;
      const existingTokenIndex = env.variables.findIndex((v) => v.key.toUpperCase() === 'TOKEN');
      const updatedVars = [...env.variables];
      if (existingTokenIndex >= 0) {
        updatedVars[existingTokenIndex] = {
          ...updatedVars[existingTokenIndex],
          value: newToken,
          enabled: true
        };
      } else {
        updatedVars.push({
          id: Math.random().toString(36).substring(2, 9),
          key: 'TOKEN',
          value: newToken,
          enabled: true
        });
      }
      return { ...env, variables: updatedVars };
    });

    setEnvironments(updatedEnvs);
    await api.httpSaveEnvironments(updatedEnvs);
    showToast('Variável {{TOKEN}} atualizada no ambiente ativo com sucesso!', 'success');
  };

  const handleRestoreHistory = (historyItem: HttpResponseData) => {
    if (historyItem.requestSnapshot) {
      setCurrentRequest({
        id: historyItem.requestId || Math.random().toString(36).substring(2, 9),
        name: historyItem.requestSnapshot.name || 'Chamada do Histórico',
        method: historyItem.requestSnapshot.method || 'GET',
        url: historyItem.requestSnapshot.url || '',
        params: historyItem.requestSnapshot.params || [],
        headers: historyItem.requestSnapshot.headers || [],
        body: historyItem.requestSnapshot.body || { mode: 'none' },
        auth: historyItem.requestSnapshot.auth || { type: 'none' }
      });
    }
    setResponse(historyItem);
    showToast('Requisição restaurada do histórico!', 'info');
  };

  const handleClearHistory = async () => {
    try {
      await api.httpClearHistory();
      setHistory([]);
      showToast('Histórico limpo com sucesso!', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Falha ao limpar histórico.', 'error');
    }
  };

  const handleImportCurl = (parsed: Partial<HttpRequestItem>) => {
    setCurrentRequest((prev) => ({
      ...prev,
      method: parsed.method || prev.method,
      url: parsed.url || prev.url,
      headers: parsed.headers && parsed.headers.length > 0 ? parsed.headers : prev.headers,
      body: parsed.body || prev.body,
      auth: parsed.auth || prev.auth
    }));
  };

  return {
    collections,
    environments,
    selectedEnvId,
    setSelectedEnvId,
    currentRequest,
    setCurrentRequest,
    response,
    isLoading,
    history,
    activeToken,
    isImportModalOpen,
    setIsImportModalOpen,
    isEnvModalOpen,
    setIsEnvModalOpen,
    isCurlModalOpen,
    setIsCurlModalOpen,
    curlModalMode,
    setCurlModalMode,
    isAiModalOpen,
    setIsAiModalOpen,
    handleExecute,
    handleSaveRequest,
    handleNewRequest,
    handleDeleteRequest,
    handleDeleteCollection,
    handleImportSuccess,
    handleSaveEnvironments,
    handleUpdateActiveToken,
    handleRestoreHistory,
    handleClearHistory,
    handleImportCurl,
    loadData
  };
}
