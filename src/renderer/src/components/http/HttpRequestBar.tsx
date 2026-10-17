import React, { useState } from 'react';
import { Send, Save, RefreshCw, ChevronDown } from 'lucide-react';
import { HttpMethod } from '../../../../shared/types';
import { HttpBadge } from './HttpBadge';

interface HttpRequestBarProps {
  method: HttpMethod;
  setMethod: (method: HttpMethod) => void;
  url: string;
  setUrl: (url: string) => void;
  onSend: () => void;
  onSave?: () => void;
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
    <div className="flex items-center gap-2 p-3 bg-card/60 border-b border-border">
      {/* Seletor de Método HTTP */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMethodOpen(!isMethodOpen)}
          className="flex items-center gap-1.5 px-3 py-2 bg-background border border-border rounded-l hover:bg-muted/50 transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
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
          className="w-full px-3 py-2 bg-background border border-border rounded-r font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Botão Enviar */}
      <button
        type="button"
        onClick={onSend}
        disabled={isLoading}
        title="Enviar requisição (Ctrl + Enter)"
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium text-xs rounded hover:opacity-90 disabled:opacity-50 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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

      {/* Botão Salvar */}
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          title="Salvar alterações na requisição"
          className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded border border-border transition-colors"
        >
          <Save className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Salvar</span>
        </button>
      )}
    </div>
  );
};
