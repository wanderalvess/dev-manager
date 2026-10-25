import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { INPUT_CLASS } from './IntegrationField';

interface SecretInputProps {
  id: string;
  label: string;
  value: string | undefined;
  /** O servidor já tem um valor salvo (só vem o sinal, nunca o segredo). */
  saved: boolean | undefined;
  onChange: (value: string) => void;
}

/** Campo de segredo: nunca recebe o valor salvo de volta, só o sinal de que existe. */
export const SecretInput: React.FC<SecretInputProps> = ({ id, label, value, saved, onChange }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="font-bold text-foreground mb-1 text-xs flex items-center justify-between">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="text-2xs text-muted-foreground hover:text-foreground font-normal flex items-center gap-1 cursor-pointer"
        >
          {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          <span>{show ? 'Ocultar' : 'Exibir'}</span>
        </button>
      </label>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
        placeholder={saved ? '(Segredo salvo e protegido)' : ''}
        autoComplete="off"
      />
      {saved && !value && (
        <p className="text-2xs text-success mt-1 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Salvo e protegido. Deixe em branco para manter ou digite para alterar.</span>
        </p>
      )}
    </div>
  );
};
