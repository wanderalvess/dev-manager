import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ConfigService } from './ConfigService';
import { RoutinesService, extractRoutineCode } from './RoutinesService';

const spawnMock = vi.fn((..._args: unknown[]) => ({ unref: vi.fn(), on: vi.fn() }));
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawn: (...args: unknown[]) => spawnMock(...args)
  };
});

function expectProcessSpawned(targetPath: string, args: string[] = []) {
  if (process.platform === 'win32') {
    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringMatching(/cmd(?:\.exe)?$/i),
      expect.arrayContaining(['/c', 'start', path.basename(targetPath)]),
      expect.objectContaining({ detached: true })
    );
  } else {
    expect(spawnMock).toHaveBeenCalledWith(
      targetPath,
      args,
      expect.objectContaining({ detached: true })
    );
  }
}

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

  describe('extractRoutineCode', () => {
    it('extrai corretamente códigos numéricos de executáveis PCSIS', () => {
      expect(extractRoutineCode('PCSIS132.EXE')).toBe('132');
      expect(extractRoutineCode('pcsis1000.exe')).toBe('1000');
      expect(extractRoutineCode('C:\\winthor\\Prod\\PCSIS1203.EXE')).toBe('1203');
    });

    it('extrai códigos puramente numéricos ou com prefixo genérico', () => {
      expect(extractRoutineCode('132.EXE')).toBe('132');
      expect(extractRoutineCode('ROTINA529.exe')).toBe('529');
      expect(extractRoutineCode('ROT_1400.exe')).toBe('1400');
      expect(extractRoutineCode('PC1406.EXE')).toBe('1406');
      expect(extractRoutineCode('PCINF000.EXE')).toBe('000');
    });

    it('retorna null para programas e utilitários sem código numérico padrão', () => {
      expect(extractRoutineCode('notepad.exe')).toBeNull();
      expect(extractRoutineCode('launcher.exe')).toBeNull();
    });
  });

  describe('launchRoutine', () => {
    it('bloqueia caminho fora da pasta configurada', async () => {
      configService.saveSettings({ appPath: appDir });
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-outside-'));
      const outsideExe = path.join(outsideDir, 'evil.exe');
      fs.writeFileSync(outsideExe, 'x');

      const result = await service.launchRoutine(outsideExe);
      expect(result.success).toBe(false);
      expect(result.error).toBe('SECURITY_BLOCKED');
      expect(spawnMock).not.toHaveBeenCalled();
      fs.rmSync(outsideDir, { recursive: true, force: true });
    });

    it('lança .EXE diretamente quando winthorStart está desabilitado', async () => {
      const exePath = path.join(appDir, 'ROTINA1.EXE');
      fs.writeFileSync(exePath, 'x');
      configService.saveSettings({ appPath: appDir, winthorStartEnabled: false });

      const result = await service.launchRoutine(exePath);
      expect(result.success).toBe(true);
      expect(result.fallbackDirect).toBe(true);
      expectProcessSpawned(exePath);
    });

    it('usa o launcher configurado para extensões mapeadas', async () => {
      const launcherPath = path.join(appDir, 'LAUNCHER.EXE');
      fs.writeFileSync(launcherPath, 'x');
      const pcFile = path.join(appDir, 'ROTINA1.PC');
      fs.writeFileSync(pcFile, 'x');
      configService.saveSettings({
        appPath: appDir,
        routineLauncherMap: { '.PC': launcherPath }
      });

      const result = await service.launchRoutine(pcFile);
      expect(result.success).toBe(true);
      expectProcessSpawned(launcherPath, [path.normalize(pcFile)]);
    });

    it('tenta abrir via Winthor Start se winthorStartEnabled for true e for rotina identificada', async () => {
      const exePath = path.join(appDir, 'PCSIS132.EXE');
      fs.writeFileSync(exePath, 'x');
      configService.saveSettings({ appPath: appDir, winthorStartEnabled: true });

      const winthorStartSpy = vi.spyOn(service, 'launchViaWinthorStart').mockResolvedValue({
        success: true,
        message: 'Rotina 132 iniciada com sucesso via WinThor Start.'
      });

      const result = await service.launchRoutine(exePath);
      expect(result.success).toBe(true);
      expect(winthorStartSpy).toHaveBeenCalledWith('132');
      expect(spawnMock).not.toHaveBeenCalled();
    });

    it('NÃO faz fallback silencioso para spawn se Winthor Start falhar por Karaf offline', async () => {
      const exePath = path.join(appDir, 'PCSIS132.EXE');
      fs.writeFileSync(exePath, 'x');
      configService.saveSettings({ appPath: appDir, winthorStartEnabled: true });

      vi.spyOn(service, 'launchViaWinthorStart').mockResolvedValue({
        success: false,
        karafOffline: true,
        error: 'KARAF_OFFLINE',
        message: 'O Apache Karaf (WTA) não está em execução em http://localhost:8889.'
      });

      const result = await service.launchRoutine(exePath);
      expect(result.success).toBe(false);
      expect(result.karafOffline).toBe(true);
      expect(result.message).toContain('Apache Karaf');
      expect(spawnMock).not.toHaveBeenCalled();
    });

    it('NÃO faz fallback silencioso para spawn se Winthor Start der timeout', async () => {
      const exePath = path.join(appDir, 'PCSIS132.EXE');
      fs.writeFileSync(exePath, 'x');
      configService.saveSettings({ appPath: appDir, winthorStartEnabled: true });

      vi.spyOn(service, 'launchViaWinthorStart').mockResolvedValue({
        success: false,
        error: 'WINTHOR_START_TIMEOUT',
        message: 'Tempo limite esgotado ao aguardar resposta do serviço WinThor Start na porta 9195.'
      });

      const result = await service.launchRoutine(exePath);
      expect(result.success).toBe(false);
      expect(result.error).toBe('WINTHOR_START_TIMEOUT');
      expect(spawnMock).not.toHaveBeenCalled();
    });

    it('NÃO faz fallback silencioso para spawn se Winthor Start retornar erro funcional', async () => {
      const exePath = path.join(appDir, 'PCSIS132.EXE');
      fs.writeFileSync(exePath, 'x');
      configService.saveSettings({ appPath: appDir, winthorStartEnabled: true });

      vi.spyOn(service, 'launchViaWinthorStart').mockResolvedValue({
        success: false,
        error: 'WINTHOR_START_ERROR',
        message: 'Usuário sem permissão para acessar a rotina 132.'
      });

      const result = await service.launchRoutine(exePath);
      expect(result.success).toBe(false);
      expect(result.error).toBe('WINTHOR_START_ERROR');
      expect(spawnMock).not.toHaveBeenCalled();
    });

    it('permite abertura direta forçada (forceDirect = true) mesmo se Karaf estiver offline', async () => {
      const exePath = path.join(appDir, 'PCSIS132.EXE');
      fs.writeFileSync(exePath, 'x');
      configService.saveSettings({ appPath: appDir, winthorStartEnabled: true });

      const result = await service.launchRoutine(exePath, true);
      expect(result.success).toBe(true);
      expect(result.fallbackDirect).toBe(true);
      expectProcessSpawned(exePath);
    });

    it('retorna erro quando o arquivo não existe', async () => {
      configService.saveSettings({ appPath: appDir });
      const result = await service.launchRoutine(path.join(appDir, 'nao-existe.exe'));
      expect(result.success).toBe(false);
      expect(result.error).toBe('FILE_NOT_FOUND');
    });
  });

  describe('checkKarafWtaStatus', () => {
    it('retorna online = false quando o fetch falha por conexão recusada', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8889'));

      try {
        const status = await service.checkKarafWtaStatus();
        expect(status.online).toBe(false);
        expect(status.message).toContain('não está em execução');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('retorna online = true quando o endpoint responde com status HTTP', async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true
      } as Response);

      try {
        const status = await service.checkKarafWtaStatus();
        expect(status.online).toBe(true);
        expect(status.message).toContain('online');
      } finally {
        global.fetch = originalFetch;
      }
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
      expectProcessSpawned(exePath);
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
