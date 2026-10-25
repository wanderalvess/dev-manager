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

describe('integrationSecrets', () => {
  let configDir: string;

  beforeEach(() => {
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-integration-secrets-'));
  });

  afterEach(() => {
    fs.rmSync(configDir, { recursive: true, force: true });
  });

  it('criptografa senha e token para o disco e descriptografa de volta, sem tocar as camadas sem auth', () => {
    const layers = [makeLayer(), makeLayer({ layer: 'pdv', auth: undefined })];

    const forDisk = encryptIntegrationLayersForDisk(layers, configDir)!;
    expect(forDisk[0].auth?.password).toMatch(/^enc:v1:/);
    expect(forDisk[0].auth?.token).toMatch(/^enc:v1:/);
    expect(forDisk[1]).toBe(layers[1]);
    // O original continua em texto plano (é o que o app usa em memória)
    expect(layers[0].auth?.password).toBe('segredo');

    decryptIntegrationLayersInPlace(forDisk, configDir);
    expect(forDisk[0].auth?.password).toBe('segredo');
    expect(forDisk[0].auth?.token).toBe('tok-1');
  });

  it('sanitiza os segredos e sinaliza que existem', () => {
    const sanitized = sanitizeIntegrationLayers([makeLayer(), makeLayer({ layer: 'wsh', auth: { type: 'none' } })])!;

    expect(sanitized[0].auth).toEqual({ type: 'basic', user: 'hub', password: '', token: '', hasPassword: true, hasToken: true });
    expect(sanitized[1].auth).toEqual({ type: 'none', password: '', token: '', hasPassword: false, hasToken: false });
  });

  it('preserva o segredo salvo quando o save volta vazio e a baseUrl não mudou', () => {
    const current = [makeLayer()];
    const candidate = [makeLayer({ auth: { type: 'basic', user: 'hub', password: '', token: '', hasPassword: true, hasToken: true } })];

    const merged = preserveIntegrationLayerSecrets(candidate, current)!;
    expect(merged[0].auth).toEqual({ type: 'basic', user: 'hub', password: 'segredo', token: 'tok-1' });
  });

  it('não leva o segredo salvo para outra baseUrl', () => {
    const current = [makeLayer()];
    const candidate = [makeLayer({ baseUrl: 'http://outro-host:9000', auth: { type: 'basic', user: 'hub', password: '' } })];

    const merged = preserveIntegrationLayerSecrets(candidate, current)!;
    expect(merged[0].auth?.password).toBe('');
    expect(merged[0].auth?.token).toBe('');
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
