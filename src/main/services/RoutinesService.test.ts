import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigService } from './ConfigService';
import { RoutinesService } from './RoutinesService';

const spawnMock = vi.fn((..._args: unknown[]) => ({ unref: vi.fn() }));
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawn: (...args: unknown[]) => spawnMock(...args)
  };
});

describe('RoutinesService', () => {
  let configDir: string;
  let appDir: string;
  let configService: ConfigService;
  let service: RoutinesService;
  let originalConfigDir: string | undefined;
  let originalAppData: string | undefined;

  beforeEach(() => {
    spawnMock.mockClear();
    configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-config-'));
    appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-app-'));
    originalConfigDir = process.env.CONFIG_DIR;
    originalAppData = process.env.APPDATA;
    process.env.CONFIG_DIR = configDir;
    delete process.env.APPDATA;

    configService = new ConfigService();
    service = new RoutinesService(configService);
  });

  afterEach(() => {
    fs.rmSync(configDir, { recursive: true, force: true });
    fs.rmSync(appDir, { recursive: true, force: true });
    if (originalConfigDir === undefined) delete process.env.CONFIG_DIR;
    else process.env.CONFIG_DIR = originalConfigDir;
    if (originalAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = originalAppData;
  });

  describe('listRoutines', () => {
    it('retorna vazio quando appPath não está configurado', () => {
      expect(service.listRoutines()).toEqual([]);
    });

    it('escaneia apenas as extensões padrão (.EXE) quando nada configurado', () => {
      fs.writeFileSync(path.join(appDir, 'ROTINA1.EXE'), 'x');
      fs.writeFileSync(path.join(appDir, 'ROTINA2.PC'), 'x');
      configService.saveSettings({ appPath: appDir });

      const routines = service.listRoutines();
      expect(routines.map((r) => r.name)).toEqual(['ROTINA1.EXE']);
    });

    it('respeita extensões customizadas configuradas', () => {
      fs.writeFileSync(path.join(appDir, 'ROTINA1.EXE'), 'x');
      fs.writeFileSync(path.join(appDir, 'ROTINA2.PC'), 'x');
      configService.saveSettings({ appPath: appDir, routineFileExtensions: ['.EXE', '.PC'] });

      const routines = service.listRoutines();
      expect(routines.map((r) => r.name).sort()).toEqual(['ROTINA1.EXE', 'ROTINA2.PC']);
    });

    it('escaneia recursivamente subpastas como módulos', () => {
      const moduleDir = path.join(appDir, 'FIN');
      fs.mkdirSync(moduleDir);
      fs.writeFileSync(path.join(moduleDir, 'PCFIN01.EXE'), 'x');
      configService.saveSettings({ appPath: appDir });

      const routines = service.listRoutines();
      expect(routines).toHaveLength(1);
      expect(routines[0].module).toBe('FIN');
    });

    it('coloca favoritos primeiro', () => {
      fs.writeFileSync(path.join(appDir, 'AAA.EXE'), 'x');
      fs.writeFileSync(path.join(appDir, 'ZZZ.EXE'), 'x');
      configService.saveSettings({ appPath: appDir, favoriteRoutines: ['ZZZ.EXE'] });

      const routines = service.listRoutines();
      expect(routines[0].name).toBe('ZZZ.EXE');
      expect(routines[0].isFavorite).toBe(true);
    });
  });

  describe('launchRoutine', () => {
    it('bloqueia caminho fora da pasta configurada', () => {
      configService.saveSettings({ appPath: appDir });
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-outside-'));
      const outsideExe = path.join(outsideDir, 'evil.exe');
      fs.writeFileSync(outsideExe, 'x');

      const result = service.launchRoutine(outsideExe);
      expect(result).toBe(false);
      expect(spawnMock).not.toHaveBeenCalled();
      fs.rmSync(outsideDir, { recursive: true, force: true });
    });

    it('lança .EXE diretamente quando não há launcher configurado', () => {
      const exePath = path.join(appDir, 'ROTINA1.EXE');
      fs.writeFileSync(exePath, 'x');
      configService.saveSettings({ appPath: appDir });

      const result = service.launchRoutine(exePath);
      expect(result).toBe(true);
      expect(spawnMock).toHaveBeenCalledWith(
        path.normalize(exePath),
        [],
        expect.objectContaining({ detached: true })
      );
    });

    it('usa o launcher configurado para extensões mapeadas', () => {
      const launcherPath = path.join(appDir, 'LAUNCHER.EXE');
      fs.writeFileSync(launcherPath, 'x');
      const pcFile = path.join(appDir, 'ROTINA1.PC');
      fs.writeFileSync(pcFile, 'x');
      configService.saveSettings({
        appPath: appDir,
        routineLauncherMap: { '.PC': launcherPath }
      });

      const result = service.launchRoutine(pcFile);
      expect(result).toBe(true);
      expect(spawnMock).toHaveBeenCalledWith(
        launcherPath,
        [path.normalize(pcFile)],
        expect.objectContaining({ detached: true })
      );
    });

    it('retorna false quando o arquivo não existe', () => {
      configService.saveSettings({ appPath: appDir });
      const result = service.launchRoutine(path.join(appDir, 'nao-existe.exe'));
      expect(result).toBe(false);
    });
  });

  describe('launchMappedProgram', () => {
    it('lança apenas um id previamente salvo em mappedPrograms', () => {
      const exePath = path.join(appDir, 'notepad.exe');
      fs.writeFileSync(exePath, 'x');
      configService.saveSettings({
        mappedPrograms: [{ id: 'mp-1', name: 'Notepad', fullPath: exePath }]
      });

      const result = service.launchMappedProgram('mp-1');
      expect(result).toBe(true);
      expect(spawnMock).toHaveBeenCalledWith(
        path.normalize(exePath),
        [],
        expect.objectContaining({ detached: true })
      );
    });

    it('rejeita id não salvo, mesmo que pareça válido', () => {
      configService.saveSettings({
        mappedPrograms: [{ id: 'mp-1', name: 'Notepad', fullPath: path.join(appDir, 'notepad.exe') }]
      });

      const result = service.launchMappedProgram('mp-attacker-controlled');
      expect(result).toBe(false);
      expect(spawnMock).not.toHaveBeenCalled();
    });
  });
});
