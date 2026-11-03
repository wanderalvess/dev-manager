import React from 'react';
import { Check, Copy } from 'lucide-react';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

/** Registro da leitura da origem: cada comando, resposta HTTP e login (sem senha), para copiar e mandar a quem ajuda. */
export const InfrPreviewLog: React.FC<{ lines: string[]; open: boolean }> = ({ lines, open }) => {
  const { copy, copiedKey } = useCopyToClipboard(2000);
  const text = lines.join('\n');
  return (
    <details open={open} className="rounded-xl border border-border/80 px-4 py-3">
      <summary className="text-xs font-semibold text-foreground cursor-pointer">Registro da leitura ({lines.length} linhas)</summary>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-2xs text-muted-foreground">O que o Hub rodou e o que recebeu. Senhas e tokens não aparecem aqui.</p>
          <button
            type="button"
            onClick={() => copy(text, 'log')}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card text-2xs font-semibold text-foreground hover:bg-muted cursor-pointer"
          >
            {copiedKey === 'log' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            {copiedKey === 'log' ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <pre className="p-3 max-h-72 overflow-auto bg-[#090D14] rounded-lg text-2xs font-mono text-emerald-400 whitespace-pre-wrap break-all select-text">
          {text}
        </pre>
      </div>
    </details>
  );
};
