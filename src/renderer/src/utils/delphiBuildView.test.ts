import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DELPHI_FORM,
  appendDelphiLog,
  diagnosticClipboardText,
  diagnosticLocation,
  formatDelphiDuration,
  loadDelphiForm
} from './delphiBuildView';

const diagnostic = {
  severity: 'error' as const,
  file: 'C:\\Fontes\\Unit1.pas',
  line: 42,
  code: 'E2003',
  message: "Undeclared identifier: 'Foo'"
};

describe('appendDelphiLog', () => {
  it('concatena enquanto cabe e corta o começo ao passar do teto', () => {
    expect(appendDelphiLog('a', 'b')).toBe('ab');
    const big = appendDelphiLog('x'.repeat(199_999), 'yyyy');
    expect(big).toHaveLength(200_000);
    expect(big.endsWith('yyyy')).toBe(true);
  });
});

describe('formatDelphiDuration', () => {
  it('escolhe a unidade pela ordem de grandeza', () => {
    expect(formatDelphiDuration(850)).toBe('850 ms');
    expect(formatDelphiDuration(12_340)).toBe('12.3 s');
    expect(formatDelphiDuration(125_000)).toBe('2 min 5 s');
  });
});

describe('diagnostics', () => {
  it('mostra só o nome do arquivo e a linha', () => {
    expect(diagnosticLocation(diagnostic)).toBe('Unit1.pas:42');
  });

  it('monta o texto copiável com o caminho completo', () => {
    expect(diagnosticClipboardText(diagnostic)).toBe("C:\\Fontes\\Unit1.pas(42): E2003 Undeclared identifier: 'Foo'");
  });
});

describe('loadDelphiForm', () => {
  it('usa o padrão sem estado salvo ou com JSON quebrado', () => {
    expect(loadDelphiForm(null)).toEqual(DEFAULT_DELPHI_FORM);
    expect(loadDelphiForm('{quebrado')).toEqual(DEFAULT_DELPHI_FORM);
  });

  it('aproveita os campos válidos e corrige os inválidos', () => {
    const form = loadDelphiForm(JSON.stringify({ dprojPath: 'C:\\a.dproj', config: 42, killRunning: false, launch: true }));
    expect(form).toMatchObject({ dprojPath: 'C:\\a.dproj', config: 'Debug', killRunning: false, launch: true });
  });
});
