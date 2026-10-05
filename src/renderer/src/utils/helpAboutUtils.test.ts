import { describe, it, expect } from 'vitest';
import type { SystemAppInfo } from '../../../shared/types';
import { helpAboutMemoryUsagePercent, helpAboutBuildDiagnosticReport } from './helpAboutUtils';

const info: SystemAppInfo = {
  appName: 'Dev Manager',
  appVersion: '1.0.0',
  electronVersion: '29',
  nodeVersion: '20',
  chromeVersion: '122',
  v8Version: '12',
  osPlatform: 'win32',
  osRelease: '10.0',
  osArch: 'x64',
  osHostname: 'HOST',
  totalMemoryMb: 1000,
  freeMemoryMb: 250,
  configPath: 'C:\\cfg.json',
  isAdmin: true
};

describe('helpAboutMemoryUsagePercent', () => {
  it('retorna 0 sem dados', () => {
    expect(helpAboutMemoryUsagePercent(null)).toBe(0);
    expect(helpAboutMemoryUsagePercent({ ...info, freeMemoryMb: 0 })).toBe(0);
  });

  it('calcula porcentagem em uso e limita a 0-100', () => {
    expect(helpAboutMemoryUsagePercent(info)).toBe(75);
    expect(helpAboutMemoryUsagePercent({ ...info, freeMemoryMb: 5000 })).toBe(0);
  });
});

describe('helpAboutBuildDiagnosticReport', () => {
  it('monta o relatório com os campos principais', () => {
    const lines = helpAboutBuildDiagnosticReport(info, new Date(2026, 0, 1)).split('\n');
    expect(lines[0]).toBe('=== DIAGNÓSTICO DO SISTEMA - DEV MANAGER ===');
    expect(lines).toContain('Aplicação: Dev Manager v1.0.0');
    expect(lines).toContain('Privilégios UAC: Administrador (Elevado)');
    expect(lines).toContain('Arquivo Config: C:\\cfg.json');
    expect(lines).toHaveLength(13);
  });

  it('indica usuário padrão quando não é admin', () => {
    const report = helpAboutBuildDiagnosticReport({ ...info, isAdmin: false });
    expect(report).toContain('Usuário Padrão (Sem Elevação)');
  });
});
