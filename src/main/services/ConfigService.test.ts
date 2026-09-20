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

  describe('sanitizeSecrets e Export/Import de segredos', () => {
    it('sanitizeSecrets limpa todos os 5 campos sensíveis (karafPass, db, confluence, jira e llm)', () => {
      const service = new ConfigService();
      const rawSettings = {
        ...service.getSettings(),
        karafPass: 'super-secret-karaf',
        databaseConnections: [
          { id: 'db-1', name: 'Oracle Prod', type: 'oracle' as const, host: 'localhost', port: 1521, database: 'XE', user: 'system', password: 'secret-db-pass' }
        ],
        confluenceSources: [
          { id: 'conf-1', name: 'Docs Wiki', baseUrl: 'https://confluence.corp', spaceKey: 'DEV', authToken: 'secret-conf-token', enabled: true }
        ],
        jiraSources: [
          { id: 'jira-1', name: 'Jira Issues', baseUrl: 'https://jira.corp', jql: 'project=DEV', authToken: 'secret-jira-token', enabled: true }
        ],
        llmProviders: [
          { id: 'llm-1', name: 'OpenAI Test', provider: 'openai' as const, model: 'gpt-4o-mini', apiKey: 'sk-test-secret-key', enabled: true }
        ]
      };

      const sanitized = service.sanitizeSecrets(rawSettings);

      expect(sanitized.karafPass).toBe('');
      expect(sanitized.databaseConnections?.[0].password).toBe('');
      expect(sanitized.confluenceSources?.[0].authToken).toBe('');
      expect(sanitized.jiraSources?.[0].authToken).toBe('');
      expect(sanitized.llmProviders?.[0].apiKey).toBe('');
      // Dados não sensíveis devem permanecer intactos
      expect(sanitized.llmProviders?.[0].name).toBe('OpenAI Test');
      expect(sanitized.llmProviders?.[0].model).toBe('gpt-4o-mini');
    });

    it('exportSettings(true) sanitiza segredos e exportSettings(false) preserva segredos', () => {
      const service = new ConfigService();
      service.saveSettings({
        karafPass: 'karaf-pass-123',
        llmProviders: [
          { id: 'llm-1', name: 'Claude', provider: 'anthropic', model: 'claude-3-5-sonnet', apiKey: 'sk-ant-secret', enabled: true }
        ]
      });

      const exportedSanitized = JSON.parse(service.exportSettings(true));
      expect(exportedSanitized.karafPass).toBe('');
      expect(exportedSanitized.llmProviders[0].apiKey).toBe('');

      const exportedRaw = JSON.parse(service.exportSettings(false));
      expect(exportedRaw.karafPass).toBe('karaf-pass-123');
      expect(exportedRaw.llmProviders[0].apiKey).toBe('sk-ant-secret');
    });

    it('importSettings preserva apiKey existente quando JSON importado não contém a chave', () => {
      const service = new ConfigService();
      service.saveSettings({
        llmProviders: [
          { id: 'llm-1', name: 'Meu Ollama', provider: 'ollama', model: 'llama3.2', apiKey: 'minha-chave-local', enabled: true }
        ],
        activeLlmProviderId: 'llm-1'
      });

      const importPayload = JSON.stringify({
        llmProviders: [
          { id: 'llm-1', name: 'Meu Ollama Renomeado', provider: 'ollama', model: 'llama3.2', apiKey: '', enabled: true }
        ],
        activeLlmProviderId: 'llm-1'
      });

      const result = service.importSettings(importPayload);
      expect(result.success).toBe(true);

      const reloaded = service.getSettings();
      expect(reloaded.llmProviders?.[0].name).toBe('Meu Ollama Renomeado');
      expect(reloaded.llmProviders?.[0].apiKey).toBe('minha-chave-local');
    });

    it('NÃO reaproveita apiKey existente quando o baseUrl importado é alterado (proteção contra exfiltração)', () => {
      const service = new ConfigService();
      service.saveSettings({
        llmProviders: [
          {
            id: 'llm-1',
            name: 'Meu Provedor',
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: 'chave-real-secreta',
            baseUrl: 'https://api.openai.com/v1',
            enabled: true
          }
        ],
        activeLlmProviderId: 'llm-1'
      });

      const importPayload = JSON.stringify({
        llmProviders: [
          {
            id: 'llm-1',
            name: 'Meu Provedor',
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: '',
            baseUrl: 'https://evil.example/v1',
            enabled: true
          }
        ],
        activeLlmProviderId: 'llm-1'
      });

      const result = service.importSettings(importPayload);
      expect(result.success).toBe(true);

      const reloaded = service.getSettings();
      expect(reloaded.llmProviders?.[0].baseUrl).toBe('https://evil.example/v1');
      expect(reloaded.llmProviders?.[0].apiKey).toBe('');
    });
  });

  describe('Criptografia de segredos em repouso', () => {
    it('grava os segredos criptografados em disco, mas getSettings() continua retornando texto plano', () => {
      const service = new ConfigService();
      service.saveSettings({
        karafPass: 'senha-karaf-123',
        databaseConnections: [
          { id: 'db-1', name: 'Oracle', type: 'oracle', host: 'localhost', port: 1521, database: 'XE', user: 'sys', password: 'senha-db-456' }
        ],
        llmProviders: [
          { id: 'llm-1', name: 'OpenAI', provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-segredo-789', enabled: true }
        ]
      });

      const rawDisk = fs.readFileSync(service.getConfigFilePath(), 'utf-8');
      expect(rawDisk).not.toContain('senha-karaf-123');
      expect(rawDisk).not.toContain('senha-db-456');
      expect(rawDisk).not.toContain('sk-segredo-789');
      expect(rawDisk).toContain('enc:v1:');

      const settings = service.getSettings();
      expect(settings.karafPass).toBe('senha-karaf-123');
      expect(settings.databaseConnections?.[0].password).toBe('senha-db-456');
      expect(settings.llmProviders?.[0].apiKey).toBe('sk-segredo-789');
    });

    it('lê corretamente config.json escrito com segredos em texto plano (compatibilidade com versões anteriores)', () => {
      const service = new ConfigService();
      // Simula um config.json de uma versão anterior a esta feature, gravado com senha em texto puro.
      fs.writeFileSync(
        service.getConfigFilePath(),
        JSON.stringify({ karafPass: 'senha-legada-em-texto-puro' }, null, 2),
        'utf-8'
      );

      expect(service.getSettings().karafPass).toBe('senha-legada-em-texto-puro');
    });

    it('migra um segredo legado em texto puro para criptografado no próximo save', () => {
      const service = new ConfigService();
      fs.writeFileSync(
        service.getConfigFilePath(),
        JSON.stringify({ karafPass: 'senha-legada' }, null, 2),
        'utf-8'
      );

      service.saveSettings({ karafUser: 'admin' });

      const rawDisk = fs.readFileSync(service.getConfigFilePath(), 'utf-8');
      expect(rawDisk).not.toContain('senha-legada');
      expect(service.getSettings().karafPass).toBe('senha-legada');
    });

    it('exportSettings() continua exportando texto plano (sanitizado ou não), nunca o valor criptografado', () => {
      const service = new ConfigService();
      service.saveSettings({ karafPass: 'senha-export-teste' });

      const exportedRaw = JSON.parse(service.exportSettings(false));
      expect(exportedRaw.karafPass).toBe('senha-export-teste');

      const exportedSanitized = JSON.parse(service.exportSettings(true));
      expect(exportedSanitized.karafPass).toBe('');
    });
  });
});

