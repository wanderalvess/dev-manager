import { describe, expect, it, beforeEach, vi } from 'vitest';
import { DeployService } from './DeployService';
import { ConfigService } from './ConfigService';
import { KarafService } from './KarafService';
import { DockerService } from './DockerService';
import { WindowsService } from './WindowsService';
import { DeployProfile } from '../../shared/types';

describe('DeployService', () => {
  let configService: ConfigService;
  let karafService: KarafService;
  let dockerService: DockerService;
  let windowsService: WindowsService;
  let deployService: DeployService;

  beforeEach(() => {
    configService = new ConfigService();
    karafService = new KarafService(configService);
    dockerService = new DockerService();
    windowsService = new WindowsService(configService, karafService);
    deployService = new DeployService(configService, karafService, dockerService, windowsService);
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
            command: 'feature:repo-add mvn:br.com.totvs/repo/1.0/xml/features'
          }
        ]
      };

      const dummyChunk = vi.fn();
      const result = await deployService.executeProfile(profile, dummyChunk);

      expect(result.success).toBe(true);
      expect(dummyChunk).toHaveBeenCalledWith(expect.stringContaining('já registrado, prosseguindo...'));
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
            type: 'docker-push'
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
});
