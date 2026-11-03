import React from 'react';
import { ChevronRight } from 'lucide-react';
import { SECTION_TITLE_CLASS } from '../ui/PageHeader';

interface SettingsCardProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Botões, etiquetas ou um switch, à direita do título. */
  actions?: React.ReactNode;
  /** Número do passo, para seções que seguem uma ordem (Preparação do debug). */
  step?: number;
  id?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Card padrão das Configurações: borda, fundo de card, sem sombra; título de seção, frase curta e ações. */
export const SettingsCard: React.FC<SettingsCardProps> = ({ title, description, actions, step, id, className = '', children }) => (
  <section id={id} className={`rounded-xl border border-border bg-card p-5 space-y-4 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        {step !== undefined && (
          <span
            aria-hidden="true"
            className="w-7 h-7 shrink-0 rounded-full bg-primary text-primary-foreground font-mono text-sm font-bold flex items-center justify-center"
          >
            {step}
          </span>
        )}
        <div className="min-w-0">
          <h3 className={SECTION_TITLE_CLASS}>
            {step !== undefined && <span className="sr-only">Passo {step}: </span>}
            {title}
          </h3>
          {description && <p className="text-xs text-muted-foreground max-w-2xl mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
    {children}
  </section>
);

/** Rótulo + controle + dica, o mesmo desenho para todo campo de Configurações. */
export const SettingsField: React.FC<{
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  badge?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, badge, optional, children }) => (
  <div className="space-y-1.5 min-w-0">
    <label htmlFor={htmlFor} className="text-[13px] font-semibold text-foreground flex flex-wrap items-center gap-2">
      {label}
      {optional && <span className="font-normal text-muted-foreground">(opcional)</span>}
      {badge}
    </label>
    {children}
    {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
  </div>
);

/** Classe dos inputs de Configurações: mesma altura (h-9) e raio dos botões. */
export const SETTINGS_INPUT_CLASS =
  'w-full h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring';

export const SETTINGS_BUTTON_CLASS =
  'h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
export const SETTINGS_PRIMARY_BUTTON_CLASS =
  'h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60';
export const SETTINGS_GHOST_BUTTON_CLASS =
  'h-9 px-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1.5 cursor-pointer';

/** Lista vazia: diz o que fazer em vez de deixar um buraco no card. */
export const SettingsEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl border border-dashed border-input px-4 py-5 text-center text-xs text-muted-foreground">{children}</div>
);

/** Campos que quase ninguém precisa: recolhidos por padrão, no pé do card. */
export const SettingsAdvanced: React.FC<{ summary: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  summary,
  children,
  defaultOpen
}) => (
  <details open={defaultOpen} className="group border-t border-border pt-3">
    <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
      <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
      {summary}
    </summary>
    <div className="pt-3 space-y-4">{children}</div>
  </details>
);
