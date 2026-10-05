import React from 'react';

interface DeployDiagCommandButtonProps {
  icon: React.ReactNode;
  label: string;
  command: string;
  title?: string;
  fill?: boolean;
  disabled: boolean;
  onClick: () => void;
}

/** Botão grande de comando Karaf com rótulo e comando em fonte mono. */
export const DeployDiagCommandButton: React.FC<DeployDiagCommandButtonProps> = ({
  icon,
  label,
  command,
  title,
  fill,
  disabled,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`${fill ? 'flex-1 ' : ''}p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer`}
    title={title}
  >
    {icon}
    <div className="truncate">
      <span className="font-semibold block truncate">{label}</span>
      <span className="text-2xs text-muted-foreground font-mono">{command}</span>
    </div>
  </button>
);

interface DeployDiagActionButtonProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
}

/** Botão compacto de ação pontual (por feature ou bundle). */
export const DeployDiagActionButton: React.FC<DeployDiagActionButtonProps> = ({
  icon,
  label,
  title,
  danger,
  disabled,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={
      danger
        ? 'px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-md text-[11px] font-medium text-rose-600 dark:text-rose-400 disabled:opacity-40 cursor-pointer transition flex items-center gap-1 ml-auto'
        : 'px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-md text-[11px] font-medium text-foreground disabled:opacity-40 cursor-pointer transition flex items-center gap-1'
    }
    title={title}
  >
    {icon}
    <span>{label}</span>
  </button>
);
