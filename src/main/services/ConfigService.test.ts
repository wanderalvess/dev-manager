import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
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

  it('retorna o caminho correto do arquivo de configuração via getConfigFilePath', () => {
    const service = new ConfigService();
    expect(service.getConfigFilePath()).toBe(path.join(tmpDir, 'config.json'));
  });

  it('importSettings importa deployProfiles e propriedades adicionais com sucesso', () => {
    const service = new ConfigService();
    const customDeployProfiles = [
      {
        id: 'deploy-custom-1',
        name: 'Deploy Maven + Karaf',
        steps: [
          {
            id: 'step-1',
            name: 'Build Maven',
            type: 'maven-build' as const,
            enabled: true,
            projectPath: 'C:/projetos/meu-servico'
          }
        ]
      }
    ];

    const jsonToImport = JSON.stringify({
      deployProfiles: customDeployProfiles,
      activeDeployProfileId: 'deploy-custom-1',
      webPort: 9090,
      webPath: '/custom-portal',
      karafSshPort: 8102,
      routineFileExtensions: ['.EXE', '.PC'],
      routineLauncherMap: { '.PC': 'C:/launcher.exe' }
    });

    const res = service.importSettings(jsonToImport);
    expect(res.success).toBe(true);
    expect(res.settings?.deployProfiles).toEqual(customDeployProfiles);
    expect(res.settings?.activeDeployProfileId).toBe('deploy-custom-1');
    expect(res.settings?.webPort).toBe(9090);
    expect(res.settings?.webPath).toBe('/custom-portal');
    expect(res.settings?.karafSshPort).toBe(8102);
    expect(res.settings?.routineFileExtensions).toEqual(['.EXE', '.PC']);
    expect(res.settings?.routineLauncherMap).toEqual({ '.PC': 'C:/launcher.exe' });
  });

  describe('cache em memória de getSettings', () => {
    it('não relê o disco em chamadas repetidas enquanto o arquivo não muda', () => {
      const service = new ConfigService();
      service.saveSettings({ appPath: 'C:/app-1' });

      const readSpy = vi.spyOn(fs, 'readFileSync');
      const first = service.getSettings();
      const second = service.getSettings();

      expect(readSpy).not.toHaveBeenCalled();
      expect(first).toEqual(second);
      readSpy.mockRestore();
    });

    it('saveSettings atualiza o cache imediatamente, sem exigir nova leitura de disco', () => {
      const service = new ConfigService();
      service.saveSettings({ appPath: 'C:/app-1' });

      const readSpy = vi.spyOn(fs, 'readFileSync');
      const settings = service.getSettings();

      expect(settings.appPath).toBe('C:/app-1');
      expect(readSpy).not.toHaveBeenCalled();
      readSpy.mockRestore();
    });

    it('invalida o cache e relê quando o arquivo é modificado externamente (mtime muda)', () => {
      const service = new ConfigService();
      service.saveSettings({ appPath: 'C:/app-1' });
      expect(service.getSettings().appPath).toBe('C:/app-1');

      const configPath = service.getConfigFilePath();
      fs.writeFileSync(configPath, JSON.stringify({ appPath: 'C:/app-2' }), 'utf-8');
      // Garante mtime estritamente maior, independente da resolução do relógio do FS.
      const future = new Date(Date.now() + 5000);
      fs.utimesSync(configPath, future, future);

      expect(service.getSettings().appPath).toBe('C:/app-2');
    });

    it('cada instância de ConfigService tem seu próprio cache (não vaza entre instâncias)', () => {
      const serviceA = new ConfigService();
      serviceA.saveSettings({ appPath: 'C:/de-a' });

      const serviceB = new ConfigService();
      expect(serviceB.getSettings().appPath).toBe('C:/de-a');

      serviceB.saveSettings({ appPath: 'C:/de-b' });
      // serviceA só deve enxergar a mudança externa após seu próprio cache expirar por mtime.
      expect(serviceA.getSettings().appPath).toBe('C:/de-b');
    });
  });
});
