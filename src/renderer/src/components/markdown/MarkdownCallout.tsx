import React from 'react';
import { AlertCircle, AlertTriangle, Flame, Info, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CalloutType } from '../../utils/markdownReaderParser';
import { MarkdownInline } from './MarkdownInline';

const ALERT_STYLES: Record<CalloutType, { bg: string; border: string; text: string; label: string; icon: LucideIcon }> = {
  NOTE: {
    bg: 'bg-info/10',
    border: 'border-info/40',
    text: 'text-info',
    label: 'Nota Informativa',
    icon: Info
  },
  TIP: {
    bg: 'bg-success/10',
    border: 'border-success/40',
    text: 'text-success',
    label: 'Dica & Boas Práticas',
    icon: Sparkles
  },
  IMPORTANT: {
    bg: 'bg-primary/10',
    border: 'border-primary/40',
    text: 'text-primary',
    label: 'Importante',
    icon: AlertCircle
  },
  WARNING: {
    bg: 'bg-warning/10',
    border: 'border-warning/40',
    text: 'text-warning',
    label: 'Atenção / Aviso',
    icon: AlertTriangle
  },
  CAUTION: {
    bg: 'bg-danger/10',
    border: 'border-danger/40',
    text: 'text-danger',
    label: 'Cuidado Crítico',
    icon: Flame
  }
};

interface MarkdownCalloutProps {
  type: CalloutType;
  lines: string[];
  searchTerm: string;
}

export const MarkdownCallout: React.FC<MarkdownCalloutProps> = ({ type, lines, searchTerm }) => {
  const config = ALERT_STYLES[type] || ALERT_STYLES.NOTE;
  const IconComponent = config.icon;

  return (
    <div className={`my-4 p-4 rounded-xl border ${config.bg} ${config.border} shadow-2xs space-y-1.5`}>
      <div className={`flex items-center gap-2 font-bold text-xs ${config.text} uppercase tracking-wider`}>
        <IconComponent className="w-4 h-4" />
        <span>{config.label}</span>
      </div>
      <div className="text-[13px] text-foreground/90 leading-relaxed pl-6 space-y-1">
        {lines.map((al, idx) => (
          <p key={idx}>
            <MarkdownInline text={al} searchTerm={searchTerm} />
          </p>
        ))}
      </div>
    </div>
  );
};

interface MarkdownQuoteProps {
  lines: string[];
  isPrompt: boolean;
  searchTerm: string;
}

export const MarkdownQuote: React.FC<MarkdownQuoteProps> = ({ lines, isPrompt, searchTerm }) => (
  <div
    className={`my-3 p-3.5 rounded-xl border ${
      isPrompt
        ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 text-foreground'
        : 'bg-muted/30 border-border/80 text-muted-foreground italic'
    } shadow-2xs space-y-1.5`}
  >
    {isPrompt && (
      <div className="flex items-center gap-1.5 text-2xs font-bold text-primary uppercase tracking-wider select-none mb-1">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Exemplo de Prompt para IA</span>
      </div>
    )}
    <blockquote className="space-y-1 pl-1">
      {lines.map((ql, qIdx) => (
        <p key={qIdx} className={`leading-relaxed text-[13px] ${isPrompt ? 'font-medium not-italic text-foreground/90' : ''}`}>
          <MarkdownInline text={ql} searchTerm={searchTerm} />
        </p>
      ))}
    </blockquote>
  </div>
);
