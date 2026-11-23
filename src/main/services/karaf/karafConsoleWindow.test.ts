import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../../../shared/types';
import { useKarafWindowMode } from './karafConsoleWindow';

const base = { karafPath: 'C:\\pcsist\\produtos\\winthor' } as AppSettings;

describe('useKarafWindowMode', () => {
  it('Karaf nativo no Windows usa a janela real por padrão', () => {
    expect(useKarafWindowMode(base, 'win32')).toBe(true);
    expect(useKarafWindowMode({ ...base, karafEnvironment: 'local' }, 'win32')).toBe(true);
  });

  it('o usuário pode voltar para o pipe de stdin', () => {
    expect(useKarafWindowMode({ ...base, karafEmbeddedMode: 'pipe' }, 'win32')).toBe(false);
    expect(useKarafWindowMode({ ...base, karafEmbeddedMode: 'window' }, 'win32')).toBe(true);
  });

  it('WSL e container seguem pelo caminho antigo: não há janela do Windows para ler', () => {
    expect(useKarafWindowMode({ ...base, karafEnvironment: 'wsl', karafWslDistro: 'Ubuntu' }, 'win32')).toBe(false);
    expect(useKarafWindowMode({ ...base, karafEnvironment: 'docker', karafDockerContainer: 'wta-develop' }, 'win32')).toBe(false);
  });

  it('fora do Windows nunca usa a janela', () => {
    expect(useKarafWindowMode(base, 'linux')).toBe(false);
    expect(useKarafWindowMode(base, 'darwin')).toBe(false);
  });
});
