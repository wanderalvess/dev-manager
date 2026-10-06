import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spawn } from 'child_process';
import {
  launchWslServerDebug,
  isWslKaraf,
  normalizeWslPath,
  buildWslClientArgs
} from './karafWslUtils';

vi.mock('child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('child_process')>()),
  spawn: vi.fn(() => ({ on: vi.fn(), unref: vi.fn() }))
}));

describe('karafWslUtils', () => {
  describe('launchWslServerDebug', () => {
    const wslSettings = (karafScript: string, karafPath = '/home/dev/karaf') =>
      ({ karafEnvironment: 'wsl', karafWslDistro: 'Ubuntu', karafPath, karafScript }) as never;

    beforeEach(() => {
      vi.mocked(spawn).mockClear();
    });

    it('abre o terminal quando caminho e script são só caracteres de caminho', () => {
      expect(launchWslServerDebug(wslSettings('karaf'), true, 'wt')).toBe(true);
      expect(spawn).toHaveBeenCalled();
    });

    it('recusa script com aspas/;/$ que fechariam o bash -c e injetariam comando', () => {
      for (const evil of ['karaf"; rm -rf ~; "', 'karaf$(id)', 'karaf`id`', 'karaf;id']) {
        expect(launchWslServerDebug(wslSettings(evil), true, 'wt'), evil).toBe(false);
      }
      expect(spawn).not.toHaveBeenCalled();
    });

    it('recusa pasta do servidor com caracteres de shell', () => {
      expect(launchWslServerDebug(wslSettings('karaf', '/home/dev/k"; touch /tmp/x; "'), true, 'wt')).toBe(false);
      expect(spawn).not.toHaveBeenCalled();
    });
  });

  describe('isWslKaraf', () => {
    it('retorna true apenas quando ambiente for wsl e distro estiver informada', () => {
      expect(isWslKaraf({ karafEnvironment: 'wsl', karafWslDistro: 'Ubuntu' })).toBe(true);
      expect(isWslKaraf({ karafEnvironment: 'wsl', karafWslDistro: '  ' })).toBe(false);
      expect(isWslKaraf({ karafEnvironment: 'wsl' })).toBe(false);
      expect(isWslKaraf({ karafEnvironment: 'local', karafWslDistro: 'Ubuntu' })).toBe(false);
      expect(isWslKaraf({})).toBe(false);
    });
  });

  describe('normalizeWslPath', () => {
    it('lida com caminhos vazios', () => {
      expect(normalizeWslPath('')).toEqual({ linuxPath: '', windowsUncPath: '' });
      expect(normalizeWslPath('   ')).toEqual({ linuxPath: '', windowsUncPath: '' });
    });

    it('converte caminho UNC com wsl.localhost para caminho Linux e mantém UNC', () => {
      const res = normalizeWslPath('\\\\wsl.localhost\\Ubuntu\\home\\developer\\karaf');
      expect(res.linuxPath).toBe('/home/developer/karaf');
      expect(res.windowsUncPath).toBe('\\\\wsl.localhost\\Ubuntu\\home\\developer\\karaf');
    });

    it('converte caminho UNC legado com wsl$ para caminho Linux e normaliza para wsl.localhost', () => {
      const res = normalizeWslPath('\\\\wsl$\\Debian\\opt\\karaf');
      expect(res.linuxPath).toBe('/opt/karaf');
      expect(res.windowsUncPath).toBe('\\\\wsl.localhost\\Debian\\opt\\karaf');
    });

    it('converte caminho Linux absoluto para UNC quando distro fornecida', () => {
      const res = normalizeWslPath('/home/developer/karaf', 'Ubuntu-22.04');
      expect(res.linuxPath).toBe('/home/developer/karaf');
      expect(res.windowsUncPath).toBe('\\\\wsl.localhost\\Ubuntu-22.04\\home\\developer\\karaf');
    });

    it('converte drive Windows para caminho /mnt/<letra>/ no WSL', () => {
      const res = normalizeWslPath('C:\\servers\\karaf');
      expect(res.linuxPath).toBe('/mnt/c/servers/karaf');
      expect(res.windowsUncPath).toBe('C:\\servers\\karaf');
    });
  });

  describe('buildWslClientArgs', () => {
    it('monta o comando wsl.exe com os argumentos corretos para client', () => {
      const res = buildWslClientArgs('Ubuntu', '/opt/karaf/bin/client', ['-u', 'karaf', '-p', 'karaf', 'bundle:list']);
      expect(res.command).toBe('wsl.exe');
      expect(res.args).toEqual([
        '-d',
        'Ubuntu',
        '--',
        '/opt/karaf/bin/client',
        '-u',
        'karaf',
        '-p',
        'karaf',
        'bundle:list'
      ]);
    });
  });
});
