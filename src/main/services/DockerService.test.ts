import { describe, expect, it, vi } from 'vitest';
import { DockerService } from './DockerService';
import * as security from '../utils/security';

vi.mock('../utils/security', async () => {
  const actual = await vi.importActual<typeof import('../utils/security')>('../utils/security');
  return { ...actual, execFileAsync: vi.fn() };
});

describe('DockerService', () => {
  it('valida identificadores de container seguros', () => {
    const service = new DockerService();
    // Testar IDs válidos
    expect((service as any).isValidContainerId('a1b2c3d4e5f6')).toBe(true);
    expect((service as any).isValidContainerId('my-db-container_1')).toBe(true);
    expect((service as any).isValidContainerId('oracle.xe')).toBe(true);

    // Testar IDs inválidos (tentativa de command injection ou caracteres maliciosos)
    expect((service as any).isValidContainerId('')).toBe(false);
    expect((service as any).isValidContainerId('a')).toBe(false);
    expect((service as any).isValidContainerId('id; rm -rf /')).toBe(false);
    expect((service as any).isValidContainerId('container & echo test')).toBe(false);
    expect((service as any).isValidContainerId('container | cat')).toBe(false);
  });

  it('permite definir e recuperar engine explicitamente (docker / podman)', async () => {
    const service = new DockerService();
    service.setEngineCommand('podman');
    expect(await service.getEngineCommand()).toBe('podman');

    service.setEngineCommand('docker');
    expect(await service.getEngineCommand()).toBe('docker');
  });

  it('rejeita container id malicioso em inspect, pause e unpause', async () => {
    const service = new DockerService();
    await expect(service.inspectContainer('bad; id')).rejects.toThrow('inválido');
    await expect(service.pauseContainer('bad && whoami')).rejects.toThrow('inválido');
    await expect(service.unpauseContainer('bad | dir')).rejects.toThrow('inválido');
  });

  it('propaga mensagem de diagnóstico do WSL quando ensureDockerRunning falha', async () => {
    const { wslService } = await import('./WslService');
    const service = new DockerService();

    wslService.testDockerInDistro = async () => false;
    wslService.startDockerDaemon = async () => ({
      success: false,
      message: 'O Docker Engine não está instalado na distro WSL "ubuntu2604-winthor". Execute no terminal WSL: sudo apt update && sudo apt install -y docker.io'
    });

    const res = await service.ensureDockerRunning('ubuntu2604-winthor');
    expect(res.running).toBe(false);
    expect(res.error).toContain('não está instalado na distro WSL');
    expect(res.error).toContain('sudo apt install');
  });

  it('resolve aliases conhecidos entre nomes do manual e INFR-Docker', async () => {
    const service = new DockerService();
    // Testa mapeamento para oracle-winthor -> oracle-local
    (service as any).resolveCommandAndArgs = async () => ({
      binary: 'docker',
      finalArgs: ['ps', '-a', '--format', '{{.Names}}']
    });

    // Mock do execFileAsync interno retornando containers com nome oracle-local
    const candidates = (DockerService as any).CONTAINER_ALIASES['oracle-winthor'];
    expect(candidates).toContain('oracle-local');

    const wtaCandidates = (DockerService as any).CONTAINER_ALIASES['linux-winthor'];
    expect(wtaCandidates).toContain('wta-local');

    const wshCandidates = (DockerService as any).CONTAINER_ALIASES['wsh-winthor'];
    expect(wshCandidates).toContain('wsh-local');
  });

  it('valida que os aliases cobrem tanto o padrão do manual quanto do INFR-Docker', () => {
    // oracle-local -> oracle-winthor
    expect((DockerService as any).CONTAINER_ALIASES['oracle-local']).toContain('oracle-winthor');
    // wta-local -> linux-winthor
    expect((DockerService as any).CONTAINER_ALIASES['wta-local']).toContain('linux-winthor');
    // wsh-local -> wsh-winthor
    expect((DockerService as any).CONTAINER_ALIASES['wsh-local']).toContain('wsh-winthor');
  });

  it('exige senha explícita nas operações Oracle sys/system, sem usar fallback hardcoded', async () => {
    const service = new DockerService();

    const healthRes = await service.execOracleHealth('oracle-winthor');
    expect(healthRes.success).toBe(false);
    expect(healthRes.error).toContain('Senha');

    await expect(service.openOracleSqlPlus('oracle-winthor')).rejects.toThrow('Senha');

    const dumpRes = await service.execOracleDataPump({
      containerName: 'oracle-winthor',
      dumpfile: 'test.dmp',
      schemaOrig: 'WINTHOR'
    } as any);
    expect(dumpRes.success).toBe(false);
    expect(dumpRes.error).toContain('Senha');
  });

  it('redige variáveis de ambiente sensíveis no inspect, preservando as demais', async () => {
    const service = new DockerService();
    (service as any).resolveCommandAndArgs = async () => ({
      binary: 'docker',
      finalArgs: ['inspect', 'oracle-local']
    });

    vi.mocked(security.execFileAsync).mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          Id: 'abc123',
          Name: '/oracle-local',
          Config: {
            Image: 'oracle/xe',
            Env: [
              'ORACLE_PASSWORD=devmanager',
              'APP_USER_PASSWORD=secret',
              'DB_TOKEN=xyz',
              'PATH=/usr/bin'
            ]
          },
          State: {},
          NetworkSettings: {}
        }
      ]),
      stderr: ''
    } as any);

    const result = await service.inspectContainer('oracle-local');
    expect(result?.env).toEqual([
      'ORACLE_PASSWORD=***REDACTED***',
      'APP_USER_PASSWORD=***REDACTED***',
      'DB_TOKEN=***REDACTED***',
      'PATH=/usr/bin'
    ]);
  });
});
