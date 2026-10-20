import { describe, expect, it } from 'vitest';
import {
  buildBatchScript,
  delphiVersionLabel,
  parseDelphiBuildOutput,
  parseDelphiDiagnosticLine,
  pickBuiltExe,
  tailLines,
  validateBuildRequest
} from './delphiBuildUtils';

const validRequest = {
  dprojPath: 'C:\\Fontes\\Rotina\\Rotina.dproj',
  rsvarsPath: 'C:\\Program Files (x86)\\Embarcadero\\Studio\\23.0\\bin\\rsvars.bat',
  config: 'Debug',
  platform: 'Win32'
};

describe('parseDelphiDiagnosticLine', () => {
  it('lê o formato do dcc com caminho completo', () => {
    expect(parseDelphiDiagnosticLine("C:\\Fontes\\Unit1.pas(123): E2003 Undeclared identifier: 'Foo'")).toEqual({
      severity: 'error',
      file: 'C:\\Fontes\\Unit1.pas',
      line: 123,
      code: 'E2003',
      message: "Undeclared identifier: 'Foo'"
    });
  });

  it('lê o formato do MSBuild e descarta o projeto no fim', () => {
    const d = parseDelphiDiagnosticLine(
      "C:\\Fontes\\Unit1.pas(10,5): error E2010: Incompatible types [C:\\Fontes\\Rotina.dproj]"
    );
    expect(d).toMatchObject({ severity: 'error', line: 10, code: 'E2010', message: 'Incompatible types' });
  });

  it('lê o prefixo [dcc32 Warning] e classifica pela letra do código', () => {
    const d = parseDelphiDiagnosticLine("[dcc32 Warning] Unit2.pas(7): W1000 Symbol 'X' is deprecated");
    expect(d).toMatchObject({ severity: 'warning', file: 'Unit2.pas', code: 'W1000' });
  });

  it('trata erro fatal (F) como erro e dica (H) como hint', () => {
    expect(parseDelphiDiagnosticLine("Rotina.dpr(5): F2613 Unit 'Foo' not found.")?.severity).toBe('error');
    expect(parseDelphiDiagnosticLine('Unit3.pas(9): H2443 Inline function not expanded')?.severity).toBe('hint');
  });

  it('ignora linhas que não são diagnóstico', () => {
    expect(parseDelphiDiagnosticLine('Embarcadero Delphi for Win32 compiler version 36.0')).toBeNull();
    expect(parseDelphiDiagnosticLine('Build succeeded.')).toBeNull();
  });
});

describe('parseDelphiBuildOutput', () => {
  it('remove repetidos e põe os erros antes dos avisos', () => {
    const output = [
      'Unit1.pas(3): W1000 Aviso A',
      'Unit1.pas(8): E2003 Erro B',
      'Resumo:',
      'Unit1.pas(8): E2003 Erro B'
    ].join('\r\n');
    const result = parseDelphiBuildOutput(output);
    expect(result.map((d) => d.code)).toEqual(['E2003', 'W1000']);
  });
});

describe('validateBuildRequest', () => {
  it('aceita um pedido válido', () => {
    expect(validateBuildRequest(validRequest)).toBeNull();
  });

  it('recusa caminho que escaparia das aspas do script', () => {
    expect(validateBuildRequest({ ...validRequest, dprojPath: 'C:\\x"&calc&"\\a.dproj' })).not.toBeNull();
    expect(validateBuildRequest({ ...validRequest, dprojPath: 'C:\\%TEMP%\\a.dproj' })).not.toBeNull();
  });

  it('recusa caminhos de rede (UNC) para o rsvars.bat e o .dproj', () => {
    expect(validateBuildRequest({ ...validRequest, rsvarsPath: '\\\\servidor\\share\\rsvars.bat' })).not.toBeNull();
    expect(validateBuildRequest({ ...validRequest, dprojPath: '\\\\servidor\\share\\a.dproj' })).not.toBeNull();
  });

  it('recusa arquivo que não é .dproj nem rsvars.bat', () => {
    expect(validateBuildRequest({ ...validRequest, dprojPath: 'C:\\x\\a.bat' })).not.toBeNull();
    expect(validateBuildRequest({ ...validRequest, rsvarsPath: 'C:\\x\\malware.bat' })).not.toBeNull();
  });

  it('recusa configuração e plataforma com metacaracteres', () => {
    expect(validateBuildRequest({ ...validRequest, config: 'Debug & calc' })).not.toBeNull();
    expect(validateBuildRequest({ ...validRequest, platform: 'Win32;x' })).not.toBeNull();
  });
});

describe('buildBatchScript', () => {
  it('chama o rsvars antes do msbuild e propaga o exit code', () => {
    const lines = buildBatchScript(validRequest).split('\r\n');
    const rsvars = lines.findIndex((l) => l.startsWith('call '));
    const msbuild = lines.findIndex((l) => l.startsWith('msbuild '));
    expect(rsvars).toBeGreaterThanOrEqual(0);
    expect(msbuild).toBeGreaterThan(rsvars);
    expect(lines[msbuild]).toContain('/p:Config=Debug /p:Platform=Win32');
    expect(lines).toContain('exit /b %ERRORLEVEL%');
    expect(lines).toContain('chcp 1252 >nul');
  });
});

describe('tailLines', () => {
  it('devolve só as últimas linhas não vazias', () => {
    expect(tailLines('a\r\n\r\nb\nc\n', 2)).toBe('b\nc');
  });
});

describe('pickBuiltExe', () => {
  it('escolhe o .exe do projeto mais novo que o início do build', () => {
    const candidates = [
      { path: 'C:\\p\\Win32\\Debug\\Rotina.exe', mtimeMs: 5000 },
      { path: 'C:\\p\\Win64\\Release\\rotina.exe', mtimeMs: 9000 },
      { path: 'C:\\p\\Outro.exe', mtimeMs: 9500 },
      { path: 'C:\\p\\Antigo\\Rotina.exe', mtimeMs: 100 }
    ];
    expect(pickBuiltExe(candidates, 'Rotina', 4000)).toBe('C:\\p\\Win64\\Release\\rotina.exe');
  });

  it('retorna undefined quando nada foi gerado', () => {
    expect(pickBuiltExe([{ path: 'C:\\p\\Rotina.exe', mtimeMs: 1 }], 'Rotina', 1000)).toBeUndefined();
  });
});

describe('delphiVersionLabel', () => {
  it('traduz a pasta do Studio para o nome comercial', () => {
    expect(delphiVersionLabel('23.0')).toBe('Delphi 12 Athens');
    expect(delphiVersionLabel('19.0')).toBe('Delphi 10.2 Tokyo');
    expect(delphiVersionLabel('99.0')).toBe('RAD Studio 99.0');
  });
});
