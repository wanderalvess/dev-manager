import React from 'react';
import type {
  IntegrationLayerAuth,
  IntegrationLayerAuthType,
  IntegrationLayerId
} from '../../../../../shared/integrationTypes';
import { INPUT_CLASS, IntegrationField } from './IntegrationField';
import { authOptionsFor, defaultAuthType } from './authOptions';
import { SecretInput } from './SecretInput';

interface IntegrationLayerAuthFieldsProps {
  idPrefix: string;
  layer: IntegrationLayerId;
  auth: IntegrationLayerAuth | undefined;
  onChange: (patch: Partial<IntegrationLayerAuth>) => void;
  /** Usuário do login do WinThor salvo nas Configurações, quando a camada o reaproveita. */
  hubLogin?: string;
}

export const IntegrationLayerAuthFields: React.FC<IntegrationLayerAuthFieldsProps> = ({ idPrefix, layer, auth, onChange, hubLogin }) => {
  const type = auth?.type ?? defaultAuthType(layer);
  const usesUser = type === 'basic' || type === 'winthor' || type === 'rac-password';
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-border/60">
      <IntegrationField id={`${idPrefix}-auth-type`} label="Autenticação">
        <select
          id={`${idPrefix}-auth-type`}
          value={type}
          onChange={(e) => onChange({ type: e.target.value as IntegrationLayerAuthType })}
          className={INPUT_CLASS}
        >
          {authOptionsFor(layer).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </IntegrationField>
      {type === 'hub-winthor' && (
        <p className="md:col-span-2 self-end text-2xs text-muted-foreground pb-2">
          {hubLogin
            ? `Usa o login "${hubLogin}" salvo em Diretórios & IDE → WinThor Start. Nada é digitado de novo aqui.`
            : 'Nenhum login do WinThor salvo em Diretórios & IDE → WinThor Start: o pré-voo não testa o login até ele ser preenchido lá.'}
        </p>
      )}
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
      {type === 'rac-password' && (
        <>
          <IntegrationField id={`${idPrefix}-auth-clientId`} label="client_id">
            <input
              id={`${idPrefix}-auth-clientId`}
              type="text"
              value={auth?.clientId || ''}
              onChange={(e) => onChange({ clientId: e.target.value })}
              className={INPUT_CLASS}
              autoComplete="off"
            />
          </IntegrationField>
          <SecretInput
            id={`${idPrefix}-auth-clientSecret`}
            label="client_secret"
            value={auth?.clientSecret}
            saved={auth?.hasClientSecret}
            onChange={(clientSecret) => onChange({ clientSecret })}
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
