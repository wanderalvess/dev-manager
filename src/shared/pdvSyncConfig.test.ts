import { describe, expect, it } from 'vitest';
import type { IntegrationLayerConfig } from './integrationTypes';
import {
  missingLoginFields,
  missingLookupFields,
  toPdvSyncCredentials,
  toPdvSyncSettings,
  usesPdvSyncLogin
} from './pdvSyncConfig';

const full = (): IntegrationLayerConfig => ({
  layer: 'ch',
  pdvsync: {
    racUrl: ' https://rac.exemplo/token ',
    tenantId: ' T1 ',
    batchStatusUrl: 'https://pdv.exemplo/LoteExternoRetornos',
    storeStatusUrl: ' '
  },
  auth: { type: 'rac-password', user: ' svc ', password: 'p@ss ', clientId: ' cli ', clientSecret: 's3gredo' }
});

describe('pdvSyncConfig', () => {
  it('só a camada CH com autenticação RAC usa o login do PDVSync', () => {
    expect(usesPdvSyncLogin(full())).toBe(true);
    expect(usesPdvSyncLogin({ ...full(), layer: 'wsh' })).toBe(false);
    expect(usesPdvSyncLogin({ ...full(), auth: { type: 'basic' } })).toBe(false);
    expect(usesPdvSyncLogin(undefined)).toBe(false);
  });

  it('lista, com o nome que o usuário vê, o que falta para o login e para a consulta', () => {
    expect(missingLoginFields(full())).toEqual([]);
    expect(missingLookupFields(full())).toEqual([]);

    const empty: IntegrationLayerConfig = { layer: 'ch', auth: { type: 'rac-password' } };
    expect(missingLoginFields(empty)).toEqual(['endereço do login (RAC)', 'usuário', 'senha', 'client_id', 'client_secret']);
    expect(missingLookupFields(empty)).toEqual([...missingLoginFields(empty), 'inquilino', 'endereço de consulta do lote']);
  });

  it('na tela, o segredo salvo (só o sinal) conta como preenchido; no backend não', () => {
    const sanitized: IntegrationLayerConfig = {
      ...full(),
      auth: { type: 'rac-password', user: 'svc', password: '', clientId: 'cli', clientSecret: '', hasPassword: true, hasClientSecret: true }
    };

    expect(missingLookupFields(sanitized, true)).toEqual([]);
    expect(missingLoginFields(sanitized, true)).toEqual([]);
    expect(missingLoginFields(sanitized)).toEqual(['senha', 'client_secret']);
    expect(toPdvSyncSettings(sanitized)).toBeNull();
    expect(missingLoginFields({ ...sanitized, auth: { ...sanitized.auth!, hasClientSecret: false } }, true)).toEqual(['client_secret']);
  });

  it('campo só com espaços conta como faltando', () => {
    const layer = full();
    layer.auth = { ...layer.auth!, user: '   ', clientId: '' };
    expect(missingLoginFields(layer)).toEqual(['usuário', 'client_id']);
  });

  it('monta a configuração aparando espaços e preservando a senha e o segredo como estão', () => {
    expect(toPdvSyncSettings(full())).toEqual({
      credentials: { racUrl: 'https://rac.exemplo/token', username: 'svc', password: 'p@ss ', clientId: 'cli', clientSecret: 's3gredo' },
      target: { tenantId: 'T1', batchStatusUrl: 'https://pdv.exemplo/LoteExternoRetornos', storeStatusUrl: undefined }
    });
  });

  it('configuração incompleta ou de outra camada não vira configuração', () => {
    expect(toPdvSyncSettings({ ...full(), pdvsync: { ...full().pdvsync, tenantId: '' } })).toBeNull();
    expect(toPdvSyncSettings({ ...full(), layer: 'pdv' })).toBeNull();
    expect(toPdvSyncSettings(undefined)).toBeNull();
  });

  it('para o pré-voo basta o login: inquilino e endereço de consulta não são exigidos', () => {
    const layer = full();
    layer.pdvsync = { racUrl: 'https://rac.exemplo/token' };
    expect(toPdvSyncSettings(layer)).toBeNull();
    expect(toPdvSyncCredentials(layer)).toMatchObject({ racUrl: 'https://rac.exemplo/token', username: 'svc' });
  });
});
