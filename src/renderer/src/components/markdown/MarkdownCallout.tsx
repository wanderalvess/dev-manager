import React from 'react';
import { AlertCircle, AlertTriangle, Flame, Info, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CalloutType } from '../../utils/markdownReaderParser';
import { MarkdownInline } from './MarkdownInline';

const ALERT_STYLES: Record<CalloutType, { bg: string; border: string; text: string; label: string; icon: LucideIcon }> = {
  NOTE: {
    bg: 'bg-blue-500/10 dark:bg-blue-950/20',
    border: 'border-blue-500/40',
    text: 'text-blue-600 dark:text-blue-400',
    label: 'Nota Informativa',
    icon: Info
  },
  TIP: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-950/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Dica & Boas Práticas',
    icon: Sparkles
  },
  IMPORTANT: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-950/20',
    border: 'border-indigo-500/40',
    text: 'text-indigo-600 dark:text-indigo-400',
    label: 'Importante',
    icon: AlertCircle
  },
  WARNING: {
    bg: 'bg-amber-500/10 dark:bg-amber-950/20',
    border: 'border-amber-500/40',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'Atenção / Aviso',
    icon: AlertTriangle
  },
  CAUTION: {
    bg: 'bg-rose-500/10 dark:bg-rose-950/20',
    border: 'border-rose-500/40',
    text: 'text-rose-600 dark:text-rose-400',
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
    <div className={`my-4 p-4 rounded-2xl border ${config.bg} ${config.border} shadow-xs space-y-1.5`}>
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
    className={`my-3 p-3.5 rounded-2xl border ${
      isPrompt
        ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 text-foreground'
        : 'bg-muted/30 border-border/80 text-muted-foreground italic'
    } shadow-xs space-y-1.5`}
  >
    {isPrompt && (
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary uppercase tracking-wider select-none mb-1">
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
