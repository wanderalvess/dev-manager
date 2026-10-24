import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Bot, Sparkles, Copy, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { showToast } from '../ToastHost';
import { HttpRequestItem, HttpResponseData } from '../../../../shared/types';
import { api } from '../../services/apiBridge';
import { parseMarkdownBlocks } from '../../utils/markdownReaderParser';
import { MarkdownBlocks } from '../markdown/MarkdownBlocks';

interface HttpAiDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: HttpRequestItem;
  response: HttpResponseData;
}

export const HttpAiDiagnosticModal: React.FC<HttpAiDiagnosticModalProps> = ({
  isOpen,
  onClose,
  request,
  response
}) => {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const markdownBlocks = useMemo(() => parseMarkdownBlocks(diagnostic || ''), [diagnostic]);

  const analyzeError = async () => {
    setLoading(true);
    setError(null);
    setDiagnostic(null);

    const prompt = `Você é um especialista em desenvolvimento de APIs REST corporativas para o ERP TOTVS WinThor e Apache Karaf / OSGi.
Analise o erro retornado na seguinte chamada de API:

- **Método**: ${request.method}
- **URL**: ${request.url}
- **Status HTTP**: ${response.status} ${response.statusText || ''}
- **Erro informado**: ${response.error || 'Nenhum'}
- **Corpo da Resposta**:
\`\`\`json
${response.body ? response.body.slice(0, 3000) : 'Sem corpo retornado'}
\`\`\`

Por favor, forneça de forma concisa e estruturada em Markdown:
1. **O que aconteceu**: Explicação clara do problema.
2. **Causa Provável no WinThor/Karaf**: Ex: falta de parâmetro, token expirado, erro Oracle (ORA-XXXXX), tabela sem grant, rotina desatualizada.
3. **Solução Recomendada**: Passos práticos ou correção no payload para solucionar.`;

    try {
      const res = await api.llmChat({
        messages: [{ role: 'user', content: prompt }]
      });

      if (res && res.text) {
        setDiagnostic(res.text);
      } else {
        setError('O modelo de IA não retornou conteúdo. Verifique se o provedor de IA está configurado em Configurações.');
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Falha ao conectar com o provedor de IA. Configure uma chave de API (OpenAI, Anthropic, Ollama) em Configurações -> IA.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      analyzeError();
    }
  }, [isOpen]);

  const handleCopy = () => {
    if (!diagnostic) return;
    navigator.clipboard.writeText(diagnostic);
    setCopied(true);
    showToast('Diagnóstico da IA copiado!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={isOpen} onClose={onClose} title="Diagnóstico de Erro com IA" size="xl">
      <div className="space-y-4 text-xs">
        {/* Banner com a rota e status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-border">
          <div className="flex items-center gap-2 truncate">
            <span className="font-mono font-bold text-danger bg-danger/10 border border-danger/30 px-2 py-0.5 rounded">
              {response.status > 0 ? `${response.status} ${response.statusText}` : 'Falha na Conexão'}
            </span>
            <span className="font-mono text-muted-foreground truncate">{request.method} {request.url}</span>
          </div>
          <button
            type="button"
            onClick={analyzeError}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer disabled:opacity-50"
            title="Reanalisar erro"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Reanalisar</span>
          </button>
        </div>

        {/* Conteúdo do Diagnóstico */}
        <div className="min-h-[240px] max-h-[460px] overflow-y-auto p-4 rounded-lg bg-[#0d1117] border border-border">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
              <div className="relative">
                <Bot className="w-10 h-10 text-primary animate-pulse" />
                <Sparkles className="w-4 h-4 text-warning absolute -top-1 -right-1 animate-spin" />
              </div>
              <p className="font-medium text-xs">Analisando causa raiz e stacktrace com o Assistente de IA...</p>
              <p className="text-xs text-muted-foreground/60">Cruzando com regras comuns do Karaf e WinThor REST</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded bg-danger/10 border border-danger/30 text-danger space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Não foi possível gerar o diagnóstico</span>
              </div>
              <p className="text-xs leading-relaxed">{error}</p>
            </div>
          ) : diagnostic ? (
            <div className="prose prose-invert prose-xs max-w-none text-foreground leading-relaxed">
              <MarkdownBlocks
                blocks={markdownBlocks}
                searchTerm=""
                copiedCodeIndex={null}
                onCopyCode={(code) => {
                  navigator.clipboard.writeText(code);
                  showToast('Código copiado!', 'success');
                }}
              />
            </div>
          ) : null}
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Diagnóstico gerado pelo modelo configurado em Configurações &rarr; IA.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
            >
              Fechar
            </button>
            {diagnostic && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Diagnóstico'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
