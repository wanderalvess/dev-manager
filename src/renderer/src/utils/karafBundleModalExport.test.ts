import { describe, expect, it } from 'vitest';
import { buildKarafBundleExportFilename, buildKarafBundleExportPayload } from './karafBundleModalExport';
import type { KarafBundleInfo } from '../../../shared/types';

const bundle = {
  id: '12',
  state: 'Active',
  name: 'My "bundle"',
  symbolicName: 'my.bundle',
  version: '1.0.0',
  level: '80',
  blueprint: 'Created'
} as KarafBundleInfo;

describe('karafBundleModalExport', () => {
  it('monta o nome do arquivo com escopo em minusculas e data', () => {
    expect(buildKarafBundleExportFilename('TOTVS', 'csv', new Date('2026-01-02T10:00:00Z'))).toBe(
      'karaf-bundles-totvs-2026-01-02.csv'
    );
  });

  it('gera JSON indentado', () => {
    const res = buildKarafBundleExportPayload([bundle], 'json');
    expect(res.mime).toBe('application/json');
    expect(JSON.parse(res.content)).toEqual([bundle]);
  });

  it('gera CSV com aspas escapadas e CRLF', () => {
    const res = buildKarafBundleExportPayload([bundle], 'csv');
    const lines = res.content.split('\r\n');
    expect(lines[0]).toBe('ID,Estado,Nome,SymbolicName,Versao,Nivel,Blueprint');
    expect(lines[1]).toBe('12,Active,"My ""bundle""","my.bundle","1.0.0",80,Created');
  });
});
