import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { DelphiBuildService } from './DelphiBuildService';

describe.skipIf(process.platform !== 'win32')('build com compilador simulado (cmd.exe)', () => {
  it('executa rsvars+msbuild, transmite o log e estrutura os erros', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-delphi-'));
    const bin = path.join(dir, 'Pasta Com Espaco', 'bin');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, 'rsvars.bat'), '@set PATH=' + bin + ';%PATH%\r\n');
    fs.writeFileSync(path.join(bin, 'msbuild.cmd'), '@echo Unit1.pas(8): E2003 Undeclared identifier: Foo\r\n@echo Unit1.pas(3): W1000 aviso\r\n@exit /b 1\r\n');
    const proj = path.join(dir, 'Rotina.dproj');
    fs.writeFileSync(proj, '<Project/>');
    const service = new DelphiBuildService({ getSettings: () => ({ projectsPath: dir }) } as never, { killProcess: async () => true } as never);
    const chunks: string[] = [];
    const result = await service.build({ dprojPath: proj, rsvarsPath: path.join(bin, 'rsvars.bat'), config: 'Debug', platform: 'Win32' }, (c) => chunks.push(c));
    expect(chunks.join('')).toContain('E2003');
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(1);
    expect((await service.findProjects()).map((p) => p.name)).toEqual(['Rotina']);
    // root fora da pasta de projetos é ignorado: cai na pasta configurada, sem listar o resto do disco
    expect((await service.findProjects(os.tmpdir())).map((p) => p.name)).toEqual(['Rotina']);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
