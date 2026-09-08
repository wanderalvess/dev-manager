import { describe, expect, it } from 'vitest';
import { DockerService } from './DockerService';

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
});
