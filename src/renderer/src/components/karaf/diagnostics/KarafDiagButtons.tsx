import React from 'react';

interface KarafDiagCommandButtonProps {
  icon: React.ReactNode;
  label: string;
  command: string;
  title?: string;
  disabled: boolean;
  onClick: () => void;
}

/** Botão grande de comando Karaf com rótulo e comando em fonte mono. */
export const KarafDiagCommandButton: React.FC<KarafDiagCommandButtonProps> = ({
  icon,
  label,
  command,
  title,
  disabled,
  onClick
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`p-2 bg-card hover:bg-muted/50 border border-border/70 hover:border-border rounded-lg text-left transition-colors text-xs flex items-center gap-2 text-foreground disabled:opacity-50 cursor-pointer`}
    title={title}
  >
    {icon}
    <div className="truncate">
      <span className="font-semibold block truncate">{label}</span>
      <span className="text-2xs text-muted-foreground font-mono">{command}</span>
    </div>
  </button>
);

interface KarafDiagActionButtonProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  danger?: boolean;
  disabled: boolean;
  onClick: () => void;
}

/** Botão compacto de ação pontual (por feature ou bundle). */
export const KarafDiagActionButton: React.FC<KarafDiagActionButtonProps> = ({
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
        ? 'px-2.5 py-1 bg-danger/10 hover:bg-danger/20 rounded-md text-2xs font-medium text-danger disabled:opacity-50 cursor-pointer transition flex items-center gap-1 ml-auto'
        : 'px-2.5 py-1 bg-card hover:bg-muted border border-border rounded-md text-2xs font-medium text-foreground disabled:opacity-50 cursor-pointer transition flex items-center gap-1'
    }
    title={title}
  >
    {icon}
    <span>{label}</span>
  </button>
);
