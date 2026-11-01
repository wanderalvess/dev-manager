import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigService } from '../ConfigService';
import { InfrActiveEnvService } from './InfrActiveEnvService';
import type { InfrContainerInfo, InfrEnvironment, InfrEnvironmentsResult } from '../../../shared/infrWinthorVersion';

const c = (name: string, state: string, ports = ''): InfrContainerInfo => ({ name, image: 'img', state, ports });
const develop: InfrEnvironment = {
  name: 'develop',
  oracle: c('oracle-develop', 'running', '0.0.0.0:1540->1521/tcp'),
  wta: c('wta-develop', 'running', '0.0.0.0:8087->8080/tcp, 0.0.0.0:8187->8101/tcp'),
  wsh: c('wsh-develop', 'running', '0.0.0.0:9040->9040/tcp')
};
const parado: InfrEnvironment = { name: '39', wta: c('wta-39', 'exited') };

/** Usa o ConfigService de verdade: é ele que decide se a senha e o token acompanham uma troca de URL. */
describe('InfrActiveEnvService', () => {
  let configDir: string;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;
  let config: ConfigService;
  let result: InfrEnvironmentsResult;
  const service = () => new InfrActiveEnvService({ listEnvironments: async () => result }, config);

  beforeEach(() => {
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-config-'));
    originalConfigDir = process.env.CONFIG_DIR;
    originalAppData = process.env.APPDATA;
    process.env.CONFIG_DIR = configDir;
    delete process.env.APPDATA;
    config = new ConfigService();
    result = { success: true, distro: 'ubuntu2604-winthor', environments: [develop, parado], oracles: [], wshJars: [] };
  });

  afterEach(() => {
    fs.rmSync(configDir, { recursive: true, force: true });
    if (originalConfigDir === undefined) delete process.env.CONFIG_DIR;
    else process.env.CONFIG_DIR = originalConfigDir;
    if (originalAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = originalAppData;
  });

  it('lista os ambientes com as portas reais e marca o ativo', async () => {
    config.saveSettings({ activeEnvironment: 'develop', wtaUrl: 'http://localhost:8889' });
    const res = await service().list();
    expect(res.environments.map((e) => e.name)).toEqual(['develop', '39']);
    expect(res.environments[0].wtaUrl).toBe('http://localhost:8087');
    expect(res.active).toBe('develop');
    expect(res.stale).toBe(true);
  });

  it('escolher o ambiente aponta WTA, Rotina 801 e SSH do Karaf, e a senha do WTA continua salva', async () => {
    config.saveSettings({ wtaUrl: 'http://localhost:8889', wtaLogin: 'PCADMIN', wtaPassword: 'segredo', wtaAuthToken: 'TOKEN-DO-OUTRO-WTA' });
    const res = await service().apply({ name: 'develop' });
    expect(res.success).toBe(true);
    expect(res.changes.map((x) => x.label)).toEqual(['URL do WTA', 'URL da Rotina 801', 'Porta SSH do Karaf']);
    const s = config.getSettings();
    expect(s).toMatchObject({ activeEnvironment: 'develop', wtaUrl: 'http://localhost:8087', routine801Url: 'http://localhost:8087', karafSshPort: 8187, wtaLogin: 'PCADMIN', wtaPassword: 'segredo' });
    // O token era de outro WTA: não vai junto
    expect(s.wtaAuthToken ?? '').toBe('');
    expect((await service().list()).stale).toBe(false);
  });

  it('com o WTA parado, usa o padrão da versão e avisa', async () => {
    const res = await service().apply({ name: '39' });
    expect(res.success).toBe(true);
    expect(res.env?.portsSource).toBe('versao');
    expect(res.note).toContain('padrão da versão');
    expect(config.getSettings().wtaUrl).toBe('http://localhost:8039');
  });

  it('com o WTA parado e nome livre, só grava o nome e não muda as URLs', async () => {
    result.environments = [{ name: 'suporte_38', wta: c('wta-suporte_38', 'exited') }];
    config.saveSettings({ wtaUrl: 'http://localhost:8889' });
    const res = await service().apply({ name: 'suporte_38' });
    expect(res.success).toBe(true);
    expect(res.note).toContain('não sabe a porta');
    expect(config.getSettings()).toMatchObject({ activeEnvironment: 'suporte_38', wtaUrl: 'http://localhost:8889' });
  });

  it('recusa nome inválido e ambiente que não existe, sem gravar nada', async () => {
    expect((await service().apply({ name: 'a;b' })).success).toBe(false);
    const missing = await service().apply({ name: 'naoexiste' });
    expect(missing.success).toBe(false);
    expect(missing.error).toContain('wta-naoexiste');
    expect(config.getSettings().activeEnvironment ?? '').toBe('');
  });

  it('repassa o erro de quem lista os ambientes', async () => {
    result = { success: false, error: 'docker travado', environments: [], oracles: [], wshJars: [] };
    expect((await service().list()).error).toBe('docker travado');
    expect((await service().apply({ name: 'develop' })).error).toBe('docker travado');
  });

  it('limpar tira o ambiente ativo e deixa as URLs como estão', async () => {
    await service().apply({ name: 'develop' });
    service().clear();
    const s = config.getSettings();
    expect(s.activeEnvironment ?? '').toBe('');
    expect(s.wtaUrl).toBe('http://localhost:8087');
  });
});
