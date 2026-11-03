import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nome lido pelo leitor de tela (o switch não tem texto próprio). */
  label: string;
  disabled?: boolean;
  title?: string;
  size?: 'sm' | 'md';
}

/** Liga/desliga único do app: mesma forma em Módulos, listas de serviços, portas e integrações. */
export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled, title, size = 'md' }) => {
  const track = size === 'sm' ? 'h-5 w-9' : 'h-6 w-11';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const shift = size === 'sm' ? 'translate-x-4' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex ${track} shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? 'bg-primary' : 'bg-muted-foreground/30'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block ${knob} transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
          checked ? shift : 'translate-x-0'
        }`}
      />
    </button>
  );
};
