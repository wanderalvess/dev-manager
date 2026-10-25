import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigService } from './ConfigService';
import type { IntegrationFlowDefinition, IntegrationLayerConfig } from '../../shared/integrationTypes';

/** Camadas e fluxos do Rastreio de Integração (decisão 0003) atravessam o ConfigService como os outros segredos. */
describe('ConfigService: Rastreio de Integração', () => {
  let tmpDir: string;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;

  const chLayer: IntegrationLayerConfig = {
    layer: 'ch',
    baseUrl: 'http://localhost:9000',
    healthPath: '/health',
    auth: { type: 'basic', user: 'hub', password: 'segredo-ch' }
  };
  const flow: IntegrationFlowDefinition = {
    id: 'venda',
    name: 'Venda',
    chBatchType: 'VENDA',
    evidence: { pdvQuery: 'select 1', pdvWaitSeconds: 60 }
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-integration-'));
    originalConfigDir = process.env.CONFIG_DIR;
    originalAppData = process.env.APPDATA;
    process.env.CONFIG_DIR = tmpDir;
    delete process.env.APPDATA;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (originalConfigDir === undefined) delete process.env.CONFIG_DIR;
    else process.env.CONFIG_DIR = originalConfigDir;
    if (originalAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = originalAppData;
  });

  it('grava a senha da camada criptografada em disco, mas getSettings() devolve texto plano', () => {
    const service = new ConfigService();
    service.saveSettings({ integrationLayers: [chLayer], integrationFlows: [flow] });

    const raw = fs.readFileSync(service.getConfigFilePath(), 'utf-8');
    expect(raw).not.toContain('segredo-ch');
    expect(raw).toContain('enc:v1:');

    const reloaded = new ConfigService().getSettings();
    expect(reloaded.integrationLayers?.[0].auth?.password).toBe('segredo-ch');
    expect(reloaded.integrationFlows).toEqual([flow]);
  });

  it('sanitizeSecrets esconde a senha e sinaliza que existe', () => {
    const service = new ConfigService();
    service.saveSettings({ integrationLayers: [chLayer] });

    const sanitized = service.sanitizeSecrets(service.getSettings());
    expect(sanitized.integrationLayers?.[0].auth).toEqual({ type: 'basic', user: 'hub', password: '', token: '', hasPassword: true, hasToken: false });
  });

  it('preserva a senha quando a tela salva o objeto sanitizado de volta', () => {
    const service = new ConfigService();
    service.saveSettings({ integrationLayers: [chLayer] });
    const sanitized = service.sanitizeSecrets(service.getSettings());

    service.saveSettings({ integrationLayers: sanitized.integrationLayers });

    expect(service.getSettings().integrationLayers?.[0].auth?.password).toBe('segredo-ch');
  });

  it('importSettings traz camadas e fluxos e não leva a senha para outra baseUrl', () => {
    const service = new ConfigService();
    service.saveSettings({ integrationLayers: [chLayer] });

    const result = service.importSettings(
      JSON.stringify({
        integrationLayers: [{ ...chLayer, baseUrl: 'http://outro:9000', auth: { type: 'basic', user: 'hub', password: '' } }],
        integrationFlows: [flow]
      })
    );

    expect(result.success).toBe(true);
    const settings = service.getSettings();
    expect(settings.integrationLayers?.[0].auth?.password).toBe('');
    expect(settings.integrationFlows).toEqual([flow]);
  });
});
