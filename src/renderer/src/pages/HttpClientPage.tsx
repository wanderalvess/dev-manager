import React, { useState } from 'react';
import { Globe, Send } from 'lucide-react';
import type { HttpProbeResult } from '../../../shared/types';

export const HttpClientPage: React.FC<{
  onNavigateToSettings: () => void;
  onNavigateToQaRegression: () => void;
  isActive: boolean;
  settingsVersion: number;
}> = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [headersText, setHeadersText] = useState('{\n  "Accept": "application/json"\n}');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<HttpProbeResult | null>(null);

  const send = async () => {
    setLoading(true);
    try {
      let headers: Record<string, string> = {};
      try {
        headers = JSON.parse(headersText || '{}');
      } catch {
        headers = {};
      }
      const res = await window.electronAPI.probeHttpEndpoint({ method, url, headers, body });
      setResponse(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div>
        <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" /> API Studio (Cliente HTTP)
        </h1>
        <p className="text-xs text-muted-foreground">Execução real de requisições REST via proxy do servidor com medição de latência.</p>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-2.5">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs font-bold text-primary"
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-background font-mono text-xs text-foreground focus:outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={send}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" /> {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <div className="text-xs font-bold text-foreground mb-1">Headers (JSON)</div>
            <textarea
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              rows={4}
              className="w-full p-2.5 rounded-lg border border-border bg-background font-mono text-xs"
            />
          </div>
          {!['GET', 'HEAD'].includes(method) && (
            <div>
              <div className="text-xs font-bold text-foreground mb-1">Body</div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="w-full p-2.5 rounded-lg border border-border bg-background font-mono text-xs"
              />
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Resposta</span>
            {response && (
              <div className="flex items-center gap-2 text-2xs font-mono">
                <span className={`px-2 py-0.5 rounded-full font-bold ${response.ok ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                  {response.status} {response.statusText}
                </span>
                <span className="text-muted-foreground">{response.latencyMs} ms • {response.sizeBytes} B</span>
              </div>
            )}
          </div>
          <pre className="p-3 rounded-xl bg-muted/30 border border-border text-foreground font-mono text-2xs max-h-80 overflow-auto whitespace-pre-wrap">
            {response ? response.error || response.body : 'Envie uma requisição para inspecionar headers e payload.'}
          </pre>
        </div>
      </div>
    </div>
  );
};
