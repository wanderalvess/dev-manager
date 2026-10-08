import React from 'react';

interface DocSettingsToggleCardProps {
  icon: React.ReactNode;
  iconWrapperClass: string;
  title: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => Promise<void>;
  activeLabel: string;
  inactiveLabel: string;
}

export const DocSettingsToggleCard: React.FC<DocSettingsToggleCardProps> = ({
  icon,
  iconWrapperClass,
  title,
  description,
  checked,
  onToggle,
  activeLabel,
  inactiveLabel
}) => {
  const hint = checked ? 'Clique para desativar' : 'Clique para ativar';
  return (
    <div className="p-3.5 rounded-xl border border-border/90 bg-card hover:border-border transition-colors shadow-2xs space-y-2.5 flex flex-col justify-between">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${iconWrapperClass}`}>{icon}</div>
            <span className="text-xs font-bold text-foreground">{title}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onToggle(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-primary/40 ${
              checked ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
            title={hint}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                checked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="pt-1 flex items-center">
        <button
          type="button"
          onClick={() => onToggle(!checked)}
          className={`text-2xs font-mono font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5 cursor-pointer transition-all hover:opacity-90 active:scale-95 ${
            checked
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
              : 'bg-muted/80 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
          }`}
          title={hint}
        >
          <span className={`w-2 h-2 rounded-full ${checked ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
          <span>{checked ? activeLabel : inactiveLabel}</span>
        </button>
      </div>
    </div>
  );
};
