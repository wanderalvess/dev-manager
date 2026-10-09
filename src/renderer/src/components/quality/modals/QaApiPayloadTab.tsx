import React, { useState, useEffect } from 'react';
import { Globe, Send, RefreshCw, AlertCircle, CheckCircle2, Shield, KeyRound } from 'lucide-react';
import { api } from '../../../services/apiBridge';

interface QaApiPayloadTabProps {
  onPayloadLoaded: (rawJson: string) => void;
  isInspecting?: boolean;
}

const STORAGE_KEY = 'dev-manager:qa-api-payload-config';

export const QaApiPayloadTab: React.FC<QaApiPayloadTabProps> = ({ onPayloadLoaded }) => {
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [url, setUrl] = useState<string>('');
  const [headersText, setHeadersText] = useState<string>('{\n  "Authorization": "Bearer "\n}');
  const [bodyText, setBodyText] = useState<string>('');
  const [jsonPath, setJsonPath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusInfo, setStatusInfo] = useState<{
    code?: number;
    durationMs?: number;
    error?: string;
  } | null>(null);

  // Carrega configurações prévias salvas no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url) setUrl(parsed.url);
        if (parsed.method) setMethod(parsed.method);
        if (parsed.headersText) setHeadersText(parsed.headersText);
        if (parsed.jsonPath) setJsonPath(parsed.jsonPath);
      }
    } catch {
      // Ignora erro ao ler localStorage
    }
  }, []);

  const handleFetch = async () => {
    if (!url.trim()) {
      setStatusInfo({ error: 'Informe a URL do endpoint.' });
      return;
    }

    let parsedHeaders: Record<string, string> | undefined;
    if (headersText.trim()) {
      try {
        parsedHeaders = JSON.parse(headersText);
      } catch {
        setStatusInfo({ error: 'Os cabeçalhos HTTP informados não são um JSON válido.' });
        return;
      }
    }

    setIsLoading(true);
    setStatusInfo(null);

    // Salva preferências no localStorage
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ url: url.trim(), method, headersText, jsonPath: jsonPath.trim() })
      );
    } catch {
      // Ignora falha em salvar
    }

    try {
      const res = await api.qaFetchApiPayload({
        url: url.trim(),
        method,
        headers: parsedHeaders,
        body: method === 'POST' ? bodyText : undefined,
        jsonPath: jsonPath.trim() || undefined
      });

      if (!res.success) {
        setStatusInfo({
          code: res.statusCode,
          durationMs: res.durationMs,
          error: res.error || 'Falha ao buscar payload na API.'
        });
        if (res.rawJson) {
          onPayloadLoaded(res.rawJson);
        }
        return;
      }

      setStatusInfo({ code: res.statusCode, durationMs: res.durationMs });
      onPayloadLoaded(res.extractedJson || res.rawJson || '');
    } catch (err: any) {
      setStatusInfo({ error: err?.message || 'Erro inesperado na chamada à API.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 space-y-3.5 overflow-y-auto bg-background/50 text-xs">
      {/* Linha Principal de URL & Método */}
      <div className="space-y-1.5">
        <label className="text-2xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>Endpoint REST da API</span>
        </label>
        <div className="flex items-center gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
            className="bg-card border border-border rounded px-2.5 py-1.5 font-mono text-foreground font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:8080/api/v1/pedidos/12345"
            className="flex-1 bg-card border border-border rounded px-3 py-1.5 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={isLoading || !url.trim()}
            className="px-4 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shrink-0"
          >
            {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isLoading ? 'Requisitando...' : 'Consultar API'}</span>
          </button>
        </div>
      </div>

      {/* Caminho JSON Opcional */}
      <div className="space-y-1">
        <label className="text-2xs font-semibold text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-primary" />
            <span>Caminho do Objeto no JSON (Opcional)</span>
          </span>
          <span className="text-2xs text-muted-foreground/80">Vazio = usa toda a resposta</span>
        </label>
        <input
          type="text"
          value={jsonPath}
          onChange={(e) => setJsonPath(e.target.value)}
          placeholder="Ex: data.pedido ou response.items[0]"
          className="w-full bg-card border border-border rounded px-3 py-1.5 font-mono text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Cabeçalhos HTTP */}
      <div className="space-y-1">
        <label className="text-2xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span>Cabeçalhos / Headers (JSON)</span>
        </label>
        <textarea
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          rows={3}
          placeholder='{"Authorization": "Bearer ...", "x-api-key": "..."}'
          className="w-full bg-card border border-border rounded p-2.5 font-mono text-2xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-tight resize-none"
        />
      </div>

      {/* Corpo (se POST) */}
      {method === 'POST' && (
        <div className="space-y-1">
          <label className="text-2xs font-semibold text-muted-foreground">
            Corpo da Requisição / Body (JSON)
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            rows={3}
            placeholder='{"codFilial": "1", "data": "2026-10-02"}'
            className="w-full bg-card border border-border rounded p-2.5 font-mono text-2xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-tight resize-none"
          />
        </div>
      )}

      {/* Status da Requisição */}
      {statusInfo && (
        <div
          className={`p-2.5 rounded border text-2xs flex items-center justify-between font-mono ${
            statusInfo.error
              ? 'bg-rose-950/20 border-rose-900/50 text-rose-300'
              : 'bg-emerald-950/20 border-emerald-900/50 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusInfo.error ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusInfo.error || `HTTP ${statusInfo.code} OK - Payload extraído com sucesso!`}</span>
          </div>
          {statusInfo.durationMs !== undefined && (
            <span className="text-2xs opacity-75 shrink-0">{statusInfo.durationMs}ms</span>
          )}
        </div>
      )}
    </div>
  );
};
