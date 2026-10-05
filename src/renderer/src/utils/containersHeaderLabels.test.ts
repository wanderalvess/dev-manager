import { describe, expect, it } from 'vitest';
import { containersHeaderOfflineMessage, containersHeaderRuntimeLabel } from './containersHeaderLabels';

describe('containersHeaderRuntimeLabel', () => {
  it('usa a distro quando e WSL', () => {
    expect(containersHeaderRuntimeLabel({ isWsl: true, wslDistro: 'Ubuntu', engine: 'docker' })).toBe('WSL • Ubuntu');
  });
  it('cai para Docker Ativo sem distro', () => {
    expect(containersHeaderRuntimeLabel({ isWsl: true, engine: 'docker' })).toBe('WSL • Docker Ativo');
  });
  it('detecta podman e host', () => {
    expect(containersHeaderRuntimeLabel({ isWsl: false, engine: 'podman' })).toBe('Podman Nativo');
    expect(containersHeaderRuntimeLabel({ isWsl: false, engine: 'docker' })).toBe('Docker Host');
  });
});

describe('containersHeaderOfflineMessage', () => {
  it('prioriza o erro informado', () => {
    expect(containersHeaderOfflineMessage('falhou', 'Ubuntu')).toBe('falhou');
  });
  it('monta texto padrao com e sem distro', () => {
    expect(containersHeaderOfflineMessage(undefined, 'Ubuntu')).toContain('na distro WSL "Ubuntu"');
    expect(containersHeaderOfflineMessage(undefined, '')).not.toContain('distro WSL');
  });
});
