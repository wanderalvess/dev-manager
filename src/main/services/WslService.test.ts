import { describe, expect, it } from 'vitest';
import { WslService } from './WslService';

describe('WslService', () => {
  it('rejeita nomes de distribuição maliciosos ou inválidos', async () => {
    const service = new WslService();

    // Nomes com injeção de comando ou caracteres inválidos
    const resDaemon = await service.startDockerDaemon('ubuntu; rm -rf /');
    expect(resDaemon.success).toBe(false);
    expect(resDaemon.message).toContain('inválido');

    const resTerm = await service.terminateDistro('distro & echo pwned');
    expect(resTerm).toBe(false);

    const resIp = await service.getDistroIp('distro | cat');
    expect(resIp).toBeNull();
  });

  it('valida identificador de distro padrão seguro', () => {
    const service = new WslService();
    expect((service as any).getContainerManagerConfigPath()).toBeTruthy();
  });

  it('lida graciosamente com ausência de WSL ou erros de execução', async () => {
    const service = new WslService();
    const isRunning = await service.testDockerInDistro('non-existent-distro-xyz-999');
    expect(isRunning).toBe(false);

    const ip = await service.getDistroIp('non-existent-distro-xyz-999');
    expect(ip).toBeNull();
  });

  it('gera hash MD5 minúsculo e maiúsculo para senhas WSH', () => {
    const service = new WslService();
    const res = service.generateMd5('pcinfo');
    expect(res.lower).toBe(res.upper.toLowerCase());
    expect(res.upper).toBe(res.lower.toUpperCase());
    expect(res.lower).toHaveLength(32);
    expect(res.upper).toHaveLength(32);

    // Teste com string vazia
    const emptyRes = service.generateMd5('');
    expect(emptyRes.lower).toHaveLength(32);
  });

  it('rejeita distro inválida em openDumpsFolder e checkWshPrerequisites', async () => {
    const service = new WslService();
    const dumpsRes = await service.openDumpsFolder('bad; distro');
    expect(dumpsRes.success).toBe(false);
    expect(dumpsRes.error).toContain('inválido');

    const prereqs = await service.checkWshPrerequisites('bad && echo hack');
    expect(prereqs).toEqual([]);
  });

  it('rejeita distro ou caminhos inválidos nas operações de snapshot', async () => {
    const service = new WslService();
    const importRes = await service.importSnapshot('bad; distro', 'C:\\WSL\\test', 'C:\\fake\\distro.tar');
    expect(importRes.success).toBe(false);
    expect(importRes.error).toContain('inválido');

    const exportRes = await service.exportSnapshot('bad; distro', 'C:\\fake\\out.tar');
    expect(exportRes.success).toBe(false);
    expect(exportRes.error).toContain('inválido');

    const unregRes = await service.unregisterDistro('bad; distro');
    expect(unregRes.success).toBe(false);
    expect(unregRes.error).toContain('inválido');
  });

  it('lista snapshots e retorna formato correto', async () => {
    const service = new WslService();
    const snapshots = await service.listSnapshots();
    expect(Array.isArray(snapshots)).toBe(true);
    for (const snap of snapshots) {
      expect(snap.name.toLowerCase().endsWith('.tar')).toBe(true);
      expect(snap.path).toBeTruthy();
      expect(typeof snap.sizeBytes).toBe('number');
      expect(snap.formattedSize).toBeTruthy();
    }
  });

  it('verifica scripts do INFR-Docker e categoriza tipos', async () => {
    const service = new WslService();
    const scripts = await service.checkInfrDockerScripts();
    expect(Array.isArray(scripts)).toBe(true);
    expect(scripts.length).toBeGreaterThan(0);
    const types = scripts.map((s) => s.type);
    expect(types).toContain('oracle');
    expect(types).toContain('wta');
    expect(types).toContain('wsh');
  });

  it('rejeita distro inválida ou tipo desconhecido em runInfrSetupScript', async () => {
    const service = new WslService();
    const badDistroRes = await service.runInfrSetupScript('oracle', { distro: 'invalid; distro' });
    expect(badDistroRes.success).toBe(false);
    expect(badDistroRes.output).toContain('inválido');

    const badTypeRes = await service.runInfrSetupScript('unknown' as any, { distro: 'ubuntu' });
    expect(badTypeRes.success).toBe(false);
    expect(badTypeRes.output).toContain('desconhecido');
  });
});
