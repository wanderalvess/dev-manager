import { describe, expect, it, beforeEach, vi } from 'vitest';
import { DeployService } from './DeployService';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { DockerService } from './DockerService';
import { WindowsService } from './WindowsService';
import { NetworkService } from './NetworkService';
import { DeployProfile, DeployProgressEvent } from '../../shared/types';

describe('DeployService', () => {
  let configService: ConfigService;
  let karafService: KarafService;
  let dockerService: DockerService;
  let windowsService: WindowsService;
  let networkService: NetworkService;
  let deployService: DeployService;

  beforeEach(() => {
    configService = new ConfigService();
    karafService = new KarafService(configService);
    dockerService = new DockerService();
    windowsService = new WindowsService(configService, karafService);
    networkService = new NetworkService();
    deployService = new DeployService(configService, karafService, dockerService, windowsService, networkService);
  });

  it('retorna sucesso imediatamente para perfis sem etapas ativas', async () => {
    const profile: DeployProfile = {
      id: 'empty-prof',
      name: 'Perfil Vazio',
      steps: [
        { id: '1', name: 'Passo Desabilitado', type: 'command', enabled: false, command: 'echo test' }
      ]
    };

    const dummyChunk = vi.fn();
    const result = await deployService.executeProfile(profile, dummyChunk);

    expect(result.success).toBe(true);
    expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('Nenhuma etapa habilitada'));
  });

  describe('Etapa maven-build', () => {
    it('executa build Maven e aborta perfil se o build falhar', async () => {
      vi.spyOn(windowsService, 'resolveWorkingDir').mockReturnValue('/mock/project');
      vi.spyOn(karafService, 'runMavenBuild').mockResolvedValueOnce({
        code: 1,
        stdout: '',
        stderr: 'Compilation failure in Line 42'
      });

      const profile: DeployProfile = {
        id: 'prof-maven',
        name: 'Build Maven',
        steps: [
          {
            id: 'm1',
            name: 'Compilar Projeto',
            type: 'maven-build',
            enabled: true,
            projectPath: '/mock/project',
            skipTests: true
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Compilation failure in Line 42');
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('DEPLOY ABORTADO'));
    });

    it('continua a execução se build Maven terminar com código 0', async () => {
      vi.spyOn(windowsService, 'resolveWorkingDir').mockReturnValue('/mock/project');
      vi.spyOn(karafService, 'runMavenBuild').mockResolvedValueOnce({
        code: 0,
        stdout: 'BUILD SUCCESS',
        stderr: ''
      });

      const profile: DeployProfile = {
        id: 'prof-maven-ok',
        name: 'Build Maven OK',
        steps: [
          {
            id: 'm1',
            name: 'Compilar Projeto',
            type: 'maven-build',
            enabled: true,
            projectPath: '/mock/project',
            skipTests: true
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(true);
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('EXECUTADO COM SUCESSO'));
    });
  });

  describe('Etapa karaf-command', () => {
    it('bloqueia comandos Karaf que violam regras de segurança', async () => {
      const profile: DeployProfile = {
        id: 'prof-karaf-sec',
        name: 'Perfil Karaf Inseguro',
        steps: [
          {
            id: 'k1',
            name: 'Comando Injetado',
            type: 'karaf-command',
            enabled: true,
            command: 'bundle:list; rm -rf /'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(false);
      expect(result.error).toContain('comando Karaf ausente ou inválido');
    });

    it('trata aviso "already registered" como sucesso idempotente', async () => {
      vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 1,
        stdout: 'Error: feature repo mvn:... already registered',
        stderr: 'Feature already registered'
      });

      const profile: DeployProfile = {
        id: 'prof-karaf-idempotent',
        name: 'Perfil Idempotente',
        steps: [
          {
            id: 'k1',
            name: 'Adicionar Repo',
            type: 'karaf-command',
            enabled: true,
            command: 'feature:repo-add mvn:br.com.totvs/repo/1.0/xml/features'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(true);
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('já registrado, prosseguindo...'));
    });

    it('aborta perfil quando etapa karaf-command falha (ex: No matching features)', async () => {
      vi.spyOn(karafService, 'executeKarafCommand').mockResolvedValueOnce({
        code: 1,
        stdout: 'Error executing command: No matching features for hub-carga-dados/0.0.1.SNAPSHOT',
        stderr: 'Error executing command: No matching features for hub-carga-dados/0.0.1.SNAPSHOT'
      });

      const profile: DeployProfile = {
        id: 'prof-karaf-fail',
        name: 'Deploy Karaf OSGi',
        steps: [
          {
            id: 'k1',
            name: 'Instalar / Atualizar Feature',
            type: 'karaf-command',
            enabled: true,
            command: 'feature:install -r -u hub-carga-dados/0.0.1-SNAPSHOT'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Instalar / Atualizar Feature');
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('❌ DEPLOY ABORTADO na etapa "Instalar / Atualizar Feature"'));
    });
  });

  describe('Etapas Docker', () => {
    it('docker-build valida presença de diretório de contexto e tag da imagem', async () => {
      const profile: DeployProfile = {
        id: 'prof-docker-missing',
        name: 'Perfil Docker Sem Contexto',
        steps: [
          {
            id: 'd1',
            name: 'Build Docker Incompleto',
            type: 'docker-build',
            enabled: true,
            dockerImageTag: 'meu-app:latest'
            // dockerContextPath faltando propositalmente
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(false);
      expect(result.error).toContain('diretório de contexto ou tag da imagem ausente');
    });

    it('docker-push valida presença da tag da imagem', async () => {
      const profile: DeployProfile = {
        id: 'prof-push-missing',
        name: 'Perfil Docker Push Sem Tag',
        steps: [
          {
            id: 'd1',
            name: 'Push Sem Tag',
            type: 'docker-push',
            enabled: true
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(false);
      expect(result.error).toContain('tag da imagem ausente');
    });

    it('docker-restart reinicia o container especificado', async () => {
      const restartSpy = vi.spyOn(dockerService, 'restartContainer').mockResolvedValueOnce(true);

      const profile: DeployProfile = {
        id: 'prof-restart',
        name: 'Perfil Docker Restart',
        steps: [
          {
            id: 'd1',
            name: 'Restart Container',
            type: 'docker-restart',
            enabled: true,
            dockerContainer: 'oracle-xe'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(true);
      expect(restartSpy).toHaveBeenCalledWith('oracle-xe');
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('Container "oracle-xe" reiniciado.'));
    });
  });

  describe('Etapa command genérica', () => {
    it('aborta se nenhum comando for fornecido', async () => {
      const profile: DeployProfile = {
        id: 'prof-cmd-empty',
        name: 'Perfil Sem Comando',
        steps: [
          {
            id: 'c1',
            name: 'Passo Vazio',
            type: 'command',
            enabled: true,
            command: '   '
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(false);
      expect(result.error).toContain('nenhum comando informado');
    });
  });

  describe('executeSingleStep', () => {
    it('executa com sucesso uma etapa isolada', async () => {
      vi.spyOn(windowsService, 'resolveWorkingDir').mockReturnValue('/mock/project');
      vi.spyOn(karafService, 'runMavenBuild').mockResolvedValueOnce({
        code: 0,
        stdout: 'BUILD SUCCESS',
        stderr: ''
      });

      const step = {
        id: 'step-1',
        name: 'Compilar Projeto Isolado',
        type: 'maven-build' as const,
        enabled: true,
        projectPath: '/mock/project',
        skipTests: true
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeSingleStep(step, dummyChunk, 'Perfil Teste');

      expect(result.success).toBe(true);
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('EXECUTANDO ETAPA INDIVIDUAL: "Compilar Projeto Isolado"'));
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('CONCLUÍDA COM SUCESSO'));
    });

    it('retorna erro se a etapa isolada falhar', async () => {
      vi.spyOn(windowsService, 'resolveWorkingDir').mockReturnValue('/mock/project');
      vi.spyOn(karafService, 'runMavenBuild').mockResolvedValueOnce({
        code: 1,
        stdout: '',
        stderr: 'Compilation error'
      });

      const step = {
        id: 'step-2',
        name: 'Compilar Projeto Com Erro',
        type: 'maven-build' as const,
        enabled: true,
        projectPath: '/mock/project',
        skipTests: true
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeSingleStep(step, dummyChunk);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Compilation error');
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('ETAPA "Compilar Projeto Com Erro" FALHOU'));
    });
  });

  describe('substituteVariables', () => {
    it('substitui variáveis conhecidas de configuração e data/hora', () => {
      vi.spyOn(configService, 'getSettings').mockReturnValue({
        projectsPath: 'C:\\Projetos',
        karafPath: 'C:\\Karaf',
        jdkPath: 'C:\\Java\\jdk11'
      } as any);

      const input = 'mvn clean -f "{PROJECTS_PATH}\\pom.xml" --karaf "{KARAF_PATH}" --jdk "{JDK_PATH}" --log "{DATE}_{TIME}"';
      const output = deployService.substituteVariables(input);

      expect(output).toContain('C:\\Projetos\\pom.xml');
      expect(output).toContain('C:\\Karaf');
      expect(output).toContain('C:\\Java\\jdk11');
      expect(output).not.toContain('{DATE}');
      expect(output).not.toContain('{TIME}');
    });
  });

  describe('Tolerância a falhas (continueOnError)', () => {
    it('prossegue a esteira quando uma etapa com continueOnError falha', async () => {
      vi.spyOn(windowsService, 'resolveWorkingDir').mockReturnValue('/mock/project');
      vi.spyOn(karafService, 'runMavenBuild').mockResolvedValueOnce({
        code: 1,
        stdout: '',
        stderr: 'Build falhou de propósito'
      });

      const secondStepSpy = vi.fn();
      vi.spyOn(deployService as any, 'runGenericCommand').mockImplementation(async () => {
        secondStepSpy();
        return { code: 0, stdout: 'OK', stderr: '' };
      });

      const progressEvents: DeployProgressEvent[] = [];
      const profile: DeployProfile = {
        id: 'prof-continue-on-error',
        name: 'Perfil Tolerante',
        steps: [
          {
            id: 's1',
            name: 'Etapa Opcional Que Falha',
            type: 'maven-build',
            enabled: true,
            continueOnError: true,
            projectPath: '/mock/project'
          },
          {
            id: 's2',
            name: 'Etapa Posterior',
            type: 'command',
            enabled: true,
            command: 'echo Sucesso'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk, (ev) => progressEvents.push(ev));

      expect(result.success).toBe(true);
      expect(secondStepSpy).toHaveBeenCalled();
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('continueOnError'));
      expect(progressEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stepId: 's1', status: 'completed', ignoredError: true }),
          expect.objectContaining({ stepId: 's2', status: 'completed' })
        ])
      );
    });
  });

  describe('Cancelamento e Interrupção (abortCurrentExecution)', () => {
    it('aborta as etapas restantes imediatamente quando cancelado', async () => {
      vi.spyOn(windowsService, 'resolveWorkingDir').mockReturnValue('/mock/project');
      vi.spyOn(karafService, 'runMavenBuild').mockImplementation(async () => {
        deployService.abortCurrentExecution();
        return { code: 0, stdout: 'Concluído', stderr: '' };
      });

      const profile: DeployProfile = {
        id: 'prof-abort',
        name: 'Perfil Interrompido',
        steps: [
          { id: 's1', name: 'Passo 1', type: 'maven-build', enabled: true, projectPath: '/mock/project' },
          { id: 's2', name: 'Passo 2 Nunca Executado', type: 'command', enabled: true, command: 'echo nunca' }
        ]
      };

      const dummyChunk = vi.fn();
      const progressEvents: DeployProgressEvent[] = [];
      const result = await deployService.executeProfile(profile, dummyChunk, (ev) => progressEvents.push(ev));

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cancelado pelo usuário');
      expect(progressEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stepId: 's2', status: 'skipped' })
        ])
      );
    });
  });

  describe('Etapa wait', () => {
    it('aguarda a contagem regressiva e conclui com sucesso', async () => {
      vi.useFakeTimers();
      const profile: DeployProfile = {
        id: 'prof-wait',
        name: 'Perfil Espera',
        steps: [
          { id: 'w1', name: 'Aguardar Aquecimento', type: 'wait', enabled: true, waitDurationSeconds: 2 }
        ]
      };

      const dummyChunk = vi.fn();
      const promise = deployService.executeProfile(profile, dummyChunk);

      await vi.advanceTimersByTimeAsync(2500);
      const result = await promise;
      vi.useRealTimers();

      expect(result.success).toBe(true);
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('Tempo de espera (2s) concluído'));
    });
  });

  describe('Etapa http-healthcheck', () => {
    it('conclui com sucesso quando o endpoint responde com status esperado', async () => {
      vi.spyOn(networkService, 'checkHttpHealth').mockResolvedValueOnce({
        url: 'http://localhost:8889/health',
        reachable: true,
        isHealthy: true,
        statusCode: 200,
        timeMs: 45
      });

      const profile: DeployProfile = {
        id: 'prof-health',
        name: 'Perfil Healthcheck',
        steps: [
          {
            id: 'h1',
            name: 'Verificar API',
            type: 'http-healthcheck',
            enabled: true,
            healthcheckUrl: 'http://localhost:8889/health',
            healthcheckExpectedStatus: 200,
            healthcheckRetries: 2
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(true);
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('Healthcheck OK em http://localhost:8889/health'));
    });

    it('falha após esgotar o limite de tentativas', async () => {
      vi.useFakeTimers();
      vi.spyOn(networkService, 'checkHttpHealth').mockResolvedValue({
        url: 'http://localhost:8889/health',
        reachable: false,
        isHealthy: false,
        statusCode: 503,
        timeMs: 12
      });

      const profile: DeployProfile = {
        id: 'prof-health-fail',
        name: 'Perfil Healthcheck Falho',
        steps: [
          {
            id: 'h1',
            name: 'Verificar API Indisponível',
            type: 'http-healthcheck',
            enabled: true,
            healthcheckUrl: 'http://localhost:8889/health',
            healthcheckExpectedStatus: 200,
            healthcheckRetries: 2
          }
        ]
      };

      const dummyChunk = vi.fn();
      const promise = deployService.executeProfile(profile, dummyChunk);

      await vi.advanceTimersByTimeAsync(5000);
      const result = await promise;
      vi.useRealTimers();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Healthcheck falhou após 2 tentativas');
    });
  });

  describe('Etapa service-action', () => {
    it('executa start em serviço parado', async () => {
      vi.spyOn(windowsService, 'getServiceStatus').mockResolvedValueOnce('STOPPED');
      const startSpy = vi.spyOn(windowsService, 'startService').mockResolvedValueOnce(true);

      const profile: DeployProfile = {
        id: 'prof-srv-start',
        name: 'Perfil Iniciar Serviço',
        steps: [
          {
            id: 'srv1',
            name: 'Iniciar Karaf Service',
            type: 'service-action',
            enabled: true,
            serviceName: 'karaf-service',
            serviceAction: 'start'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(true);
      expect(startSpy).toHaveBeenCalledWith('karaf-service');
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('iniciado com sucesso'));
    });

    it('executa stop em serviço em execução', async () => {
      vi.spyOn(windowsService, 'getServiceStatus').mockResolvedValueOnce('RUNNING');
      const stopSpy = vi.spyOn(windowsService, 'stopService').mockResolvedValueOnce(true);

      const profile: DeployProfile = {
        id: 'prof-srv-stop',
        name: 'Perfil Parar Serviço',
        steps: [
          {
            id: 'srv1',
            name: 'Parar Karaf Service',
            type: 'service-action',
            enabled: true,
            serviceName: 'karaf-service',
            serviceAction: 'stop'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(true);
      expect(stopSpy).toHaveBeenCalledWith('karaf-service');
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('parado com sucesso'));
    });

    it('executa restart parando e iniciando serviço', async () => {
      vi.useFakeTimers();
      vi.spyOn(windowsService, 'getServiceStatus').mockResolvedValueOnce('RUNNING');
      const stopSpy = vi.spyOn(windowsService, 'stopService').mockResolvedValueOnce(true);
      const startSpy = vi.spyOn(windowsService, 'startService').mockResolvedValueOnce(true);

      const profile: DeployProfile = {
        id: 'prof-srv-restart',
        name: 'Perfil Reiniciar Serviço',
        steps: [
          {
            id: 'srv1',
            name: 'Reiniciar Karaf Service',
            type: 'service-action',
            enabled: true,
            serviceName: 'karaf-service',
            serviceAction: 'restart'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const promise = deployService.executeProfile(profile, dummyChunk);

      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;
      vi.useRealTimers();

      expect(result.success).toBe(true);
      expect(stopSpy).toHaveBeenCalledWith('karaf-service');
      expect(startSpy).toHaveBeenCalledWith('karaf-service');
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('reiniciado com sucesso'));
    });
  });

  describe('Histórico de Execuções', () => {
    it('registra e recupera o histórico de deploy', async () => {
      let mockHistory: any[] = [];
      vi.spyOn(configService, 'getSettings').mockImplementation(() => ({
        deployProfileHistory: mockHistory
      } as any));
      vi.spyOn(configService, 'saveSettings').mockImplementation((patch: any) => {
        if (patch.deployProfileHistory !== undefined) {
          mockHistory = patch.deployProfileHistory;
        }
      });

      const profile: DeployProfile = {
        id: 'prof-hist-test',
        name: 'Perfil com Histórico',
        steps: []
      };

      await deployService.executeProfile(profile, vi.fn());
      const history = deployService.getHistory();

      expect(history.length).toBe(1);
      expect(history[0].profileId).toBe('prof-hist-test');
      expect(history[0].success).toBe(true);

      deployService.clearHistory();
      expect(deployService.getHistory()).toEqual([]);
    });
  });
});

