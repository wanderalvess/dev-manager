import React, { useState } from 'react';
import { Send, Save, RefreshCw, ChevronDown, Terminal } from 'lucide-react';
import { HttpMethod } from '../../../../shared/types';
import { HttpBadge } from './HttpBadge';

interface HttpRequestBarProps {
  method: HttpMethod;
  setMethod: (method: HttpMethod) => void;
  url: string;
  setUrl: (url: string) => void;
  onSend: () => void;
  onSave?: () => void;
  onOpenCurlModal?: (mode: 'export' | 'import') => void;
  isLoading: boolean;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export const HttpRequestBar: React.FC<HttpRequestBarProps> = ({
  method,
  setMethod,
  url,
  setUrl,
  onSend,
  onSave,
  onOpenCurlModal,
  isLoading
}) => {
  const [isMethodOpen, setIsMethodOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-card border-b border-border">
      {/* Seletor de Método HTTP */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMethodOpen(!isMethodOpen)}
          className="flex items-center gap-1.5 px-3 h-10 bg-background border border-input rounded-l-[10px] hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <HttpBadge method={method} size="md" />
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {isMethodOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsMethodOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-36 bg-popover border border-border rounded shadow-xl py-1 z-50">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMethod(m);
                    setIsMethodOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors ${
                    m === method ? 'bg-muted/40 font-semibold' : ''
                  }`}
                >
                  <HttpBadge method={m} size="sm" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Input de URL */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="http://{{host}}:{{port}}/winthor/autenticacao/v1/login"
          className="w-full px-3 h-10 bg-background border border-input rounded-r-[10px] font-mono text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Botão Enviar */}
      <button
        type="button"
        onClick={onSend}
        disabled={isLoading}
        title="Enviar requisição (Ctrl + Enter)"
        className="flex items-center gap-2 px-4 h-10 bg-primary text-primary-foreground font-medium text-sm rounded-[10px] hover:bg-primary/90 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {isLoading ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Enviando...</span>
          </>
        ) : (
          <>
            <Send className="w-3.5 h-3.5" />
            <span>Enviar</span>
          </>
        )}
      </button>

      {/* Botão cURL */}
      {onOpenCurlModal && (
        <button
          type="button"
          onClick={() => onOpenCurlModal('export')}
          title="Copiar ou importar como comando cURL"
          className="flex items-center gap-1.5 px-3 h-10 bg-card hover:bg-muted text-foreground text-sm font-medium rounded-[10px] border border-border transition-colors cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
          <span>cURL</span>
        </button>
      )}

      {/* Botão Salvar */}
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          title="Salvar alterações na requisição"
          className="flex items-center gap-1.5 px-3 h-10 bg-card hover:bg-muted text-foreground text-sm font-medium rounded-[10px] border border-border transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Salvar</span>
        </button>
      )}
    </div>
  );
};
