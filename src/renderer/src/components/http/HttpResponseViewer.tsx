import React, { useState, useMemo, useEffect } from 'react';
import { HttpResponseData } from '../../../../shared/types';
import { MonacoJsonViewer } from './MonacoJsonViewer';
import { HttpResponseHeadersTab } from './HttpResponseHeadersTab';
import { HttpResponseTopBar } from './HttpResponseTopBar';
import { Globe, AlertCircle, Wand2 } from 'lucide-react';
import { showToast } from '../ToastHost';

interface HttpResponseViewerProps {
  response: HttpResponseData | null;
  isLoading: boolean;
  onSendToQaRegression?: (rawJson: string) => void;
  onUpdateActiveToken?: (token: string) => void;
  onOpenAiDiagnostic?: () => void;
}

export const HttpResponseViewer: React.FC<HttpResponseViewerProps> = ({
  response,
  isLoading,
  onSendToQaRegression,
  onUpdateActiveToken,
  onOpenAiDiagnostic
}) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');

  const MAX_AUTO_PRETTY_BYTES = 2 * 1024 * 1024; // 2 MB
  const isTooLarge = (response?.body?.length || 0) > MAX_AUTO_PRETTY_BYTES;

  // Formata automaticamente o JSON com indentação de 2 espaços
  const { formattedBody, isValidJson } = useMemo(() => {
    if (!response?.body) return { formattedBody: '', isValidJson: false };
    if (isTooLarge) return { formattedBody: response.body, isValidJson: false };
    try {
      const parsed = JSON.parse(response.body);
      return { formattedBody: JSON.stringify(parsed, null, 2), isValidJson: true };
    } catch {
      return { formattedBody: response.body, isValidJson: false };
    }
  }, [response?.body, isTooLarge]);

  // Detecta se a resposta contém um token/JWT para ação rápida de autenticação
  const extractedToken = useMemo(() => {
    if (!response?.body || !isValidJson) return null;
    try {
      const parsed = JSON.parse(response.body);
      if (typeof parsed === 'object' && parsed !== null) {
        const tok = parsed.token || parsed.accessToken || parsed.access_token;
        if (typeof tok === 'string' && tok.length > 20) {
          return tok;
        }
      }
    } catch {
      // Ignora
    }
    return null;
  }, [response?.body, isValidJson]);

  // Ao receber uma nova resposta, se for JSON válido e menor que 2MB, padrão é sempre exibir formatado
  useEffect(() => {
    if ((response?.isJson || isValidJson) && !isTooLarge) {
      setViewMode('pretty');
    } else {
      setViewMode('raw');
    }
  }, [response?.id, isValidJson, response?.isJson, isTooLarge]);

  const displayedBody = useMemo(() => {
    if (!response?.body) return '';
    if (viewMode === 'pretty' && isValidJson) {
      return formattedBody;
    }
    return response.body;
  }, [response?.body, viewMode, isValidJson, formattedBody]);

  const handleCopy = () => {
    const textToCopy = displayedBody || response?.body;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    showToast(
      viewMode === 'pretty' && isValidJson
        ? 'JSON formatado copiado para a área de transferência!'
        : 'Resposta copiada para a área de transferência!',
      'success'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToQa = () => {
    const textToSend = displayedBody || response?.body;
    if (!textToSend) return;
    if (onSendToQaRegression) {
      onSendToQaRegression(textToSend);
      showToast('Payload enviado para o Validador Regressivo!', 'success');
    }
  };

  const handleDownloadResponse = () => {
    const textToSave = displayedBody || response?.body;
    if (!textToSave) return;
    const isJson = isValidJson || response?.isJson;
    const extension = isJson ? 'json' : 'txt';
    const blob = new Blob([textToSave], { type: isJson ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response_${response?.status || 'resp'}_${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Resposta salva como arquivo!', 'success');
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
        <p className="text-xs text-muted-foreground/60 mt-1">
          Informe a URL e clique em &quot;Enviar&quot; ou pressione <kbd className="px-1.5 py-0.5 bg-muted rounded font-mono text-xs">Ctrl + Enter</kbd>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background border-t lg:border-t-0 lg:border-l border-border">
      {/* Topo / Métricas de Resposta & Ações */}
      <HttpResponseTopBar
        response={response}
        isValidJson={isValidJson}
        viewMode={viewMode}
        copied={copied}
        extractedToken={extractedToken}
        onCopy={handleCopy}
        onDownload={handleDownloadResponse}
        onSendToQaRegression={handleSendToQa}
        onUpdateActiveToken={onUpdateActiveToken}
        onOpenAiDiagnostic={onOpenAiDiagnostic}
      />

      {/* Abas da Resposta */}
      <div className="flex items-center justify-between px-3 border-b border-border bg-card/20">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('body')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
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
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'headers'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Headers ({Object.keys(response.headers || {}).length})
          </button>
        </div>

        {activeTab === 'body' && (response.isJson || isValidJson) && (
          <div className="flex items-center gap-1.5 py-1">
            <span className="text-xs text-muted-foreground">Visualização:</span>
            <div className="inline-flex rounded p-0.5 bg-muted/60 border border-border">
              <button
                type="button"
                onClick={() => setViewMode('pretty')}
                className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer flex items-center gap-1 ${
                  viewMode === 'pretty'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Exibir JSON formatado com indentação de 2 espaços"
              >
                <Wand2 className="w-3 h-3" />
                <span>Formatado</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                  viewMode === 'raw'
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Exibir resposta bruta sem formatação (como veio do servidor)"
              >
                <span>Bruto (Raw)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo da Resposta */}
      <div className="flex-1 overflow-hidden p-2">
        {response.error && (
          <div className="mb-2 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erro ao processar requisição</p>
              <p className="text-xs text-red-400/90 font-mono mt-0.5">{response.error}</p>
            </div>
          </div>
        )}

        {activeTab === 'body' ? (
          <MonacoJsonViewer
            value={displayedBody}
            readOnly
            language={response.isJson || isValidJson ? 'json' : 'plaintext'}
          />
        ) : (
          <HttpResponseHeadersTab headers={response.headers || {}} />
        )}
      </div>
    </div>
  );
};
