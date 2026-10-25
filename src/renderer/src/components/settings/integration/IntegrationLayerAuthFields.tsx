import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { IntegrationLayerAuth, IntegrationLayerAuthType } from '../../../../../shared/integrationTypes';
import { INPUT_CLASS, IntegrationField } from './IntegrationField';

interface IntegrationLayerAuthFieldsProps {
  idPrefix: string;
  auth: IntegrationLayerAuth | undefined;
  onChange: (patch: Partial<IntegrationLayerAuth>) => void;
}

const AUTH_OPTIONS: { value: IntegrationLayerAuthType; label: string }[] = [
  { value: 'none', label: 'Sem autenticação' },
  { value: 'basic', label: 'Usuário e senha (Basic)' },
  { value: 'bearer', label: 'Token (Bearer)' },
  { value: 'winthor', label: 'Login do WinThor (usuário e senha)' }
];

interface SecretInputProps {
  id: string;
  label: string;
  value: string | undefined;
  saved: boolean | undefined;
  onChange: (value: string) => void;
}

/** Campo de segredo: nunca recebe o valor salvo de volta, só o sinal de que existe. */
const SecretInput: React.FC<SecretInputProps> = ({ id, label, value, saved, onChange }) => {
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

export const IntegrationLayerAuthFields: React.FC<IntegrationLayerAuthFieldsProps> = ({ idPrefix, auth, onChange }) => {
  const type = auth?.type ?? 'none';
  const usesUser = type === 'basic' || type === 'winthor';
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-border/60">
      <IntegrationField id={`${idPrefix}-auth-type`} label="Autenticação">
        <select
          id={`${idPrefix}-auth-type`}
          value={type}
          onChange={(e) => onChange({ type: e.target.value as IntegrationLayerAuthType })}
          className={INPUT_CLASS}
        >
          {AUTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </IntegrationField>
      {usesUser && (
        <>
          <IntegrationField id={`${idPrefix}-auth-user`} label="Usuário">
            <input
              id={`${idPrefix}-auth-user`}
              type="text"
              value={auth?.user || ''}
              onChange={(e) => onChange({ user: e.target.value })}
              className={INPUT_CLASS}
              autoComplete="off"
            />
          </IntegrationField>
          <SecretInput
            id={`${idPrefix}-auth-password`}
            label="Senha"
            value={auth?.password}
            saved={auth?.hasPassword}
            onChange={(password) => onChange({ password })}
          />
        </>
      )}
      {type === 'bearer' && (
        <SecretInput
          id={`${idPrefix}-auth-token`}
          label="Token"
          value={auth?.token}
          saved={auth?.hasToken}
          onChange={(token) => onChange({ token })}
        />
      )}
    </div>
  );
};
