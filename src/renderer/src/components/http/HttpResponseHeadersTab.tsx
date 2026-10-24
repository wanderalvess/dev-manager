import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { showToast } from '../ToastHost';

interface HttpResponseHeadersTabProps {
  headers: Record<string, string>;
}

export const HttpResponseHeadersTab: React.FC<HttpResponseHeadersTabProps> = ({ headers }) => {
  const [copied, setCopied] = useState(false);
  const entries = Object.entries(headers || {});

  const handleCopyHeaders = () => {
    if (entries.length === 0) return;
    const text = entries.map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Cabeçalhos copiados!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  if (entries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-muted-foreground py-8 text-xs">
        Nenhum cabeçalho retornado pelo servidor.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0d1117] rounded border border-border/40">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-card/20">
        <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider font-mono">
          Cabeçalhos ({entries.length})
        </span>
        <button
          type="button"
          onClick={handleCopyHeaders}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Copiar todos os cabeçalhos"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copiados!' : 'Copiar'}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 p-2 font-mono text-xs">
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 py-0.5 border-b border-border/20 text-xs">
            <span className="font-semibold text-primary shrink-0">{k}:</span>
            <span className="text-foreground break-all">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
