import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigService, DEFAULT_AUTOMATION_PROFILES } from './ConfigService';

describe('ConfigService', () => {
  let tmpDir: string;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-test-'));
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

  it('gera configurações padrão agnósticas quando não existe config.json', () => {
    const service = new ConfigService();
    const settings = service.getSettings();

    expect(settings.trackedServices).toEqual([]);
    expect(settings.trackedProcesses).toEqual([]);
    expect(settings.automationProfiles).toEqual(DEFAULT_AUTOMATION_PROFILES);
    expect(settings.automationProfiles?.[0].isDefault).not.toBe(true);
  });

  it('persiste e relê configurações salvas', () => {
    const service = new ConfigService();
    service.saveSettings({ appPath: 'C:/meu-app', karafPath: 'C:/karaf' });

    const reloaded = new ConfigService().getSettings();
    expect(reloaded.appPath).toBe('C:/meu-app');
    expect(reloaded.karafPath).toBe('C:/karaf');
  });

  it('lê config.json legado com chave winthorPath como fallback', () => {
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ winthorPath: 'C:/instalacao-antiga', winthorWebPort: 9999 }),
      'utf-8'
    );

    const settings = new ConfigService().getSettings();
    expect(settings.appPath).toBe('C:/instalacao-antiga');
    expect(settings.webPort).toBe(9999);
  });

  it('appPath explícito tem prioridade sobre winthorPath legado', () => {
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify({ appPath: 'C:/novo', winthorPath: 'C:/antigo' }),
      'utf-8'
    );

    const settings = new ConfigService().getSettings();
    expect(settings.appPath).toBe('C:/novo');
  });

  it('nunca regrava a chave legada winthorPath no disco ao salvar', () => {
    const configPath = path.join(tmpDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ winthorPath: 'C:/antigo' }), 'utf-8');

    const service = new ConfigService();
    service.saveSettings({ karafUser: 'admin' });

    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(raw.winthorPath).toBeUndefined();
    expect(raw.appPath).toBe('C:/antigo');
  });

  it('mantém favoritos e perfis customizados entre leituras', () => {
    const service = new ConfigService();
    service.saveSettings({ favoriteRoutines: ['PCROT01.EXE'] });

    const settings = service.getSettings();
    expect(settings.favoriteRoutines).toEqual(['PCROT01.EXE']);
  });
});
