import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { IntegrationLayerConfig } from '../../../shared/integrationTypes';
import {
  decryptIntegrationLayersInPlace,
  encryptIntegrationLayersForDisk,
  preserveIntegrationLayerSecrets,
  sanitizeIntegrationLayers
} from './integrationSecrets';

const makeLayer = (overrides: Partial<IntegrationLayerConfig> = {}): IntegrationLayerConfig => ({
  layer: 'ch',
  baseUrl: 'http://localhost:9000',
  auth: { type: 'basic', user: 'hub', password: 'segredo', token: 'tok-1' },
  ...overrides
});

const makeRacLayer = (overrides: Partial<IntegrationLayerConfig> = {}): IntegrationLayerConfig => ({
  layer: 'ch',
  pdvsync: { racUrl: 'https://rac.exemplo/token', tenantId: 'T1' },
  auth: { type: 'rac-password', user: 'svc', password: 'senha-rac', clientId: 'cli', clientSecret: 'segredo-do-cliente' },
  ...overrides
});

describe('integrationSecrets', () => {
  let configDir: string;

  beforeEach(() => {
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-integration-secrets-'));
  });

  afterEach(() => {
    fs.rmSync(configDir, { recursive: true, force: true });
  });

  it('criptografa senha, token e client_secret para o disco e descriptografa de volta, sem tocar as camadas sem auth', () => {
    const layers = [makeLayer(), makeRacLayer({ layer: 'wsh' }), makeLayer({ layer: 'pdv', auth: undefined })];

    const forDisk = encryptIntegrationLayersForDisk(layers, configDir)!;
    expect(forDisk[0].auth?.password).toMatch(/^enc:v1:/);
    expect(forDisk[0].auth?.token).toMatch(/^enc:v1:/);
    expect(forDisk[1].auth?.clientSecret).toMatch(/^enc:v1:/);
    expect(forDisk[1].auth?.clientId).toBe('cli');
    expect(forDisk[2]).toBe(layers[2]);
    expect(JSON.stringify(forDisk)).not.toContain('segredo-do-cliente');
    // O original continua em texto plano (é o que o app usa em memória)
    expect(layers[1].auth?.clientSecret).toBe('segredo-do-cliente');

    decryptIntegrationLayersInPlace(forDisk, configDir);
    expect(forDisk[0].auth?.password).toBe('segredo');
    expect(forDisk[0].auth?.token).toBe('tok-1');
    expect(forDisk[1].auth?.clientSecret).toBe('segredo-do-cliente');
  });

  it('sanitiza os segredos e sinaliza que existem', () => {
    const sanitized = sanitizeIntegrationLayers([makeLayer(), makeRacLayer({ layer: 'wsh' }), makeLayer({ layer: 'pdv', auth: { type: 'none' } })])!;

    expect(sanitized[0].auth).toEqual({
      type: 'basic', user: 'hub', password: '', token: '', clientSecret: '', hasPassword: true, hasToken: true, hasClientSecret: false
    });
    expect(sanitized[1].auth).toMatchObject({ clientId: 'cli', clientSecret: '', hasClientSecret: true, hasPassword: true });
    expect(sanitized[2].auth).toEqual({
      type: 'none', password: '', token: '', clientSecret: '', hasPassword: false, hasToken: false, hasClientSecret: false
    });
  });

  it('preserva o segredo salvo quando o save volta vazio e os destinos não mudaram', () => {
    const current = [makeLayer(), makeRacLayer({ layer: 'wsh' })];
    const candidate = [
      makeLayer({ auth: { type: 'basic', user: 'hub', password: '', token: '', hasPassword: true, hasToken: true } }),
      makeRacLayer({ layer: 'wsh', auth: { type: 'rac-password', user: 'svc', password: '', clientId: 'cli', clientSecret: '', hasClientSecret: true } })
    ];

    const merged = preserveIntegrationLayerSecrets(candidate, current)!;
    expect(merged[0].auth).toEqual({ type: 'basic', user: 'hub', password: 'segredo', token: 'tok-1', clientSecret: '' });
    expect(merged[1].auth).toEqual({ type: 'rac-password', user: 'svc', password: 'senha-rac', token: '', clientId: 'cli', clientSecret: 'segredo-do-cliente' });
  });

  it('não leva o segredo salvo para outra baseUrl', () => {
    const merged = preserveIntegrationLayerSecrets(
      [makeLayer({ baseUrl: 'http://outro-host:9000', auth: { type: 'basic', user: 'hub', password: '' } })],
      [makeLayer()]
    )!;
    expect(merged[0].auth?.password).toBe('');
    expect(merged[0].auth?.token).toBe('');
  });

  it('não leva o client_secret nem a senha para outro endereço de login (RAC)', () => {
    const merged = preserveIntegrationLayerSecrets(
      [makeRacLayer({ pdvsync: { racUrl: 'https://rac-falso.exemplo/token', tenantId: 'T1' }, auth: { type: 'rac-password', user: 'svc', password: '', clientId: 'cli', clientSecret: '' } })],
      [makeRacLayer()]
    )!;
    expect(merged[0].auth?.clientSecret).toBe('');
    expect(merged[0].auth?.password).toBe('');
  });

  it('mudar só o inquilino ou o endereço de consulta não derruba o segredo', () => {
    const merged = preserveIntegrationLayerSecrets(
      [makeRacLayer({ pdvsync: { racUrl: 'https://rac.exemplo/token', tenantId: 'T2', batchStatusUrl: 'https://x.exemplo/lote' }, auth: { type: 'rac-password', user: 'svc', clientSecret: '' } })],
      [makeRacLayer()]
    )!;
    expect(merged[0].auth?.clientSecret).toBe('segredo-do-cliente');
  });

  it('um segredo novo no candidato sempre vence o salvo', () => {
    const merged = preserveIntegrationLayerSecrets([makeLayer({ auth: { type: 'bearer', token: 'novo' } })], [makeLayer()])!;
    expect(merged[0].auth?.token).toBe('novo');
    expect(merged[0].auth?.password).toBe('segredo');
  });

  it('devolve o candidato intacto quando não é lista', () => {
    expect(preserveIntegrationLayerSecrets(undefined, [makeLayer()])).toBeUndefined();
  });
});
