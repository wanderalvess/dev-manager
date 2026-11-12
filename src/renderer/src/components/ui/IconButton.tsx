import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  tone?: 'neutral' | 'active';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  tone = 'neutral',
  className = '',
  ...rest
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 ${
      tone === 'active'
        ? 'bg-primary/15 border-primary/40 text-primary'
        : 'bg-card/70 hover:bg-card border-border/70 hover:border-border text-muted-foreground hover:text-foreground'
    } ${className}`}
    {...rest}
  >
    {icon}
  </button>
);
