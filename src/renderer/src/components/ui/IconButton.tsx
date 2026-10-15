import React from 'react';

type IconButtonTone = 'neutral' | 'active' | 'danger';
type IconButtonSize = 'sm' | 'md';

export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  /** Nome acessível do botão (obrigatório: botão só de ícone não tem texto visível). Também é o tooltip padrão. */
  label: string;
  icon: React.ReactNode;
  tone?: IconButtonTone;
  size?: IconButtonSize;
}

const SIZE_CLASS: Record<IconButtonSize, string> = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9'
};

const TONE_CLASS: Record<IconButtonTone, string> = {
  neutral:
    'bg-card/50 hover:bg-card border-border/60 hover:border-border text-muted-foreground hover:text-foreground',
  active: 'bg-primary text-primary-foreground border-primary shadow-2xs',
  danger: 'bg-card/50 hover:bg-destructive/10 border-border/60 hover:border-destructive/40 text-destructive'
};

/**
 * Botão só de ícone do app: `label` é obrigatório (aria-label + tooltip), o foco por teclado é sempre visível e o
 * visual segue os tokens do tema. Use no lugar de `<button title="...">` com um ícone dentro.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  label,
  icon,
  tone = 'neutral',
  size = 'md',
  title,
  className = '',
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    aria-label={label}
    title={title ?? label}
    className={`${SIZE_CLASS[size]} ${TONE_CLASS[tone]} rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none ${className}`}
    {...rest}
  >
    {icon}
  </button>
);
