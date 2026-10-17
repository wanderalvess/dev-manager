import React, { useState } from 'react';
import { HttpResponseData } from '../../../../shared/types';
import { MonacoJsonViewer } from './MonacoJsonViewer';
import { Copy, Check, Clock, Database, Globe, AlertCircle, FileCode } from 'lucide-react';
import { showToast } from '../ToastHost';

interface HttpResponseViewerProps {
  response: HttpResponseData | null;
  isLoading: boolean;
  onSendToQaRegression?: (rawJson: string) => void;
}

export const HttpResponseViewer: React.FC<HttpResponseViewerProps> = ({
  response,
  isLoading,
  onSendToQaRegression
}) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!response?.body) return;
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    showToast('Resposta copiada para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToQa = () => {
    if (!response?.body) return;
    if (onSendToQaRegression) {
      onSendToQaRegression(response.body);
      showToast('Payload enviado para o Validador Regressivo!', 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs">Aguardando resposta do servidor...</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground bg-background">
        <Globe className="w-10 h-10 mb-3 text-muted-foreground/30" />
        <p className="text-xs font-medium">Nenhuma requisição enviada ainda.</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          Informe a URL e clique em &quot;Enviar&quot; ou pressione <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono text-[10px]">Ctrl + Enter</kbd>.
        </p>
      </div>
    );
  }

  const isOk = response.status >= 200 && response.status < 300;
  const isClientError = response.status >= 400 && response.status < 500;
  const isServerError = response.status >= 500 || response.status === 0;

  const statusColor = isOk
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : isClientError
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-red-500/15 text-red-400 border-red-500/30';

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background border-t lg:border-t-0 lg:border-l border-border">
      {/* Topo / Métricas de Resposta */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/40">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded border text-xs font-mono font-bold tracking-wider ${statusColor}`}>
            {response.status > 0 ? `${response.status} ${response.statusText}` : 'Falha na Conexão'}
          </span>

          <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>{response.durationMs} ms</span>
          </span>

          <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <FileCode className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>{formatBytes(response.sizeBytes)}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onSendToQaRegression && response.isJson && (
            <button
              type="button"
              onClick={handleSendToQa}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors"
              title="Utilizar este JSON no Validador Regressivo"
            >
              <Database className="w-3 h-3 text-primary" />
              <span>Enviar p/ Regressivo</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors"
            title="Copiar resposta"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Abas da Resposta */}
      <div className="flex items-center gap-1 px-3 border-b border-border bg-card/20">
        <button
          type="button"
          onClick={() => setActiveTab('body')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'body'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Response Body
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('headers')}
          className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'headers'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Headers ({Object.keys(response.headers || {}).length})
        </button>
      </div>

      {/* Conteúdo da Resposta */}
      <div className="flex-1 overflow-hidden p-2">
        {response.error && (
          <div className="mb-2 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erro ao processar requisição</p>
              <p className="text-[11px] text-red-400/90 font-mono mt-0.5">{response.error}</p>
            </div>
          </div>
        )}

        {activeTab === 'body' ? (
          <MonacoJsonViewer
            value={response.body}
            readOnly
            language={response.isJson ? 'json' : 'plaintext'}
          />
        ) : (
          <div className="h-full overflow-y-auto space-y-1 p-2 bg-[#0d1117] rounded font-mono text-xs">
            {Object.entries(response.headers || {}).length === 0 ? (
              <div className="text-center text-muted-foreground py-4">Nenhum cabeçalho retornado.</div>
            ) : (
              Object.entries(response.headers).map(([k, v]) => (
                <div key={k} className="flex gap-2 py-0.5 border-b border-border/20 text-[11px]">
                  <span className="font-semibold text-primary">{k}:</span>
                  <span className="text-foreground break-all">{v}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
