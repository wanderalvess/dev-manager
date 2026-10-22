import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Terminal, Copy, Check, ArrowDownToLine } from 'lucide-react';
import { showToast } from '../ToastHost';
import { HttpRequestItem } from '../../../../shared/types';
import { generateCurlCommand, parseCurlCommand } from '../../utils/curlUtils';

interface HttpCurlModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'export' | 'import';
  currentRequest: HttpRequestItem;
  envVars?: Record<string, string>;
  activeToken?: string;
  onImportSuccess?: (parsedRequest: Partial<HttpRequestItem>) => void;
}

export const HttpCurlModal: React.FC<HttpCurlModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentRequest,
  envVars = {},
  activeToken,
  onImportSuccess
}) => {
  const [curlText, setCurlText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'export') {
        const cmd = generateCurlCommand(currentRequest, envVars, activeToken);
        setCurlText(cmd);
        setError(null);
      } else {
        setCurlText('');
        setError(null);
      }
    }
  }, [isOpen, mode, currentRequest, envVars, activeToken]);

  const handleCopy = () => {
    if (!curlText) return;
    navigator.clipboard.writeText(curlText);
    setCopied(true);
    showToast('Comando cURL copiado com sucesso!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!curlText.trim()) {
      setError('Por favor, cole um comando cURL válido.');
      return;
    }

    const parsed = parseCurlCommand(curlText);
    if (!parsed) {
      setError('Não foi possível interpretar o comando cURL. Verifique se o comando inicia com "curl" e contém uma URL válida.');
      return;
    }

    if (onImportSuccess) {
      onImportSuccess(parsed);
      showToast('cURL importado para o workspace com sucesso!', 'success');
      onClose();
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={mode === 'export' ? 'Copiar como cURL' : 'Importar comando cURL'}
      size="lg"
    >
      <div className="space-y-4 text-xs">
        <p className="text-muted-foreground">
          {mode === 'export'
            ? 'Comando pronto para execução no terminal (PowerShell, Bash ou Zsh) com todas as variáveis e tokens resolvidos.'
            : 'Cole um comando cURL exportado do Postman, Insomnia ou DevTools do navegador para preencher os parâmetros automaticamente.'}
        </p>

        {error && (
          <div className="p-2.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 font-medium">
            {error}
          </div>
        )}

        <div className="relative">
          <textarea
            value={curlText}
            onChange={(e) => {
              setCurlText(e.target.value);
              setError(null);
            }}
            readOnly={mode === 'export'}
            rows={mode === 'export' ? 8 : 10}
            placeholder='curl -X POST "http://localhost:8181/winthor/..." -H "Content-Type: application/json" -d "..."'
            className="w-full p-3 font-mono text-xs bg-[#0d1117] border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
          >
            Fechar
          </button>

          {mode === 'export' ? (
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar cURL'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Importar para Workspace</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
