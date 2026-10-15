import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export interface ModuleCardProps {
  onNavigate?: (tab: string) => void;
}

interface ModuleCardShellProps {
  icon: React.ReactNode;
  iconBoxClass: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  shortcut?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Moldura comum dos cartões de módulo: cabeçalho, corpo textual e rodapé. */
export const ModuleCardShell: React.FC<ModuleCardShellProps> = ({
  icon,
  iconBoxClass,
  title,
  subtitle,
  shortcut,
  children,
  footer
}) => (
  <div className="cockpit-panel rounded-xl p-5 border border-border space-y-3.5 shadow-md flex flex-col justify-between">
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center space-x-2.5">
          <div className={iconBoxClass}>{icon}</div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-foreground">{title}</h3>
            <span className="text-2xs text-muted-foreground font-mono">{subtitle}</span>
          </div>
        </div>
        {shortcut && (
          <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-2xs text-foreground font-bold">
            {shortcut}
          </kbd>
        )}
      </div>

      <div className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">{children}</div>
    </div>
    {footer}
  </div>
);

interface ModuleBulletsProps {
  intro: React.ReactNode;
  checkClass: string;
  children: React.ReactNode;
}

/** Parágrafo introdutório seguido da lista de recursos. */
export const ModuleBullets: React.FC<ModuleBulletsProps> = ({ intro, checkClass, children }) => (
  <>
    <p>{intro}</p>
    <ul className="space-y-1.5 pl-1">
      {React.Children.map(children, (child) => (
        <li className="flex items-start gap-2">
          <CheckCircle2 className={`w-3.5 h-3.5 ${checkClass} shrink-0 mt-0.5`} />
          {child}
        </li>
      ))}
    </ul>
  </>
);

interface ModuleNavButtonProps {
  onNavigate?: (tab: string) => void;
  target: string;
  colorClass: string;
  label: React.ReactNode;
}

export const ModuleNavButton: React.FC<ModuleNavButtonProps> = ({ onNavigate, target, colorClass, label }) => {
  if (!onNavigate) return null;
  return (
    <button
      onClick={() => onNavigate(target)}
      className={`mt-3 w-full py-2 ${colorClass} rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer`}
    >
      <span>{label}</span>
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
};
