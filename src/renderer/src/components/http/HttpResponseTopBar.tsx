import React from 'react';
import { HttpResponseData } from '../../../../shared/types';
import { Copy, Check, Clock, Database, FileCode, Key, Bot, Download } from 'lucide-react';

interface HttpResponseTopBarProps {
  response: HttpResponseData;
  isValidJson: boolean;
  viewMode: 'pretty' | 'raw';
  copied: boolean;
  extractedToken: string | null;
  onCopy: () => void;
  onDownload: () => void;
  onSendToQaRegression?: (rawJson: string) => void;
  onUpdateActiveToken?: (token: string) => void;
  onOpenAiDiagnostic?: () => void;
}

export const HttpResponseTopBar: React.FC<HttpResponseTopBarProps> = ({
  response,
  isValidJson,
  viewMode,
  copied,
  extractedToken,
  onCopy,
  onDownload,
  onSendToQaRegression,
  onUpdateActiveToken,
  onOpenAiDiagnostic
}) => {
  const isOk = response.status >= 200 && response.status < 300;
  const isClientError = response.status >= 400 && response.status < 500;
  const statusColor = isOk
    ? 'bg-success/15 text-success border-success/30'
    : isClientError
      ? 'bg-warning/15 text-warning border-warning/30'
      : 'bg-danger/15 text-danger border-danger/30';

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
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
        {(response.status >= 400 || response.status === 0 || response.error) && onOpenAiDiagnostic && (
          <button
            type="button"
            onClick={onOpenAiDiagnostic}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-primary/15 hover:bg-primary/25 text-primary rounded border border-primary/30 transition-colors cursor-pointer"
            title="Diagnosticar a causa raiz deste erro com IA"
          >
            <Bot className="w-3 h-3 text-primary" />
            <span>Analisar com IA</span>
          </button>
        )}

        {extractedToken && onUpdateActiveToken && (
          <button
            type="button"
            onClick={() => onUpdateActiveToken(extractedToken)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-success/15 hover:bg-success/25 text-success rounded border border-success/30 transition-colors cursor-pointer"
            title="Salvar este token na variável {{TOKEN}} do ambiente ativo"
          >
            <Key className="w-3 h-3 text-warning" />
            <span>Usar como &#123;&#123;TOKEN&#125;&#125;</span>
          </button>
        )}

        {onSendToQaRegression && (response.isJson || isValidJson) && (
          <button
            type="button"
            onClick={() => onSendToQaRegression(response.body)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors cursor-pointer"
            title="Utilizar este JSON no Validador Regressivo"
          >
            <Database className="w-3 h-3 text-primary" />
            <span>Enviar p/ Regressivo</span>
          </button>
        )}

        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors cursor-pointer"
          title="Baixar resposta como arquivo (.json ou .txt)"
        >
          <Download className="w-3 h-3 text-muted-foreground" />
          <span>Salvar</span>
        </button>

        <button
          type="button"
          onClick={onCopy}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-muted hover:bg-muted/80 text-foreground rounded border border-border transition-colors cursor-pointer"
          title={viewMode === 'pretty' && isValidJson ? 'Copiar JSON formatado' : 'Copiar resposta'}
        >
          {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          <span>{copied ? 'Copiado!' : 'Copiar'}</span>
        </button>
      </div>
    </div>
  );
};
