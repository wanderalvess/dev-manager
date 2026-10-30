import React from 'react';
import { Copy, Check, Lightbulb } from 'lucide-react';
import type { BackupHelp } from '../../../../../shared/types';
import { useCopyToClipboard } from '../../../hooks/useCopyToClipboard';

interface BackupHelpPanelProps {
  help: BackupHelp;
}

/** Como resolver uma falha de backup/restauração: passos, comandos para copiar e a saída original do utilitário. */
export const BackupHelpPanel: React.FC<BackupHelpPanelProps> = ({ help }) => {
  const { copy, copiedKey } = useCopyToClipboard();
  const hasSteps = help.steps.length > 0;
  const snippets = help.snippets ?? [];

  return (
    <div className="mt-3 space-y-3 font-normal text-foreground">
      {hasSteps && (
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Lightbulb className="w-3.5 h-3.5 text-warning" />
            Como resolver
          </p>
          <ol className="mt-1.5 list-decimal pl-5 space-y-1 text-xs leading-relaxed">
            {help.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {snippets.map((snippet, i) => {
        const key = `backup-help-${i}`;
        return (
          <div key={key} className="rounded-lg border border-border bg-background">
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border">
              <span className="text-2xs text-muted-foreground">{snippet.label}</span>
              <button
                type="button"
                onClick={() => copy(snippet.code, key)}
                aria-label={`Copiar: ${snippet.label}`}
                className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                {copiedKey === key ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                {copiedKey === key ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <pre className="px-3 py-2 text-2xs font-mono whitespace-pre-wrap break-all">{snippet.code}</pre>
          </div>
        );
      })}

      {help.detail && (
        <details className="text-2xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">{help.detailLabel || 'Saída do comando'}</summary>
          <pre className="mt-1.5 font-mono whitespace-pre-wrap break-all opacity-90">{help.detail}</pre>
        </details>
      )}
    </div>
  );
};
