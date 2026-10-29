import React from 'react';
import { ChevronRight } from 'lucide-react';

interface IntegrationOptionalSectionProps {
  title: string;
  /** Para que serve, numa frase: aparece mesmo recolhido. */
  purpose: string;
  /** Resumo à direita, como "2 de 4 configuradas". */
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

/** Parte opcional da aba, recolhida: o que só o pré-voo ou o rastreio de lote usam. */
export const IntegrationOptionalSection: React.FC<IntegrationOptionalSectionProps> = ({ title, purpose, summary, defaultOpen, children }) => (
  <details className="group rounded-xl border border-border bg-card/40" open={defaultOpen}>
    <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-foreground">
          {title} <span className="font-normal text-muted-foreground">(opcional)</span>
        </span>
        <span className="block text-xs text-muted-foreground">{purpose}</span>
      </span>
      {summary && <span className="text-2xs font-mono text-muted-foreground shrink-0">{summary}</span>}
    </summary>
    <div className="px-4 pb-4 space-y-4">{children}</div>
  </details>
);
