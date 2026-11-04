import React from 'react';
import { ClipboardCopy, RotateCw } from 'lucide-react';
import type { InfrDiagnosticState } from '../../../hooks/containers/useInfrDiagnostic';

/**
 * Um clique junta tudo o que ajuda a achar o problema de um ambiente (versão do Hub, pasta do INFR-Docker, scripts,
 * containers e logs, sem senhas) e copia para colar na conversa, no lugar de prints do terminal.
 */
export const InfrDiagnosticButton: React.FC<{ diag: InfrDiagnosticState; name: string; version?: string; notes?: string }> = ({ diag, name, version, notes }) => (
  <div className="space-y-2">
    <button
      type="button"
      onClick={() => void diag.run(name, { version, notes })}
      disabled={!name.trim() || diag.busy}
      title="Junta o estado do ambiente, a pasta do INFR-Docker, os scripts, os containers e os logs, com as senhas escondidas, e copia para você colar na conversa"
      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted cursor-pointer disabled:opacity-50"
    >
      {diag.busy ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
      {diag.busy ? 'Juntando o relatório...' : 'Copiar relatório para suporte'}
    </button>
    {diag.message && (
      <p role="status" className="text-xs text-foreground/80 break-words">
        {diag.message}
      </p>
    )}
    {diag.text && (
      <textarea
        readOnly
        aria-label="Relatório para suporte"
        value={diag.text}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full h-48 p-2 rounded-lg border border-border bg-background font-mono text-2xs text-foreground"
      />
    )}
  </div>
);
