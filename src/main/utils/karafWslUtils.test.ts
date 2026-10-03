import { describe, expect, it } from 'vitest';
import {
  isWslKaraf,
  normalizeWslPath,
  buildWslClientArgs
} from './karafWslUtils';

describe('karafWslUtils', () => {
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
