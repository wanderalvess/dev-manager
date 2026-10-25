import React from 'react';

/** Mesmo campo das outras abas de Configurações (Karaf, Diretórios): fundo de cartão, borda e fonte mono. */
export const INPUT_CLASS =
  'w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono focus:outline-hidden focus:border-primary';

interface IntegrationFieldProps {
  id: string;
  label: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Rótulo + controle + dica, no padrão visual das Configurações. */
export const IntegrationField: React.FC<IntegrationFieldProps> = ({ id, label, hint, className, children }) => (
  <div className={className}>
    <label htmlFor={id} className="block font-bold text-foreground mb-1 text-xs">
      {label}
    </label>
    {children}
    {hint && <p className="text-2xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);
