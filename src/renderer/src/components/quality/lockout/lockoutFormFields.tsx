import React from 'react';

export const FIELD_CLASS =
  'w-full h-10 bg-card border border-border rounded-[10px] px-3 text-sm text-foreground focus:outline-hidden focus:border-primary';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'number';
  mono?: boolean;
  disabled?: boolean;
}

/** Campo de texto com rótulo e dica, no padrão dos formulários da Homologação. */
export const TextField: React.FC<TextFieldProps> = ({ id, label, value, onChange, hint, placeholder, type = 'text', mono, disabled }) => (
  <div className="space-y-1">
    <label htmlFor={id} className="text-xs font-bold text-foreground block">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${FIELD_CLASS} ${mono ? 'font-mono' : ''}`}
      placeholder={placeholder}
      autoComplete={type === 'password' ? 'new-password' : 'off'}
      spellCheck={false}
      disabled={disabled}
    />
    {hint && <p className="text-2xs text-muted-foreground">{hint}</p>}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-2xs font-bold uppercase tracking-wide text-muted-foreground pt-1">{children}</h4>
);
