import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TautAutomationService } from './TautAutomationService';
import { ConfigService } from './ConfigService';
import { DatabaseService } from './DatabaseService';
import { TestRunnerService } from './TestRunnerService';

vi.mock('fs');

describe('TautAutomationService', () => {
  let configService: ConfigService;
  let databaseService: DatabaseService;
  let testRunnerService: TestRunnerService;
  let service: TautAutomationService;

  beforeEach(() => {
    vi.clearAllMocks();

    configService = {
      getSettings: vi.fn().mockReturnValue({
        tautProjectPath: 'C:\\projetos\\TAUT-Mississauga',
        wtaUrl: 'http://localhost:8889',
        wtaLogin: 'PCADMIN',
        wtaPassword: 'MD5_PASSWORD',
        databaseConnections: [
          {
            id: 'conn-1',
            name: 'Oracle Local',
            type: 'oracle',
            host: 'localhost',
            port: 1521,
            database: 'LOCAL',
            user: 'WINTHOR',
            password: '123'
          }
        ]
      }),
      saveSettings: vi.fn()
    } as unknown as ConfigService;

    databaseService = {
      resolveConnectionConfig: vi.fn().mockImplementation((c) => c)
    } as unknown as DatabaseService;

    testRunnerService = {
      executeRunner: vi.fn().mockResolvedValue({
        id: 'exec-1',
        status: 'passed',
        exitCode: 0,
        totalTests: 5,
        passedCount: 5,
        failedCount: 0,
        skippedCount: 0,
        durationMs: 12000,
        output: 'All tests passed'
      }),
      abortExecution: vi.fn().mockReturnValue(true)
    } as unknown as TestRunnerService;

    service = new TautAutomationService(configService, databaseService, testRunnerService);
  });

  describe('resolveProjectPath', () => {
    it('deve usar o caminho das configurações se o diretório existir', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const res = service.resolveProjectPath();
      expect(res).toBe('C:\\projetos\\TAUT-Mississauga');
    });

    it('deve autodetectar qualquer pasta "taut*" dentro de projectsPath se tautProjectPath não estiver definido', () => {
      vi.mocked(configService.getSettings).mockReturnValue({
        projectsPath: 'C:\\MeusProjetosGit',
        tautProjectPath: ''
      } as any);
      const expected = path.join('C:\\MeusProjetosGit', 'taut-meu-projeto');
      vi.mocked(fs.existsSync).mockImplementation((p: any) => p === 'C:\\MeusProjetosGit' || p === expected);
      vi.mocked(fs.readdirSync).mockReturnValue([{ name: 'taut-meu-projeto', isDirectory: () => true }] as any);

      expect(service.resolveProjectPath()).toBe(expected);
    });

    it('sem nenhuma pasta encontrada, cai no nome genérico "taut" em projectsPath', () => {
      vi.mocked(configService.getSettings).mockReturnValue({
        projectsPath: 'C:\\MeusProjetosGit',
        tautProjectPath: ''
      } as any);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(service.resolveProjectPath()).toBe(path.join('C:\\MeusProjetosGit', 'taut'));
    });
  });

  describe('getProjectStatus', () => {
    it('deve reportar status falso quando o diretório não existe', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const status = await service.getProjectStatus('C:\\inexistente');
      expect(status.exists).toBe(false);
      expect(status.hasPackageJson).toBe(false);
    });

    it('deve extrair variáveis do .env quando o projeto existe', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
        if (String(filePath).endsWith('package.json')) {
          return JSON.stringify({ devDependencies: { cypress: '^13.6.0' } });
        }
        if (String(filePath).endsWith('.env')) {
          return 'ORACLE_USER=WINTHOR\nORACLE_PASSWORD=123\nORACLE_CONNECT_STRING=localhost:1521/LOCAL\nCYPRESS_BASE_URL=http://localhost:8889\nZEPHYR_REPORTER_ENABLED=true';
        }
        return '';
      });

      const status = await service.getProjectStatus();
      expect(status.exists).toBe(true);
      expect(status.cypressVersion).toBe('^13.6.0');
      expect(status.envVariables?.hasOracleUser).toBe(true);
      expect(status.envVariables?.oracleConnectString).toBe('localhost:1521/LOCAL');
      expect(status.envVariables?.reporterZephyr).toBe(true);
    });
  });

  describe('processCsvIntake', () => {
    it('deve parsear CSV do Zephyr e gerar intake e plano estruturado', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const sampleCsv = [
        'Key,Name,API/Endpoint/Rotina,Test Script - Step,Test Script - Test Data,Test Script - Expected Result,Serviço,Priority,Folder',
        'DDWMISSI-T101,Validar Contrato Pedido,/winthor/pedido/v1/reserva,POST,payload={id:1},Status 200 e schema valido,winthor-pedido-venda,Crítica,/Mississauga/API/Envio/API - Pedido 561',
        'DDWMISSI-T102,Erro Pedido Sem Cliente,/winthor/pedido/v1/reserva,POST,cliente=null,Status 400 mensagem obrigatorio,winthor-pedido-venda,Alta,/Mississauga/API/Envio/API - Pedido 561'
      ].join('\n');

      vi.mocked(fs.readFileSync).mockReturnValue(sampleCsv);

      const result = await service.processCsvIntake('Insumo/pedido.csv');

      expect(result.scenariosCount).toBe(2);
      expect(result.module).toBe('Pedido561');
      expect(result.method).toBe('POST');
      expect(result.wtaService).toBe('winthor-pedido-venda');
      expect(result.scenarios[0].key).toBe('DDWMISSI-T101');
      expect(result.scenarios[0].type).toBe('contrato');
      expect(result.scenarios[1].key).toBe('DDWMISSI-T102');
      expect(result.scenarios[1].type).toBe('negativo');
      expect(result.checklistBlockers).toHaveLength(0);
      expect(result.intakeBlock).toContain('DDWMISSI-T101');
      expect(result.implementationPlan).toContain('PLANO DE IMPLEMENTAÇÃO');
    });

    it('deve sinalizar bloqueantes quando chave Zephyr for inválida', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const invalidCsv = [
        'Key,Name,API/Endpoint/Rotina,Test Script - Step,Test Script - Test Data,Test Script - Expected Result,Serviço,Priority,Folder',
        'INVALID-99,Teste sem chave valida,/winthor/v1/teste,GET,,Status 200,winthor-teste,Normal,/'
      ].join('\n');

      vi.mocked(fs.readFileSync).mockReturnValue(invalidCsv);

      const result = await service.processCsvIntake('Insumo/invalido.csv');
      expect(result.checklistBlockers.length).toBeGreaterThan(0);
      expect(result.checklistBlockers[0]).toContain('PROJ-TXXXX');
    });
  });

  describe('syncEnvFromDevManager', () => {
    it('deve atualizar .env com os dados da conexão Oracle ativa', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('OUTRA_VAR=1\nORACLE_USER=OLD\n');
      const writeSpy = vi.mocked(fs.writeFileSync);

      const res = await service.syncEnvFromDevManager();
      expect(res.success).toBe(true);
      expect(res.updatedKeys).toContain('ORACLE_USER');
      expect(res.updatedKeys).toContain('ORACLE_CONNECT_STRING');
      expect(writeSpy).toHaveBeenCalled();
    });
  });

  describe('runTests', () => {
    it('deve disparar runner com tags e apiUrlMode', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const res = await service.runTests({
        tags: 'critico,esteira',
        apiUrlMode: 'v39'
      });

      expect(res.status).toBe('passed');
      expect(testRunnerService.executeRunner).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cypress',
          commandArgs: expect.stringContaining('--expose grepTags="critico,esteira"')
        }),
        expect.any(Function)
      );
    });

    it('deve disparar cy:open no modo interativo', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      await service.runTests({
        openInteractive: true,
        apiUrlMode: 'v39'
      });

      expect(testRunnerService.executeRunner).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'cypress',
          commandArgs: 'open --env API_URL_MODE=v39'
        }),
        expect.any(Function)
      );
    });
  });
});
