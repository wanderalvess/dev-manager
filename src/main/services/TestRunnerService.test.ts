import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestRunnerService } from './TestRunnerService';
import { ConfigService } from './ConfigService';
import { TestRunnerConfig, AppSettings } from '../../shared/types';

vi.mock('./ConfigService');

describe('TestRunnerService', () => {
  let configService: ConfigService;
  let service: TestRunnerService;
  let mockSettings: any;

  beforeEach(() => {
    mockSettings = {
      projectsPath: 'C:\\Projetos',
      karafPath: 'C:\\Karaf',
      testRunners: [],
      testExecutionHistory: []
    };

    configService = new ConfigService();
    vi.mocked(configService.getSettings).mockImplementation(() => mockSettings as AppSettings);
    vi.mocked(configService.saveSettings).mockImplementation((updates) => {
      mockSettings = { ...mockSettings, ...updates };
      return mockSettings as AppSettings;
    });

    service = new TestRunnerService(configService);
  });

  describe('substituteVariables', () => {
    it('interpola {PROJECTS_PATH} e {KARAF_PATH} adequadamente', () => {
      const text = '{PROJECTS_PATH}/meu-servico; {KARAF_PATH}/bin';
      const result = service.substituteVariables(text);
      expect(result).toBe('C:\\Projetos/meu-servico; C:\\Karaf/bin');
    });

    it('interpola {DATE} e {TIMESTAMP}', () => {
      const text = 'test-{DATE}';
      const result = service.substituteVariables(text);
      expect(result).not.toContain('{DATE}');
      expect(result.length).toBeGreaterThan('test-'.length);
    });
  });

  describe('getRunners & saveRunner & deleteRunner', () => {
    it('retorna presets padrão quando nenhum runner estiver salvo', () => {
      const runners = service.getRunners();
      expect(runners.length).toBeGreaterThan(0);
      expect(runners[0].type).toBe('maven');
    });

    it('salva novo runner e persiste no configService', () => {
      const newRunner: Partial<TestRunnerConfig> = {
        name: 'Suíte de Faturamento',
        type: 'maven',
        workingDir: '{PROJECTS_PATH}/faturamento',
        commandArgs: 'test -Dtest=FaturamentoTest'
      };

      const saved = service.saveRunner(newRunner);
      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('Suíte de Faturamento');

      const current = service.getRunners();
      expect(current.some((r) => r.id === saved.id)).toBe(true);
    });

    it('atualiza runner existente', () => {
      const saved = service.saveRunner({
        name: 'E2E Playwright',
        type: 'playwright'
      });

      const updated = service.saveRunner({
        id: saved.id,
        name: 'E2E Playwright Atualizado',
        type: 'playwright'
      });

      expect(updated.name).toBe('E2E Playwright Atualizado');
      const current = service.getRunners();
      expect(current.find((r) => r.id === saved.id)?.name).toBe('E2E Playwright Atualizado');
    });

    it('salva runner custom com customCommand', () => {
      const saved = service.saveRunner({
        name: 'Pytest Suite',
        type: 'custom',
        customCommand: 'pytest',
        commandArgs: '-v --tb=short'
      });

      expect(saved.customCommand).toBe('pytest');
      const current = service.getRunners();
      expect(current.find((r) => r.id === saved.id)?.customCommand).toBe('pytest');
    });

    it('remove runner existente pelo id', () => {
      const saved = service.saveRunner({
        name: 'Runner a remover',
        type: 'custom'
      });

      service.deleteRunner(saved.id);
      const current = service.getRunners();
      expect(current.some((r) => r.id === saved.id)).toBe(false);
    });
  });

  describe('history management', () => {
    it('retorna histórico salvo e permite limpar', () => {
      mockSettings.testExecutionHistory = [
        {
          id: 'exec-1',
          runnerId: 'r-1',
          runnerName: 'Maven',
          type: 'maven',
          status: 'passed',
          exitCode: 0,
          totalTests: 10,
          passedCount: 10,
          failedCount: 0,
          skippedCount: 0,
          durationMs: 5000,
          output: 'OK',
          executedAt: new Date().toISOString()
        }
      ];

      expect(service.getHistory().length).toBe(1);
      service.clearHistory();
      expect(service.getHistory().length).toBe(0);
    });
  });
});
