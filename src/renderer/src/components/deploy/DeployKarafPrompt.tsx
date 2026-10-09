import React from 'react';
import { Play, Terminal } from 'lucide-react';

interface DeployKarafPromptProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/** Prompt de comando Karaf (CLI) com histórico via setas. */
export const DeployKarafPrompt: React.FC<DeployKarafPromptProps> = ({
  value,
  disabled,
  onChange,
  onSubmit,
  onKeyDown
}) => (
  <div className="pt-2.5 border-t border-border/70 space-y-1.5">
    <div className="flex items-center justify-between text-2xs">
      <span className="font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Terminal className="w-3 h-3 text-primary" /> Prompt Karaf
      </span>
      <span className="text-2xs text-muted-foreground font-mono">Histórico: ↑ / ↓</span>
    </div>
    <form onSubmit={onSubmit} className="flex gap-1.5">
      <div className="relative flex-1">
        <span className="absolute left-2.5 top-2 text-2xs font-mono text-muted-foreground/70 pointer-events-none select-none">
          $
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="feature:uninstall -r winthor-integracao-varejo/versao"
          className="w-full pl-6 pr-2.5 py-1.5 bg-background border border-border rounded-md text-xs font-mono text-foreground focus:outline-hidden focus:border-primary transition"
        />
      </div>
      <button
        type="submit"
        disabled={!value.trim() || disabled}
        className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-md text-xs hover:bg-primary/90 disabled:opacity-50 cursor-pointer transition flex items-center gap-1.5 shrink-0"
        title="Executar comando no shell Karaf (Enter)"
      >
        <Play className="w-3 h-3 fill-current" />
        <span>Executar</span>
      </button>
    </form>
  </div>
);
